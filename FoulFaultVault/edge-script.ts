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

  // /fetch endpoint (unchanged, works)
  if (path === "/fetch" && request.method === "GET") {
    const targetUrl = url.searchParams.get("url");
    if (!targetUrl) {
      return new Response(JSON.stringify({ error: "Missing url" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    try {
      const response = await fetch(targetUrl);
      const text = await response.text();
      return new Response(text, {
        status: 200,
        headers: { "Content-Type": "text/plain", ...corsHeaders },
      });
    } catch {
      return new Response(JSON.stringify({ error: "Fetch failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  }

  // /gemini endpoint – using gemini-2.0-flash 
  if (path === "/gemini" && request.method === "POST") {
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY" }), {
        status: 500,
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

    // Use v1beta and gemini-2.5-flash (as per your available models)
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload),
      }
    );

    const geminiData = await geminiRes.json();

    if (geminiData.error) {
      return new Response(JSON.stringify({ error: geminiData.error }), {
        status: geminiRes.status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      return new Response(JSON.stringify({ error: "No content from Gemini" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const openAiStyleResponse = {
      choices: [{ message: { content } }],
    };

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

