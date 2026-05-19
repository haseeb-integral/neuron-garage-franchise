import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Always 200 quickly so SmartLead doesn't retry.
  try {
    const payload = await req.json().catch(() => ({}));

    const eventType =
      payload.event_type ??
      payload.eventType ??
      payload.event ??
      payload.type ??
      "UNKNOWN";

    const campaignId =
      payload.campaign_id ?? payload.campaignId ?? payload.campaign?.id ?? null;
    const leadId = payload.lead_id ?? payload.leadId ?? payload.lead?.id ?? null;
    const leadEmail =
      payload.lead_email ?? payload.email ?? payload.lead?.email ?? null;
    const replyMessageId =
      payload.reply_message_id ??
      payload.message_id ??
      payload.reply?.message_id ??
      null;
    const replyMessage =
      payload.reply_message ??
      payload.reply_text ??
      payload.reply?.text ??
      payload.message ??
      null;

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
