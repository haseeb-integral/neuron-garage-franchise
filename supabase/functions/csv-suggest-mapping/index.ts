// Suggest a CSV→teacher_prospects column mapping via Lovable AI.
// Input: { headers: string[], sample_rows: Record<string,string>[] (max 5) }
// Output: { mapping: Record<TargetField, string|null>, unmapped: string[], reasoning?: string }
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible";
import { generateText, Output } from "npm:ai";
import { z } from "npm:zod";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TARGET_FIELDS = [
  "first_name", "last_name", "name", "email", "school", "district",
  "city", "state", "grade", "subject", "teacher_type", "experience_years",
  "linkedin_url", "phone",
] as const;

const FieldEnum = z.enum(TARGET_FIELDS);

const Schema = z.object({
  mapping: z.record(FieldEnum, z.string().nullable()),
  unmapped: z.array(z.string()),
  reasoning: z.string().optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    const body = await req.json().catch(() => ({}));
    const headers = Array.isArray(body.headers) ? body.headers.map(String) : [];
    const sample = Array.isArray(body.sample_rows) ? body.sample_rows.slice(0, 5) : [];
    if (!headers.length) return json({ error: "headers required" }, 400);

    const gateway = createOpenAICompatible({
      name: "lovable",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });

    const prompt = `You are mapping a teacher CSV import to our master pool schema.

CSV headers: ${JSON.stringify(headers)}

Sample rows (first 5):
${JSON.stringify(sample, null, 2)}

Available target fields:
${TARGET_FIELDS.join(", ")}

Rules:
- For each target field, pick the single best matching CSV header, or null if none fits.
- Only use header strings that appear EXACTLY in the CSV headers list.
- "name" should only be used if first_name AND last_name cannot be split out; prefer first/last when both exist.
- "teacher_type" values are: active, retired, camp_enrichment.
- Put every CSV header that did not map into "unmapped".
- Keep "reasoning" to one short sentence.
Return JSON.`;

    const { output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      output: Output.object({ schema: Schema }),
      prompt,
    });

    // Sanity-check: drop mappings that reference unknown headers
    const headerSet = new Set(headers);
    const cleaned: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(output.mapping ?? {})) {
      cleaned[k] = v && headerSet.has(v) ? v : null;
    }
    const used = new Set(Object.values(cleaned).filter(Boolean) as string[]);
    const unmapped = headers.filter((h) => !used.has(h));

    return json({ mapping: cleaned, unmapped, reasoning: output.reasoning });
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    const status = msg.includes("429") ? 429 : msg.includes("402") ? 402 : 500;
    return json({ error: msg }, status);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
