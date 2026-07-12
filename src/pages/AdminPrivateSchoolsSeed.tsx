// ============================================================================
// Admin-only page to trigger the private-elementary-schools seed function.
// Isolated route (`/admin/private-schools-seed`). To unwind: delete this file
// and its route entry in App.tsx.
// ============================================================================

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsManager } from "@/hooks/dbHealth/useIsManager";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type RunRow = {
  id: string;
  batch_id: string;
  city_name: string;
  state_abbr: string;
  count: number | null;
  matched_by: string | null;
  status: string | null;
  created_at: string;
};

export default function AdminPrivateSchoolsSeed() {
  const { loading, isManager, isAdmin } = useIsManager();
  const [busy, setBusy] = useState<null | "dry" | "live" | "resume">(null);
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [rows, setRows] = useState<RunRow[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    matchedName: number;
    matchedCentroid: number;
    none: number;
    errors: number;
    zeroMatch: number;
  } | null>(null);
  const [liveDoneCount, setLiveDoneCount] = useState<number | null>(null);

  const trigger = async (mode: "dry" | "live" | "resume") => {
    setBusy(mode);
    setLastResponse(null);
    try {
      const path =
        mode === "dry"
          ? "seed-private-elementary-counts?dry_run=1"
          : mode === "resume"
          ? "seed-private-elementary-counts?resume=1"
          : "seed-private-elementary-counts";
      const { data, error } = await supabase.functions.invoke(path, { method: "POST" });
      if (error) throw error;
      setLastResponse(data);
      toast.success(
        mode === "dry"
          ? "Dry run started. Results will appear below in 1-3 minutes."
          : mode === "resume"
          ? "Resume started. It will skip cities already done and continue."
          : "Live run started. Results will appear below in 1-3 minutes.",
      );
    } catch (e: any) {
      toast.error(`Failed: ${e?.message ?? String(e)}`);
      setLastResponse({ error: e?.message ?? String(e) });
    } finally {
      setBusy(null);
    }
  };

  // Re-process a small hand-picked list of cities that need the new name
  // normalizer (strips "Town", "City", "Urban", etc.) or that were missing
  // coordinates before we backfilled them.
  const reprocessTargeted = async () => {
    setBusy("live");
    setLastResponse(null);
    try {
      const cityIds = [
        "f89f8d3d-e70a-40c2-a60c-ae64a174b132", // Hempstead, NY
        "2576a5dd-40ab-4a6b-80bd-69418d88925c", // Methuen, MA
        "8eb84c6a-657f-4233-802f-4e502bcba2d0", // Milford, CT
        "a1932547-2c42-4f64-8b16-9d33e4762efc", // Urban Honolulu, HI
        "ca341320-8ac0-4af6-b7ee-58ef2690cdef", // Ventura, CA
        "c96bda30-f9c1-447f-bb65-89a67ef9dc6f", // Weymouth Town, MA
      ];
      const { data, error } = await supabase.functions.invoke(
        "seed-private-elementary-counts",
        { method: "POST", body: { city_ids: cityIds } },
      );
      if (error) throw error;
      setLastResponse(data);
      toast.success("Targeted re-seed started for 6 cities. Check results in ~1 min.");
    } catch (e: any) {
      toast.error(`Failed: ${e?.message ?? String(e)}`);
      setLastResponse({ error: e?.message ?? String(e) });
    } finally {
      setBusy(null);
    }
  };

  const refresh = async () => {
    const { data } = await supabase
      .from("private_elementary_seed_runs")
      .select("id,batch_id,city_name,state_abbr,count,matched_by,status,created_at")
      .order("created_at", { ascending: false })
      .limit(1000);
    const list = (data ?? []) as RunRow[];
    setRows(list);
    if (list.length === 0) {
      setSummary(null);
      return;
    }
    const latestBatch = list[0].batch_id;
    const inBatch = list.filter((r) => r.batch_id === latestBatch);
    setSummary({
      total: inBatch.length,
      matchedName: inBatch.filter((r) => r.matched_by === "name").length,
      matchedCentroid: inBatch.filter((r) => r.matched_by === "centroid").length,
      none: inBatch.filter((r) => r.matched_by === "none" || r.matched_by == null).length,
      errors: inBatch.filter((r) => r.status === "error" || r.status === "failed").length,
      zeroMatch: inBatch.filter((r) => (r.count ?? 0) === 0).length,
    });

    // Count distinct cities that actually have a real value written to us_cities_scored.
    // This is the true source of truth — avoids double-counting cities that appear in
    // multiple live batches (fresh + resume) in private_elementary_seed_runs.
    const { count } = await supabase
      .from("us_cities_scored")
      .select("id", { count: "exact", head: true })
      .not("private_elementary_count", "is", null);
    setLiveDoneCount(count ?? 0);
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 10000);
    return () => clearInterval(t);
  }, []);

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading...</div>;
  if (!isManager && !isAdmin) {
    return (
      <div className="p-8">
        <PageHeader title="Not authorized" subtitle="Admin/manager role required." />
      </div>
    );
  }

  const latestBatch = rows[0]?.batch_id ?? null;
  const latestRows = latestBatch ? rows.filter((r) => r.batch_id === latestBatch) : [];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl">
      <PageHeader
        title="Private Elementary Schools Seed"
        subtitle="Admin-only. Loads private elementary school counts from NCES PSS 2021-22 into the 817 scored cities."
      />

      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div>
          <div className="text-sm font-semibold mb-1">Step 1 — Dry run (safe, no writes)</div>
          <div className="text-sm text-muted-foreground mb-3">
            Runs the matcher and logs how many schools it would match per city into
            <code className="mx-1 rounded bg-muted px-1">private_elementary_seed_runs</code>.
            No changes to city scores. Takes 1-3 minutes.
          </div>
          <Button onClick={() => trigger("dry")} disabled={busy !== null}>
            {busy === "dry" ? "Starting..." : "Run dry run"}
          </Button>
        </div>

        <div className="border-t pt-4">
          <div className="text-sm font-semibold mb-1">Step 2 — Live run (writes real data)</div>
          <div className="text-sm text-muted-foreground mb-3">
            Only run this after reviewing the dry-run summary below and confirming match quality
            looks good (e.g., most cities matched by name, few zero-match cities).
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="destructive" onClick={() => trigger("live")} disabled={busy !== null}>
              {busy === "live" ? "Starting..." : "Run live seed (fresh)"}
            </Button>
            <Button variant="outline" onClick={() => trigger("resume")} disabled={busy !== null}>
              {busy === "resume" ? "Starting..." : `Resume live seed${liveDoneCount != null ? ` (${liveDoneCount}/817 done)` : ""}`}
            </Button>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Use <b>Resume</b> if a previous live run stopped early. It skips cities already marked
            done and continues with the rest. Safe to click again if it stops again.
          </div>
        </div>

        {lastResponse && (
          <pre className="mt-2 rounded bg-muted p-3 text-xs overflow-auto">
            {JSON.stringify(lastResponse, null, 2)}
          </pre>
        )}
      </div>

      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold">Latest run summary</div>
            <div className="text-xs text-muted-foreground">
              Auto-refreshes every 10 seconds. Batch id: {latestBatch ?? "(none yet)"}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={refresh}>Refresh</Button>
        </div>

        {summary ? (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
            <Stat label="Cities processed" value={summary.total} />
            <Stat label="Matched by name" value={summary.matchedName} />
            <Stat label="Matched by centroid" value={summary.matchedCentroid} />
            <Stat label="No match" value={summary.none} />
            <Stat label="Zero schools" value={summary.zeroMatch} />
            <Stat label="Errors" value={summary.errors} tone={summary.errors > 0 ? "bad" : "ok"} />
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No runs yet. Click "Run dry run" above.</div>
        )}

        {latestRows.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium">
              Show all {latestRows.length} rows in this batch
            </summary>
            <div className="mt-2 max-h-96 overflow-auto border rounded">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2">City</th>
                    <th className="text-left p-2">State</th>
                    <th className="text-right p-2">Count</th>
                    <th className="text-left p-2">Matched by</th>
                    <th className="text-left p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {latestRows.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-2">{r.city_name}</td>
                      <td className="p-2">{r.state_abbr}</td>
                      <td className="p-2 text-right">{r.count ?? "-"}</td>
                      <td className="p-2">{r.matched_by ?? "-"}</td>
                      <td className="p-2">{r.status ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "ok" | "bad" }) {
  return (
    <div className="rounded border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold ${tone === "bad" ? "text-destructive" : ""}`}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}
