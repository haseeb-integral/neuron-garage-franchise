import { createClient } from "npm:@supabase/supabase-js@2";
import postgres from "npm:postgres";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

    if (dedupeKeys.length === 0) {
      return json({ existing_count: 0 });
    }

    sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false });
    const arrayLiteral = `{${dedupeKeys.map(escapePgArrayValue).join(",")}}`;
    const result = await sql`
      select count(*)::int as existing_count
      from public.teacher_prospects
      where dedupe_key = any(${arrayLiteral}::text[])
    `;

    return json({ existing_count: result[0]?.existing_count ?? 0 });
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