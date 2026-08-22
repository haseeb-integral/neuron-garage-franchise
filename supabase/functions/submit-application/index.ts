import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const BodySchema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).optional().default(""),
  source_campaign: z.string().trim().max(200).optional().default(""),
  utm_source: z.string().trim().max(200).optional().default(""),
  page_url: z.string().trim().max(500).optional().default(""),
  // Honeypot: real people never fill this in.
  company: z.string().max(200).optional().default(""),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: parsed.error.flatten().fieldErrors }, 400);
  }
  const b = parsed.data;

  // Bot caught by the honeypot: pretend everything is fine, store nothing.
  if (b.company.trim() !== "") {
    return json({ ok: true, status: "received" });
  }

  const email = b.email.toLowerCase();
  const phone = b.phone.replace(/[^\d+()\-.\s]/g, "").trim();

  try {
    // ---- Rate limit: max 5 submissions per email per hour ----
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recent } = await supabase
      .from("candidate_activities")
      .select("id", { count: "exact", head: true })
      .eq("type", "note")
      .eq("actor_email", email)
      .gte("created_at", since);
    if ((recent ?? 0) >= 5) {
      return json({ error: "Too many submissions. Please try again later." }, 429);
    }

    // ---- Existing candidate with this email? ----
    const { data: existing, error: findErr } = await supabase
      .from("candidates")
      .select("id, first_name, last_name, phone")
      .ilike("email", email)
      .maybeSingle();
    if (findErr) throw findErr;

    let candidateId: string;
    let isNew = false;

    if (existing) {
      candidateId = existing.id;
      // Fill in a phone number only if we did not have one.
      if (!existing.phone && phone) {
        await supabase.from("candidates").update({ phone }).eq("id", candidateId);
      }
      await supabase.from("candidate_activities").insert({
        candidate_id: candidateId,
        type: "note",
        content: "Re-applied through the landing page form.",
        actor_email: email,
        metadata: {
          channel: "landing_page",
          source_campaign: b.source_campaign || null,
          utm_source: b.utm_source || null,
          page_url: b.page_url || null,
        },
      });
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from("candidates")
        .insert({
          first_name: b.first_name,
          last_name: b.last_name,
          email,
          phone: phone || null,
          current_stage: "new_lead",
          status: "active",
          source: "Landing Page",
          source_type: "Inbound",
          source_name: "Landing Page",
          source_campaign: b.source_campaign || null,
          source_notes: [b.utm_source && `utm_source: ${b.utm_source}`, b.page_url && `page: ${b.page_url}`]
            .filter(Boolean)
            .join(" | ") || null,
          email_source: "applicant_provided",
        })
        .select("id")
        .single();

      if (insErr) {
        // Someone submitted twice at the same moment: treat as a duplicate, not an error.
        if (insErr.code === "23505") {
          return json({ ok: true, status: "duplicate" });
        }
        throw insErr;
      }

      candidateId = inserted.id;
      isNew = true;

      await supabase.from("candidate_activities").insert({
        candidate_id: candidateId,
        type: "note",
        content: "New lead created from the landing page application form.",
        actor_email: email,
        metadata: {
          channel: "landing_page",
          source_campaign: b.source_campaign || null,
          utm_source: b.utm_source || null,
          page_url: b.page_url || null,
        },
      });
    }

    // ---- Bell notification for every staff member ----
    const { data: staff } = await supabase.from("user_roles").select("user_id");
    const uniqueUsers = Array.from(new Set((staff ?? []).map((r) => r.user_id)));
    if (uniqueUsers.length > 0) {
      await supabase.from("notifications").insert(
        uniqueUsers.map((uid) => ({
          user_id: uid,
          kind: "new_application",
          title: isNew
            ? `New applicant: ${b.first_name} ${b.last_name}`
            : `Repeat application: ${b.first_name} ${b.last_name}`,
          message: isNew
            ? `${email} applied through the landing page. They are in the New Lead column.`
            : `${email} submitted the landing page form again. A note was added to their existing record.`,
          link: `/candidate-pipeline?candidate=${candidateId}`,
        })),
      );
    }

    return json({ ok: true, status: isNew ? "created" : "duplicate" });
  } catch (err) {
    console.error("submit-application failed", err);
    return json({ error: "Could not submit your application. Please try again." }, 500);
  }
});
