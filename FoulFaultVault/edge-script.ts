import * as BunnySDK from "@bunny.net/edgescript-sdk";

// Handle incoming HTTP requests
BunnySDK.net.http.serve(async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  const path = url.pathname;

  // Handle CORS preflight (so your frontend can call this script)
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

  // ----- Proxy to OpenAI -----
  if (path === "/openai" && request.method === "POST") {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response("Missing OPENAI_API_KEY", { status: 500 });
    }
    const body = await request.json();
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // ----- Proxy to NewsAPI -----
  if (path === "/newsapi" && request.method === "GET") {
    const newsKey = Deno.env.get("NEWSAPI_KEY");
    if (!newsKey) {
      return new Response("Missing NEWSAPI_KEY", { status: 500 });
    }
    const query = url.searchParams.get("q") || "";
    const apiUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=relevancy&pageSize=25&apiKey=${newsKey}`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // ----- Proxy to Google Custom Search -----
  if (path === "/google" && request.method === "GET") {
    const googleKey = Deno.env.get("GOOGLE_API_KEY");
    const cx = Deno.env.get("GOOGLE_CX");
    if (!googleKey || !cx) {
      return new Response("Missing GOOGLE_API_KEY or GOOGLE_CX", { status: 500 });
    }
    const query = url.searchParams.get("q") || "";
    const apiUrl = `https://www.googleapis.com/customsearch/v1?key=${googleKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=10`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
    });
  }

  // No matching route
  return new Response("Not found", { status: 404 });
});
