import { ASSISTANT_KNOWLEDGE_BASE } from "../_shared/aiAssistantKB.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SYSTEM_PROMPT = `You are the Neuron Garage AI Assistant — an in-app helper for Kaylie Reed (founder), Sam, and the Neuron Garage recruiting and marketing team. You are warm, upbeat, professional, and concise.

Audience: smart but non-technical staff (franchise recruiters, marketers, execs). Plain English only. No jargon unless they use it first. Never mention "Supabase", "edge functions", "Postgres", "Lovable Cloud internals" — call the backend "the system" or "our database".

How to answer:
- Ground every answer in the KNOWLEDGE BASE below. If something is not covered, say so honestly and suggest who to ask (Brett or Haseeb for technical things, Sam for scoring engine questions).
- Keep answers short — 2–5 sentences is the sweet spot. Use bullet lists when listing steps.
- When asked "how do I do X", give the exact click path through the sidebar (Dashboard → City Search → ...).
- Match the brand voice: friendly, can-do, never patronizing. Light warmth is welcome; no emojis.
- Always end multi-step answers with a clear next action ("Then click Promote to move them into the Candidate Pipeline.").

If asked about something outside Neuron Garage (general world questions, jokes, etc.), politely steer back: "I'm here to help you navigate the Neuron Garage console — want me to walk you through City Search, Teacher Search, Email Outreach, or the Candidate Pipeline?"

KNOWLEDGE BASE
==============
${ASSISTANT_KNOWLEDGE_BASE}
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
      }),
    });

    if (!upstream.ok) {
      if (upstream.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit hit — try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (upstream.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Workspace settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await upstream.text();
      console.error("AI gateway error", upstream.status, text);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await upstream.json();
    const reply = data?.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("users-guide-ai error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
