// Feature 1B calibration harness. Runs Trinity (anchor PASS),
// LeafSpring (anchor FAIL), and a private-elementary control through compute-sas
// and reports whether the calibration gate is met.
// Gate: Trinity >= 80 AND LeafSpring <= 50 AND margin >= 25.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ANCHORS = [
  {
    label: "Trinity Christian Academy",
    address: "4131 Spring Valley Rd, Addison, TX 75001",
    school_name: "Trinity Christian Academy",
    school_type: "private_elementary",
    enrollment: 700,
    grade_band: "k5_k6",
    expect: "high" as const,
  },
  {
    label: "LeafSpring (closed)",
    address: "9701 David Taylor Dr, Charlotte, NC 28262",
    school_name: "LeafSpring School at Concord Mills",
    school_type: "daycare",
    enrollment: 200,
    grade_band: "other",
    expect: "low" as const,
  },
  {
    label: "Control — Greenhill School",
    address: "4141 Spring Valley Rd, Addison, TX 75001",
    school_name: "Greenhill School",
    school_type: "private_elementary",
    enrollment: 650,
    grade_band: "k5_k6",
    expect: "high" as const,
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) {
    return new Response(JSON.stringify({ error: "auth required" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const projectUrl = Deno.env.get("SUPABASE_URL")!;
  const results: Array<Record<string, unknown>> = [];
  for (const a of ANCHORS) {
    const res = await fetch(`${projectUrl}/functions/v1/compute-sas`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...a, engine_version_override: "calibration-v0.1" }),
    });
    const data = await res.json().catch(() => ({}));
    results.push({ label: a.label, expect: a.expect, ...data });
  }

  const byLabel = (l: string) =>
    results.find((r) => String(r.label).startsWith(l)) as
      | { sas?: number; status?: string }
      | undefined;
  const trinity = Number(byLabel("Trinity")?.sas ?? NaN);
  const leaf = Number(byLabel("LeafSpring")?.sas ?? NaN);
  const margin = Number.isFinite(trinity) && Number.isFinite(leaf)
    ? trinity - leaf
    : NaN;
  const gate = {
    trinity_high: trinity >= 80,
    leafspring_low: leaf <= 50,
    margin_ok: margin >= 25,
    pass: trinity >= 80 && leaf <= 50 && margin >= 25,
    trinity,
    leafspring: leaf,
    margin,
  };

  return new Response(JSON.stringify({ gate, results }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
