import { createClient } from "npm:@supabase/supabase-js@2";
import postgres from "npm:postgres";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Columns the Master Pool import wizard can write. Returned as "empty_fields"
// so the client knows which ones can be filled without overwriting data.
const ENRICHABLE_COLUMNS = [
  "name",
  "first_name",
  "last_name",
  "email",
  "school",
  "district",
  "city",
  "state",
  "grade",
  "subject",
  "teacher_type",
  "experience_years",
  "linkedin_url",
] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let sql: ReturnType<typeof postgres> | null = null;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: claims, error: authErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (authErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const dedupeKeys = Array.isArray(body.dedupe_keys)
      ? Array.from(new Set(body.dedupe_keys.map(String).filter(Boolean)))
      : [];
    // When true, return the matching row ids + which fields are still empty so
    // the caller can enrich existing records instead of skipping them.
    const withMatches = body.with_matches === true;

    if (dedupeKeys.length === 0) {
      return json({ existing_count: 0, matches: [] });
    }

    sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false });

    if (!withMatches) {
      const arrayLiteral = `{${dedupeKeys.map(escapePgArrayValue).join(",")}}`;
      const result = await sql`
        select count(*)::int as existing_count
        from public.teacher_prospects
        where dedupe_key = any(${arrayLiteral}::text[])
      `;
      return json({ existing_count: result[0]?.existing_count ?? 0, matches: [] });
    }

    // Chunk so a very large CSV doesn't build one giant array literal.
    const CHUNK = 5000;
    const matches: Array<{ dedupe_key: string; id: string; empty_fields: string[] }> = [];
    for (let i = 0; i < dedupeKeys.length; i += CHUNK) {
      const slice = dedupeKeys.slice(i, i + CHUNK);
      const arrayLiteral = `{${slice.map(escapePgArrayValue).join(",")}}`;
      const rows = await sql`
        select id, dedupe_key, name, first_name, last_name, email, school, district,
               city, state, grade, subject, teacher_type, experience_years, linkedin_url
        from public.teacher_prospects
        where dedupe_key = any(${arrayLiteral}::text[])
      `;
      for (const row of rows) {
        const empty: string[] = [];
        for (const col of ENRICHABLE_COLUMNS) {
          const v = (row as Record<string, unknown>)[col];
          if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) empty.push(col);
        }
        matches.push({ dedupe_key: String(row.dedupe_key), id: String(row.id), empty_fields: empty });
      }
    }

    return json({ existing_count: matches.length, matches });
  } catch (e) {
    return json({ error: (e as Error).message ?? String(e) }, 500);
  } finally {
    await sql?.end({ timeout: 1 }).catch(() => undefined);
  }
});

function escapePgArrayValue(value: string) {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
