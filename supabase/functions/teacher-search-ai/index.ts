// Teacher Search co-pilot — grounded Q&A over the user's current filter/result set.
// Non-streaming for v1: takes { messages, context } → returns { reply }.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type Msg = { role: "user" | "assistant" | "system"; content: string };

const SYSTEM = `You are the Teacher Search co-pilot inside Neuron Garage, an internal franchise-recruiting tool for Kaylie Reed's elementary-school enrichment camps.

You help the team reason about the teachers currently visible on the Teacher Search screen. You DO NOT take actions — you only answer questions and suggest next moves. Be concise, show numbers, and never invent rows that aren't in the provided context.

When you reference a teacher, use their name and city. When asked for "top N", rank by fit_score (higher = better). If the user asks something the grounding context can't answer, say so plainly and suggest what filter they should apply.

Format: short markdown, bullets where helpful, no headers.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const messages: Msg[] = Array.isArray(body?.messages) ? body.messages : [];
    const context = body?.context ?? {};

    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const grounded: Msg[] = [
      { role: "system", content: SYSTEM },
      {
        role: "system",
        content:
          "Current Teacher Search context (JSON):\n" +
          JSON.stringify(context).slice(0, 12000),
      },
      ...messages.slice(-12).map((m) => ({
        role: m.role === "assistant" ? "assistant" as const : "user" as const,
        content: String(m.content ?? "").slice(0, 4000),
      })),
    ];

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: grounded,
      }),
    });

    if (r.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (r.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Workspace > Usage." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: `Gateway ${r.status}: ${t.slice(0, 400)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
