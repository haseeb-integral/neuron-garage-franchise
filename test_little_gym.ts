import { createClient } from "@supabase/supabase-js";

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const firecrawlKey = process.env.FIRECRAWL_API_KEY!;
const lovableKey = process.env.LOVABLE_API_KEY!;
const supabaseUrl = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(supabaseUrl, serviceKey);

const campName = "The Little Gym of Polaris";
const testCity = "Columbus, OH";
const query = `${campName} ${testCity} summer camp tuition price per week`;

console.log("1. Triggering dedicated search:", query);

const res = await fetch(`${FIRECRAWL_V2}/search`, {
  method: "POST",
  headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    query,
    limit: 10,
  }),
});

const j = await res.json();
const items = (Array.isArray(j?.data) ? j.data : Array.isArray(j?.data?.web) ? j.data.web : []);

console.log(`2. Received ${items.length} search snippets from Google.`);

const topItems = items.slice(0, 10);
const blob = topItems.map((it: any, idx: number) => {
  const u = String(it.url ?? it.link ?? "");
  const t = String(it.title ?? "");
  const md = String(it.description ?? it.snippet ?? it.markdown ?? it.content ?? "");
  return `=== RESULT ${idx + 1} ===\nURL: ${u}\nTITLE: ${t}\nSNIPPET: ${md}`;
}).join("\n\n");

console.log("\n--- TOP SNIPPETS PREVIEW ---");
topItems.slice(0, 4).forEach((it: any, idx: number) => {
  console.log(`[Result ${idx+1}] ${it.title}`);
  console.log(`URL: ${it.url ?? it.link}`);
  console.log(`Snippet: ${(it.description ?? it.snippet ?? "").slice(0, 150)}...\n`);
});

const PRICE_RULES = `
Extraction precision rules:
- Tuition must be explicitly stated as per week or per session.
- If a price is given per day (e.g. $80/day), do NOT extrapolate to weekly unless the page explicitly says "5-day week is $400" or similar.
- If multiple tiers exist (half-day vs full-day), return price_min = cheapest weekly option, price_max = most expensive weekly option.
- Safety guard: The dollar numbers you return MUST literally appear in the markdown text. If you return price_min: 250, the string "250" must be present in the text text. Do not calculate, estimate, or guess.
`;

const sys = `You extract the summer camp tuition price per week for the business "${campName}" in ${testCity}.
Return strict JSON: { "providers": [ { "name": string, "url": string|null, "price_min": number|null, "price_max": number|null, "category_raw": string|null, "confidence": number } ] }
Rules:
- Business name must match "${campName}".
- Look specifically for weekly camp tuition, rates, or multi-day camp passes (e.g. 10 day pass for $400 = $200/wk).
- If weekly tuition is found (e.g. $149/wk, $200/wk, $125/wk), return price_min and price_max.
${PRICE_RULES}`;

console.log("3. Feeding snippets to Gemini Literal Guard...");

const aiRes = await fetch(AI_GATEWAY, {
  method: "POST",
  headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: sys },
      { role: "user", content: `Extract tuition for ${campName} from:\n\n${blob}` }
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
  })
});

const aiJson = await aiRes.json();
const content = aiJson.choices?.[0]?.message?.content ?? "{}";
const parsed = JSON.parse(content);
const provider = parsed.providers?.[0] ?? null;

console.log("\n4. Gemini Extracted Result:", JSON.stringify(provider, null, 2));

if (provider && (provider.price_min != null || provider.price_max != null)) {
  console.log("\n5. Verifying Literal Match Safety Guard...");
  const minStr = String(provider.price_min);
  const maxStr = String(provider.price_max ?? provider.price_min);
  const matches = blob.includes(minStr) && blob.includes(maxStr);
  console.log(`Literal Guard check for '${minStr}' and '${maxStr}' in scraped text: ${matches ? "PASSED ✅" : "FAILED ❌"}`);

  if (matches) {
    console.log("\n6. Upgrading camp in mvs_providers table...");
    const { data, error } = await admin.from("mvs_providers").update({
      price_min: provider.price_min,
      price_max: provider.price_max ?? provider.price_min,
      website_url: provider.url ?? null,
      confidence: 1.0,
      updated_at: new Date().toISOString(),
    }).eq("city", testCity).ilike("name", `%${campName}%`).select();

    if (error) {
      console.error("DB Error:", error);
    } else {
      console.log("Successfully upgraded camp in DB:", data);
    }
  }
} else {
  console.log("\nNo usable price returned by Gemini.");
}
