import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// 7-bucket taxonomy mirrors Smartlead's Lead Categories. NEVER add NEUTRAL back —
// every reply MUST land in exactly one of these. Unsure → INFO_REQUEST (forces a human read).
type Category =
  | "INTERESTED"
  | "MEETING_REQUEST"
  | "INFO_REQUEST"
  | "SOFT_NO"
  | "WRONG_PERSON"
  | "NOT_INTERESTED"
  | "OOO";

interface Classification {
  category: Category;
  confidence: number; // 0..1
  reason: string;
}

// --- Tier 1: cheap keyword/regex pass. Order matters: most-specific first. ---
function regexClassify(text: string | null, eventType: string): Classification | null {
  if (!text) {
    if (eventType === "LEAD_UNSUBSCRIBED") {
      return { category: "NOT_INTERESTED", confidence: 0.95, reason: "lead unsubscribed event" };
    }
    return null;
  }
  const t = text.toLowerCase();

  // OOO first — auto-replies often contain "interested" boilerplate
  if (/out of (the )?office|on vacation|away from (the )?office|automatic reply|auto[-\s]?reply|on leave|maternity|paternity|will be back|out until|currently away|annual leave/.test(t)) {
    return { category: "OOO", confidence: 0.9, reason: "auto-reply / OOO phrasing" };
  }

  // Hard NO / unsubscribe
  if (/unsubscribe|remove me|stop emailing|don'?t (contact|email) me|take me off|please stop|do not contact/.test(t)) {
    return { category: "NOT_INTERESTED", confidence: 0.92, reason: "explicit unsubscribe / hard no" };
  }
  if (/^\s*(no thanks?|not interested|no thank you)\.?\s*$/i.test(text) ||
      /\bnot interested\b/.test(t)) {
    return { category: "NOT_INTERESTED", confidence: 0.88, reason: "explicit not interested" };
  }

  // Wrong person — forwarded contact
  if (/wrong person|not the right person|don'?t handle|you (should|need to) (contact|reach|talk to|email)|forward(ed|ing)? (this|you) to|please contact|reach out to|talk to (our|my)/.test(t)) {
    return { category: "WRONG_PERSON", confidence: 0.78, reason: "redirect / wrong person language" };
  }

  // Soft no / defer — the summer-camp case lives here
  if (/not (available|free|interested|able) (this|for|in|during)?\s*(summer|fall|spring|winter|year|season|semester|right now|at (this|the) (time|moment))/.test(t) ||
      /maybe (next|later)|not (now|right now|at this time|at the moment)|reach out (again|later|next)|circle back|check back|too busy|not a good time|bad timing|already (have|using|signed)/.test(t)) {
    return { category: "SOFT_NO", confidence: 0.8, reason: "defer / soft-no phrasing" };
  }

  // Meeting request
  if (/book a (call|meeting|time)|schedule a (call|meeting|time)|set up a (call|meeting|time)|let'?s (talk|chat|meet|jump on|hop on)|when (can|are) (we|you)|send (me )?(a )?(calendar|invite|link)|calendly|grab (a |some )?time/.test(t)) {
    return { category: "MEETING_REQUEST", confidence: 0.85, reason: "explicit meeting/scheduling ask" };
  }

  // Info request (questions about cost/details/location)
  if (/how much|what (is|does) (the |it )?cost|pricing|price|where are you (located|based)|tell me more|send (me )?(more )?(info|details|information)|learn more|what'?s (the|your)|how does (it|this) work/.test(t)) {
    return { category: "INFO_REQUEST", confidence: 0.75, reason: "question about cost / details" };
  }

  // Strong interested (only after weaker buckets ruled out)
  if (/(i'?m |we'?re |very |really |absolutely )?(interested|keen|excited|love(d)? (to|this)|count me in|sign me up|sounds (great|good|interesting)|let'?s (do|go) (this|it)|happy to (chat|learn)|would love to)/.test(t)) {
    return { category: "INTERESTED", confidence: 0.78, reason: "positive interest signal" };
  }

  return null; // → fall through to AI tier
}

// --- Tier 2: AI fallback via Lovable AI Gateway ---
async function aiClassify(text: string): Promise<Classification | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return null;

  const system =
    "You classify replies to franchise-recruiting cold emails into exactly one category. " +
    "Categories: INTERESTED, MEETING_REQUEST, INFO_REQUEST, SOFT_NO, WRONG_PERSON, NOT_INTERESTED, OOO. " +
    "Rules: a question about cost/details is INFO_REQUEST, not INTERESTED. " +
    "\"Not this summer\" / \"not now\" / \"maybe next year\" is SOFT_NO. " +
    "If unsure, return INFO_REQUEST with low confidence. " +
    "Return ONLY a JSON object: {\"category\":\"...\",\"confidence\":0.x,\"reason\":\"one short sentence\"}.";

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Reply text:\n"""${text.slice(0, 4000)}"""` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      console.warn("aiClassify gateway non-OK", res.status, await res.text().catch(() => ""));
      return null;
    }
    const json = await res.json();
    const raw = json?.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);
    const cat = String(parsed.category ?? "").toUpperCase() as Category;
    const valid: Category[] = ["INTERESTED", "MEETING_REQUEST", "INFO_REQUEST", "SOFT_NO", "WRONG_PERSON", "NOT_INTERESTED", "OOO"];
    if (!valid.includes(cat)) return null;
    const confRaw = Number(parsed.confidence);
    const conf = Number.isFinite(confRaw) ? Math.max(0, Math.min(1, confRaw)) : 0.5;
    return {
      category: cat,
      confidence: conf,
      reason: String(parsed.reason ?? "ai classification").slice(0, 240),
    };
  } catch (e) {
    console.warn("aiClassify error", e instanceof Error ? e.message : String(e));
    return null;
  }
}

async function classifyReply(text: string | null, eventType: string): Promise<Classification> {
  // Non-reply events
  if (eventType !== "EMAIL_REPLIED" && eventType !== "LEAD_CATEGORY_UPDATED") {
    if (eventType === "LEAD_UNSUBSCRIBED") {
      return { category: "NOT_INTERESTED", confidence: 0.95, reason: "unsubscribe event" };
    }
    if (eventType === "EMAIL_BOUNCED") {
      return { category: "NOT_INTERESTED", confidence: 0.99, reason: "hard bounce" };
    }
  }

  const r = regexClassify(text, eventType);
  if (r) return r;

  if (text && text.trim().length > 0) {
    const a = await aiClassify(text);
    if (a) return a;
  }

  // Safe default: forces a human to look
  return { category: "INFO_REQUEST", confidence: 0.3, reason: "unclassified — human review needed" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = await req.json().catch(() => ({}));

    const eventType =
      payload.event_type ?? payload.eventType ?? payload.event ?? payload.type ?? "UNKNOWN";

    const campaignId = payload.campaign_id ?? payload.campaignId ?? payload.campaign?.id ?? null;
    const leadId = payload.lead_id ?? payload.leadId ?? payload.lead?.id ?? null;
    const leadEmail = payload.lead_email ?? payload.email ?? payload.lead?.email ?? null;
    const replyMessageId =
      payload.reply_message_id ?? payload.message_id ?? payload.reply?.message_id ?? null;
    const replyMessage =
      payload.reply_message ?? payload.reply_text ?? payload.reply?.text ?? payload.message ?? null;

    const classification = await classifyReply(
      replyMessage ? String(replyMessage) : null,
      String(eventType),
    );

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error } = await supabase.from("smartlead_events").insert({
      event_type: String(eventType),
      campaign_id: campaignId ? String(campaignId) : null,
      lead_id: leadId ? String(leadId) : null,
      lead_email: leadEmail ? String(leadEmail) : null,
      reply_message_id: replyMessageId ? String(replyMessageId) : null,
      reply_message: replyMessage ? String(replyMessage) : null,
      reply_intent: classification.category,
      reply_intent_confidence: classification.confidence,
      reply_intent_reason: classification.reason,
      payload,
    });

    if (error) console.error("smartlead-webhook insert error", error);
  } catch (err) {
    console.error("smartlead-webhook error", err);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
