// Backfill `mvs_providers.website_url` (the provider's own homepage) for
// any row missing it. Uses Firecrawl `search` to find a likely homepage and
// rejects known marketplace / directory / social hosts so we always land on
// the provider's actual site.
//
// Body: { city: string, limit?: number }   // limit defaults to 50
// Auth: caller must be authenticated and have manager or admin role.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";
const FIRECRAWL_TIMEOUT_MS = 25_000;
const REQUEST_DELAY_MS = 600;

const BLOCKED_HOSTS = [
  "hisawyer.com",
  "activityhero.com",
  "yelp.com",
  "google.com",
  "google.co",
  "g.co",
  "goo.gl",
  "facebook.com",
  "fb.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "linkedin.com",
  "pinterest.com",
  "youtube.com",
  "youtu.be",
  "mapquest.com",
  "yellowpages.com",
  "tripadvisor.com",
  "bing.com",
  "duckduckgo.com",
  "wikipedia.org",
  "amazon.com",
  "groupon.com",
  "eventbrite.com",
  "meetup.com",
  "macaronikid.com",
  "mommypoppins.com",
  "timeout.com",
];

function isBlockedHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return BLOCKED_HOSTS.some((b) => host === b || host.endsWith("." + b));
  } catch {
    return true;
  }
}

async function fetchWithTimeout(input: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

async function findHomepage(name: string, city: string, firecrawlKey: string): Promise<{ url: string | null; debug: Record<string, unknown> }> {
  const debug: Record<string, unknown> = {};
  const query = `${name} ${city} kids classes`;
  try {
    const res = await fetchWithTimeout(`${FIRECRAWL_V2}/search`, {
      method: "POST",
      headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: 8 }),
    }, FIRECRAWL_TIMEOUT_MS);
    if (!res.ok) {
      debug.error = `firecrawl ${res.status}`;
      return { url: null, debug };
    }
    const j = await res.json().catch(() => ({}));
    // v2 returns { success, data: { web: [{ url, title, description }, ...] } }
    const web = j?.data?.web ?? j?.data ?? [];
    const results: Array<{ url?: string; title?: string }> = Array.isArray(web) ? web : [];
    debug.results_count = results.length;
    for (const r of results) {
      const u = r?.url;
      if (!u || typeof u !== "string") continue;
      if (isBlockedHost(u)) continue;
      try {
        const parsed = new URL(u);
        // Normalize to scheme + host, drop deep paths to land on homepage.
        const homepage = `${parsed.protocol}//${parsed.hostname}/`;
        debug.picked = homepage;
        debug.picked_from = u;
        return { url: homepage, debug };
      } catch {
        continue;
      }
    }
    debug.error = "no acceptable result";
    return { url: null, debug };
  } catch (e) {
    debug.error = e instanceof Error ? e.message : String(e);
    return { url: null, debug };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!firecrawlKey) {
    return new Response(JSON.stringify({ error: "missing FIRECRAWL_API_KEY" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = userData.user.id;

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: roleRows } = await admin.from("user_roles").select("role").eq("user_id", userId);
  const roles = new Set((roleRows ?? []).map((r) => r.role));
  if (!roles.has("manager") && !roles.has("admin")) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { city?: string; limit?: number } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const city = (body.city ?? "").trim();
  const limit = Math.min(200, Math.max(1, body.limit ?? 50));
  if (!city) {
    return new Response(JSON.stringify({ error: "missing city" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: providers, error: pErr } = await admin
    .from("mvs_providers")
    .select("id, name, city, website_url")
    .eq("city", city)
    .is("website_url", null)
    .limit(limit);
  if (pErr) {
    return new Response(JSON.stringify({ error: pErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: Array<{ id: string; name: string; website_url: string | null; debug: Record<string, unknown> }> = [];
  let updated = 0;
  for (const p of providers ?? []) {
    const { url, debug } = await findHomepage(p.name, p.city, firecrawlKey);
    if (url) {
      const { error: uErr } = await admin
        .from("mvs_providers")
        .update({ website_url: url, updated_at: new Date().toISOString() })
        .eq("id", p.id);
      if (!uErr) updated += 1;
      else debug.update_error = uErr.message;
    }
    results.push({ id: p.id, name: p.name, website_url: url, debug });
    await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
  }

  return new Response(JSON.stringify({
    city,
    considered: providers?.length ?? 0,
    updated,
    results,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
