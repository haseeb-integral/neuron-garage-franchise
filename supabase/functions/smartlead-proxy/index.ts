import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SMARTLEAD_BASE = "https://server.smartlead.ai/api/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Require an authenticated app user — proxy is not public.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: claims, error: authErr } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const API_KEY = Deno.env.get("SMARTLEAD_API_KEY");
    if (!API_KEY) {
      return new Response(JSON.stringify({ error: "SMARTLEAD_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const endpoint: string = (body.endpoint ?? "").toString().replace(/^\/+/, "");
    const method: string = (body.method ?? "GET").toString().toUpperCase();
    const payload = body.payload;
    const extraQuery: Record<string, string> = body.query ?? {};

    if (!endpoint) {
      return new Response(JSON.stringify({ error: "endpoint is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sep = endpoint.includes("?") ? "&" : "?";
    const extra = Object.entries(extraQuery)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&");
    const url = `${SMARTLEAD_BASE}/${endpoint}${sep}api_key=${API_KEY}${extra ? `&${extra}` : ""}`;

    let lastStatus = 0;
    let lastText = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: payload && method !== "GET" ? JSON.stringify(payload) : undefined,
      });
      lastStatus = res.status;
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
        continue;
      }
      const text = await res.text();
      lastText = text;
      const ct = res.headers.get("content-type") ?? "";
      const isJson = ct.includes("application/json");
      return new Response(
        isJson ? text : JSON.stringify({ status: res.status, body: text }),
        {
          status: res.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ error: "Rate limit exceeded after retries", lastStatus, lastText }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("smartlead-proxy error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
