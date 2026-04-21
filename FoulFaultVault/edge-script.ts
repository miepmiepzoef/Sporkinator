import * as BunnySDK from "@bunny.net/edgescript-sdk";

BunnySDK.net.http.serve(async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  const path = url.pathname;

  // CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // Fetch any URL (for article content)
  if (path === "fetch" && request.method === "GET") {
    const targetUrl = url.searchParams.get("url");
    if (!targetUrl) {
      return new Response(JSON.stringify({ error: "Missing url" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
    try {
      const response = await fetch(targetUrl);
      const text = await response.text();
      return new Response(text, {
        status: 200,
        headers: { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" },
      });
    } catch {
      return new Response(JSON.stringify({ error: "Failed to fetch URL" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  }

  // Gemini proxy (replaces OpenAI)
  if (path === "gemini" && request.method === "POST") {
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const body = await request.json();
    // Extract the user message from Gemini‑style request
    const userMessage = body.messages?.find(m => m.role === "user")?.content || "";
    const systemPrompt = body.messages?.find(m => m.role === "system")?.content || "";

    // Gemini expects a specific format
    const geminiPayload = {
      contents: [
        {
          parts: [{ text: systemPrompt ? `${systemPrompt}\n\n${userMessage}` : userMessage }]
        }
      ]
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiPayload),
    });

    const geminiData = await response.json();

    // Transform Gemini response to OpenAI format
    let geminiStyleResponse = {
      choices: [
        {
          message: {
            content: geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini"
          }
        }
      ]
    };

    return new Response(JSON.stringify(geminiStyleResponse), {
      status: response.status,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
});
