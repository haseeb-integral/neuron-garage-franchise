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
  "phone",
  "notes",
  "outreach_status_source",
  "record_added_at",
] as const;

const SELECT_COLUMNS = `id, dedupe_key, manus_dedupe_key, ${ENRICHABLE_COLUMNS.join(", ")}`;


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

    // Keys prefixed with "manus:" match the exporter's own dedupe_key, which we
    // store in manus_dedupe_key (teacher_prospects.dedupe_key is generated).
    const manusKeys = dedupeKeys.filter((k) => k.startsWith("manus:")).map((k) => k.slice(6));
    const plainKeys = dedupeKeys.filter((k) => !k.startsWith("manus:"));

    if (!withMatches) {
      let count = 0;
      if (plainKeys.length) {
        const lit = `{${plainKeys.map(escapePgArrayValue).join(",")}}`;
        const r = await sql`
          select count(*)::int as c from public.teacher_prospects
          where dedupe_key = any(${lit}::text[])
        `;
        count += r[0]?.c ?? 0;
      }
      if (manusKeys.length) {
        const lit = `{${manusKeys.map(escapePgArrayValue).join(",")}}`;
        const r = await sql`
          select count(*)::int as c from public.teacher_prospects
          where manus_dedupe_key = any(${lit}::text[])
        `;
        count += r[0]?.c ?? 0;
      }
      return json({ existing_count: count, matches: [] });
    }

    // Chunk so a very large CSV doesn't build one giant array literal.
    const CHUNK = 5000;
    const matches: Array<{ dedupe_key: string; id: string; empty_fields: string[] }> = [];

    const collect = (rows: readonly Record<string, unknown>[], useManus: boolean) => {
      for (const row of rows) {
        const empty: string[] = [];
        for (const col of ENRICHABLE_COLUMNS) {
          const v = row[col];
          if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) empty.push(col);
        }
        const key = useManus ? `manus:${String(row.manus_dedupe_key)}` : String(row.dedupe_key);
        matches.push({ dedupe_key: key, id: String(row.id), empty_fields: empty });
      }
    };

    for (let i = 0; i < plainKeys.length; i += CHUNK) {
      const lit = `{${plainKeys.slice(i, i + CHUNK).map(escapePgArrayValue).join(",")}}`;
      const rows = await sql`
        select ${sql.unsafe(SELECT_COLUMNS)}
        from public.teacher_prospects
        where dedupe_key = any(${lit}::text[])
      `;
      collect(rows as unknown as Record<string, unknown>[], false);
    }
    for (let i = 0; i < manusKeys.length; i += CHUNK) {
      const lit = `{${manusKeys.slice(i, i + CHUNK).map(escapePgArrayValue).join(",")}}`;
      const rows = await sql`
        select ${sql.unsafe(SELECT_COLUMNS)}
        from public.teacher_prospects
        where manus_dedupe_key = any(${lit}::text[])
      `;
      collect(rows as unknown as Record<string, unknown>[], true);
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
