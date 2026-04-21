import * as BunnySDK from "@bunny.net/edgescript-sdk";

BunnySDK.net.http.serve(async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  const path = url.pathname;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // /fetch endpoint – now extracts plain text from Wikipedia using their API
  if (path === "/fetch" && request.method === "GET") {
    const targetUrl = url.searchParams.get("url");
    if (!targetUrl) {
      return new Response(JSON.stringify({ error: "Missing url" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    try {
      // Extract Wikipedia page title from URL
      const wikiMatch = targetUrl.match(/\/wiki\/([^?#]+)/);
      if (wikiMatch) {
        const pageTitle = decodeURIComponent(wikiMatch[1]);
        const apiUrl = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=text&format=json&origin=*`;
        const apiRes = await fetch(apiUrl);
        const data = await apiRes.json();
        let html = data.parse?.text?.["*"] || "";
        // Simple HTML stripping
        let text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        // Limit to 5000 characters
        if (text.length > 5000) text = text.slice(0, 5000) + "…";
        return new Response(text, {
          status: 200,
          headers: { "Content-Type": "text/plain", ...corsHeaders },
        });
      } else {
        // Not a Wikipedia page – fallback to raw fetch
        const response = await fetch(targetUrl);
        let text = await response.text();
        if (text.length > 5000) text = text.slice(0, 5000) + "…";
        return new Response(text, {
          status: 200,
          headers: { "Content-Type": "text/plain", ...corsHeaders },
        });
      }
    } catch (err) {
      return new Response(JSON.stringify({ error: "Fetch failed", details: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  }

  // /gemini endpoint – using gemini-2.5-flash (as you confirmed works)
  if (path === "/gemini" && request.method === "POST") {
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      // Return mock instead of error for testing
      const mockContent = JSON.stringify({
        shout: "Mock: Official statement pending (API key missing)",
        whisper: "Mock: No criticism available",
        thirdLayer: "Mock: No hidden operation (key missing)",
        sacrificial: "Mock: No sacrificial layer",
        lenses: "Mock: None",
        confidence: "Low"
      });
      return new Response(JSON.stringify({ choices: [{ message: { content: mockContent } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userMessage = body.messages?.find((m: any) => m.role === "user")?.content || "";
    const systemPrompt = body.messages?.find((m: any) => m.role === "system")?.content || "";

    const geminiPayload = {
      contents: [{ parts: [{ text: systemPrompt ? `${systemPrompt}\n\n${userMessage}` : userMessage }] }],
    };

    // Use v1beta and gemini-2.5-flash (as per your working model)
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload),
      }
    );

    const geminiData = await geminiRes.json();

    if (geminiData.error || !geminiRes.ok) {
      // Return mock fallback instead of error
      const mockContent = JSON.stringify({
        shout: "Mock: API error – " + (geminiData.error?.message || "Unknown"),
        whisper: "Mock: Please check billing or model name",
        thirdLayer: "Mock: No data",
        sacrificial: "Mock: None",
        lenses: "Mock: None",
        confidence: "Low"
      });
      return new Response(JSON.stringify({ choices: [{ message: { content: mockContent } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      const mockContent = JSON.stringify({
        shout: "Mock: No content from Gemini",
        whisper: "",
        thirdLayer: "",
        sacrificial: "",
        lenses: "",
        confidence: "Low"
      });
      return new Response(JSON.stringify({ choices: [{ message: { content: mockContent } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Return as OpenAI-style response
    const openAiStyleResponse = { choices: [{ message: { content } }] };
    return new Response(JSON.stringify(openAiStyleResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});
