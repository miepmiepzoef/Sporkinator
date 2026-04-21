import * as BunnySDK from "@bunny.net/edgescript-sdk";

BunnySDK.net.http.serve(async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  const path = url.pathname;

  // CORS headers for all responses
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // ---------- FETCH endpoint ----------
  if (path === "/fetch" && request.method === "GET") {
    const targetUrl = url.searchParams.get("url");
    if (!targetUrl) {
      return new Response(JSON.stringify({ error: "Missing 'url' parameter" }), {
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
    } catch (err) {
      return new Response(JSON.stringify({ error: "Failed to fetch URL" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  }

  // ---------- GEMINI endpoint ----------
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
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userMessage = body.messages?.find((m: any) => m.role === "user")?.content || "";
    const systemPrompt = body.messages?.find((m: any) => m.role === "system")?.content || "";

    const geminiPayload = {
      contents: [{ parts: [{ text: systemPrompt ? `${systemPrompt}\n\n${userMessage}` : userMessage }] }]
    };

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload),
      }
    );

    const geminiData = await geminiRes.json();

    // Transform to OpenAI-like format
    const openAiStyleResponse = {
      choices: [{
        message: {
          content: geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini"
        }
      }]
    };

    return new Response(JSON.stringify(openAiStyleResponse), {
      status: geminiRes.status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // ---------- Not found ----------
  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});

