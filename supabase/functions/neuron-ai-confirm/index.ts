// ============================================================================
// neuron-ai-confirm — executes a previously-previewed Neuron AI action
// ============================================================================
//
// Only called after the user clicks Confirm on a propose_action card. Writes
// the row + appends to ai_action_log. All writes are scoped to the asking
// user via auth.uid() + the existing RLS policies on the target tables.
//
// Allowed action types (v1):
//   - add_to_watchlist        { cityId }
//   - remove_from_watchlist   { cityId }
//   - change_candidate_stage  { candidateId, toStage }
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_STAGES = [
  "new_lead", "qualified", "discovery", "confirmation",
  "selection_committee", "signing", "signed",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supa.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Not signed in" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const action_type = String(body.action_type ?? "");
    const payload = (body.payload ?? {}) as Record<string, unknown>;
    const route = String(body.route ?? "/");

    const logRow = async (status: string, error?: string) => {
      await supa.from("ai_action_log").insert({
        user_id: user.id, route, action_type, payload, status, error: error ?? null,
      });
    };

    if (action_type === "add_to_watchlist") {
      const cityId = String(payload.cityId ?? "");
      if (!cityId) {
        await logRow("failed", "cityId required");
        return new Response(JSON.stringify({ error: "cityId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supa.from("watchlist_items")
        .insert({ city_id: cityId, user_id: user.id });
      if (error && !String(error.message).includes("duplicate")) {
        await logRow("failed", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await logRow("success");
      return new Response(JSON.stringify({ ok: true, message: "Added to watchlist." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action_type === "remove_from_watchlist") {
      const cityId = String(payload.cityId ?? "");
      const { error } = await supa.from("watchlist_items")
        .delete().eq("city_id", cityId).eq("user_id", user.id);
      if (error) {
        await logRow("failed", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await logRow("success");
      return new Response(JSON.stringify({ ok: true, message: "Removed from watchlist." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action_type === "change_candidate_stage") {
      const candidateId = String(payload.candidateId ?? "");
      const toStage = String(payload.toStage ?? "");
      if (!candidateId || !ALLOWED_STAGES.includes(toStage)) {
        await logRow("failed", "invalid candidateId or stage");
        return new Response(JSON.stringify({ error: "Invalid candidateId or stage" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supa.from("candidates")
        .update({ current_stage: toStage }).eq("id", candidateId);
      if (error) {
        await logRow("failed", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await logRow("success");
      return new Response(JSON.stringify({ ok: true, message: `Candidate moved to ${toStage}.` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await logRow("failed", `unknown action_type: ${action_type}`);
    return new Response(JSON.stringify({ error: `Unknown action: ${action_type}` }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("neuron-ai-confirm unhandled", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
