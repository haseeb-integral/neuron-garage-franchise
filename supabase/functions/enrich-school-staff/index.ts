// Edge function: enrich-school-staff
// Crawls a school website's /staff /faculty /about pages via Firecrawl,
// extracts (name, email) pairs, and upserts into teacher_prospects.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FC_BASE = "https://api.firecrawl.dev/v2";
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.(?:edu|org|us|net|com)/gi;
const NAME_RE = /([A-Z][a-z]+(?:\s+[A-Z][a-z'-]+){1,2})/g;
const GRADE_RE = /(Kindergarten|Pre-?K|1st Grade|2nd Grade|3rd Grade|4th Grade|5th Grade|6th Grade|Grade \d|Teacher|Principal|Counselor|Coach|Librarian)/i;

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function nameFromEmail(email: string): string | null {
  const local = email.split("@")[0];
  const parts = local.split(/[._-]/).filter((p) => /^[a-z]+$/i.test(p) && p.length > 1);
  if (parts.length < 2) return null;
  return parts.slice(0, 2).map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase()).join(" ");
}

function extractPairs(text: string): Array<{ name: string | null; email: string; grade: string | null; snippet: string }> {
  const out: Array<{ name: string | null; email: string; grade: string | null; snippet: string }> = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  EMAIL_RE.lastIndex = 0;
  while ((m = EMAIL_RE.exec(text)) !== null) {
    const email = m[0].toLowerCase();
    if (seen.has(email)) continue;
    // skip generic info/admin/no-reply addresses
    if (/^(info|contact|admin|webmaster|noreply|no-reply|help|support|hello|office)@/.test(email)) continue;
    seen.add(email);

    const start = Math.max(0, m.index - 120);
    const before = text.slice(start, m.index);
    const after = text.slice(m.index + email.length, m.index + email.length + 80);

    let name: string | null = null;
    const nameMatches = [...before.matchAll(NAME_RE)];
    if (nameMatches.length) name = nameMatches[nameMatches.length - 1][1];
    if (!name) name = nameFromEmail(email);

    const gMatch = (before + " " + after).match(GRADE_RE);
    const grade = gMatch ? gMatch[1] : null;

    out.push({ name, email, grade, snippet: (before + " [EMAIL] " + after).trim().slice(0, 240) });
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const FC_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!FC_KEY) return ok({ error: "Missing FIRECRAWL_API_KEY secret" });
    if (!SUPABASE_URL || !SERVICE_KEY) return ok({ error: "Missing Supabase server env" });

    let body: any;
    try { body = await req.json(); } catch { return ok({ error: "Invalid JSON body" }); }

    const school_website = typeof body?.school_website === "string" ? body.school_website.trim() : "";
    const school_name = typeof body?.school_name === "string" ? body.school_name.trim() : "";
    const district = typeof body?.district === "string" ? body.district.trim() : null;
    const city = typeof body?.city === "string" ? body.city.trim() : "";
    const state = typeof body?.state === "string" ? body.state.trim().toUpperCase() : "";
    const apify_run_id = typeof body?.apify_run_id === "string" ? body.apify_run_id : null;

    if (!school_website || !school_name || !city || !state) {
      return ok({ error: "school_website, school_name, city, state are required" });
    }

    // Normalize URL
    let url = school_website;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;

    console.log(`[enrich-school-staff] crawling ${url} (${school_name})`);

    // 1. Start crawl
    const startRes = await fetch(`${FC_BASE}/crawl`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FC_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        limit: 10,
        maxDepth: 2,
        includePaths: ["/staff.*", "/about.*", "/our-team.*", "/faculty.*", "/directory.*", "/teachers.*"],
        scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
      }),
    });
    if (!startRes.ok) {
      const txt = await startRes.text();
      return ok({ error: `Firecrawl start failed (${startRes.status}): ${txt.slice(0, 300)}` });
    }
    const startJson = await startRes.json();
    const jobId: string = startJson?.id ?? startJson?.data?.id;
    if (!jobId) return ok({ error: "Firecrawl did not return job id", raw: startJson });

    // 2. Poll
    const deadline = Date.now() + 90_000;
    let status = "scraping";
    let pages: any[] = [];
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 4000));
      const sRes = await fetch(`${FC_BASE}/crawl/${jobId}`, {
        headers: { Authorization: `Bearer ${FC_KEY}` },
      });
      if (!sRes.ok) continue;
      const sJson = await sRes.json();
      status = sJson?.status ?? status;
      pages = sJson?.data ?? pages;
      console.log(`[enrich-school-staff] ${school_name} status=${status} pages=${pages?.length ?? 0}`);
      if (["completed", "failed", "cancelled"].includes(status)) break;
    }

    if (!pages || pages.length === 0) {
      return ok({ inserted: 0, updated: 0, pages_crawled: 0, emails_found: 0, status, note: "No staff pages crawled" });
    }

    // 3. Extract
    const allPairs: Array<{ name: string | null; email: string; grade: string | null; snippet: string; source_url: string }> = [];
    const seen = new Set<string>();
    for (const p of pages) {
      const md: string = p?.markdown ?? p?.content ?? "";
      const sourceUrl: string = p?.metadata?.sourceURL ?? p?.metadata?.url ?? url;
      if (!md) continue;
      for (const pair of extractPairs(md)) {
        if (seen.has(pair.email)) continue;
        seen.add(pair.email);
        allPairs.push({ ...pair, source_url: sourceUrl });
      }
    }

    console.log(`[enrich-school-staff] ${school_name} extracted ${allPairs.length} (name,email) pairs`);

    if (allPairs.length === 0) {
      return ok({ inserted: 0, updated: 0, pages_crawled: pages.length, emails_found: 0, status });
    }

    // 4. Upsert by lower(email)
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    let inserted = 0;
    let updated = 0;
    for (const pair of allPairs) {
      const row = {
        name: pair.name ?? "(Unknown)",
        school: school_name,
        district,
        email: pair.email,
        grade: pair.grade,
        experience_years: null,
        city,
        state,
        fit_score: null as number | null,
        status: "new",
        apify_run_id,
        raw: { source_channel: "Firecrawl /staff", source_url: pair.source_url, snippet: pair.snippet },
      };

      // Find existing by lower(email)
      const { data: existing } = await supabase
        .from("teacher_prospects")
        .select("id")
        .ilike("email", pair.email)
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await supabase
          .from("teacher_prospects")
          .update({ ...row, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) console.error("[enrich-school-staff] update err", error.message);
        else updated++;
      } else {
        const { error } = await supabase.from("teacher_prospects").insert(row);
        if (error) console.error("[enrich-school-staff] insert err", error.message);
        else inserted++;
      }
    }

    return ok({
      inserted,
      updated,
      pages_crawled: pages.length,
      emails_found: allPairs.length,
      status,
    });
  } catch (err) {
    console.error("[enrich-school-staff] fatal", err);
    return ok({ error: (err as Error).message ?? "Unknown error" });
  }
});
