import * as BunnySDK from "@bunny.net/edgescript-sdk";

BunnySDK.net.http.serve(async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  const path = url.pathname;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Fetch endpoint (returns Wikipedia HTML)
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

  // Gemini mock endpoint (no real API call, returns fixed analysis)
  if (path === "/gemini" && request.method === "POST") {
    // Mock response that matches your frontend's expected format
    const mockAnalysis = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              shout: "Official statement: 'We deny any wrongdoing.'",
              whisper: "Some critics question the timeline.",
              thirdLayer: "Internal emails suggest prior knowledge.",
              sacrificial: "A junior staff member was suspended.",
              lenses: "Limited Hangout, Teflon Shield",
              confidence: "Medium"
            })
          }
        }
      ]
    };
    return new Response(JSON.stringify(mockAnalysis), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // Not found
  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});

