import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Simple keyword classifier — returns HOT | NOT_INTERESTED | OOO | NEUTRAL.
function classifyIntent(text: string | null, eventType: string): string {
  if (!text) return "NEUTRAL";
  const t = text.toLowerCase();
  // OOO first — auto-replies often contain "interested in your work" boilerplate
  if (/out of (the )?office|on vacation|away from|automatic reply|auto-reply|on leave|maternity|paternity|will be back|out until|currently away/.test(t)) return "OOO";
  if (/not interested|unsubscribe|remove me|stop emailing|don'?t contact|no thank you|no thanks|please remove|take me off/.test(t)) return "NOT_INTERESTED";
  if (/interested|tell me more|sounds great|let'?s talk|schedule a call|book a meeting|when can we|count me in|love to learn|yes,?\s|happy to chat|would love to|set up a (call|meeting|time)/.test(t)) return "HOT";
  if (eventType === "LEAD_UNSUBSCRIBED") return "NOT_INTERESTED";
  return "NEUTRAL";
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

    const replyIntent = classifyIntent(replyMessage, String(eventType));

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
      reply_intent: replyIntent,
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
