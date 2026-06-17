import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2, PlayCircle, RefreshCw } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Run = Database["public"]["Tables"]["mvs_pipeline_runs"]["Row"];
type Provider = Database["public"]["Tables"]["mvs_providers"]["Row"];
type QaItem = Database["public"]["Tables"]["mvs_qa_queue"]["Row"];


const STATUS_VARIANT: Record<Run["status"], "default" | "secondary" | "destructive" | "outline"> = {
  queued: "outline",
  running: "secondary",
  done: "default",
  failed: "destructive",
};

export default function MVSRun() {
  const { role } = useAuth();
  const isManager = role === "manager" || role === "admin";

  const [city, setCity] = useState("Austin, TX");
  const [running, setRunning] = useState(false);
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [qaItems, setQaItems] = useState<QaItem[]>([]);
  const [showResolved, setShowResolved] = useState(false);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [loadingQa, setLoadingQa] = useState(false);


  const loadRuns = useCallback(async () => {
    setLoadingRuns(true);
    const { data, error } = await supabase
      .from("mvs_pipeline_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setLoadingRuns(false);
    if (error) {
      toast({ title: "Failed to load runs", description: error.message, variant: "destructive" });
      return;
    }
    setRuns(data ?? []);
    if (!selectedRunId && data && data.length > 0) setSelectedRunId(data[0].id);
  }, [selectedRunId]);

  const loadProviders = useCallback(async (runId: string) => {
    setLoadingProviders(true);
    const { data, error } = await supabase
      .from("mvs_providers")
      .select("*")
      .eq("source_run_id", runId)
      .order("confidence", { ascending: false })
      .limit(200);
    setLoadingProviders(false);
    if (error) {
      toast({ title: "Failed to load providers", description: error.message, variant: "destructive" });
      return;
    }
    setProviders(data ?? []);
  }, []);

  const loadQa = useCallback(async (runId: string, includeResolved: boolean) => {
    setLoadingQa(true);
    // Fetch provider IDs for this run, then their QA items.
    const { data: provs, error: pErr } = await supabase
      .from("mvs_providers")
      .select("id")
      .eq("source_run_id", runId)
      .limit(500);
    if (pErr) {
      setLoadingQa(false);
      toast({ title: "Failed to load QA scope", description: pErr.message, variant: "destructive" });
      return;
    }
    const ids = (provs ?? []).map((p) => p.id);
    if (ids.length === 0) {
      setQaItems([]);
      setLoadingQa(false);
      return;
    }
    let q = supabase
      .from("mvs_qa_queue")
      .select("*")
      .eq("entity_type", "provider")
      .in("entity_id", ids)
      .order("created_at", { ascending: false })
      .limit(300);
    if (!includeResolved) q = q.is("resolved_at", null);
    const { data, error } = await q;
    setLoadingQa(false);
    if (error) {
      toast({ title: "Failed to load QA queue", description: error.message, variant: "destructive" });
      return;
    }
    setQaItems(data ?? []);
  }, []);

  useEffect(() => {
    if (isManager) loadRuns();
  }, [isManager, loadRuns]);

  useEffect(() => {
    if (selectedRunId) {
      loadProviders(selectedRunId);
      loadQa(selectedRunId, showResolved);
    }
  }, [selectedRunId, loadProviders, loadQa, showResolved]);

  const resolveQa = async (id: string) => {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("mvs_qa_queue")
      .update({ resolved_at: new Date().toISOString(), resolved_by: u.user?.id ?? null })
      .eq("id", id);
    if (error) {
      toast({ title: "Resolve failed", description: error.message, variant: "destructive" });
      return;
    }
    if (selectedRunId) loadQa(selectedRunId, showResolved);
  };


  const handleRun = async () => {
    const trimmed = city.trim();
    if (!trimmed) {
      toast({ title: "City required", variant: "destructive" });
      return;
    }
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("mvs-discover-providers", {
        body: { city: trimmed },
      });
      if (error) throw new Error(error.message);
      const runId = (data as { run_id?: string })?.run_id;
      const inserted = (data as { providers_inserted?: number })?.providers_inserted ?? 0;
      const qaQueued = (data as { qa_queued?: number })?.qa_queued ?? 0;
      toast({
        title: "Discovery complete",
        description: `${inserted} providers inserted · ${qaQueued} flagged for QA (${trimmed}).`,
      });

      await loadRuns();
      if (runId) setSelectedRunId(runId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: "Run failed", description: msg, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const selectedRun = useMemo(
    () => runs.find((r) => r.id === selectedRunId) ?? null,
    [runs, selectedRunId],
  );

  if (!isManager) {
    return (
      <div className="p-6">
        <PageHeader title="MVS Run" subtitle="Manager-only ops panel" />
        <div className="mt-6 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          You need manager or admin role to access this panel.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="MVS Run"
        subtitle="Trigger provider discovery and review pipeline output. Internal ops only."
      />

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="mvs-city" className="text-xs font-medium text-muted-foreground">
              City (e.g. "Austin, TX")
            </label>
            <Input
              id="mvs-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City, ST"
              disabled={running}
              className="mt-1"
            />
          </div>
          <Button onClick={handleRun} disabled={running}>
            {running ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running…
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-4 w-4" /> Run discovery
              </>
            )}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Calls <code>mvs-discover-providers</code>. Typical run: ~30–90s, ~$0.01 in API costs.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="text-sm font-semibold">Recent runs</h2>
            <p className="text-xs text-muted-foreground">Last 20 pipeline runs across all cities.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={loadRuns} disabled={loadingRuns}>
            <RefreshCw className={`mr-1 h-3 w-3 ${loadingRuns ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>City</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Firecrawl calls</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Error</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.length === 0 && !loadingRuns && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  No runs yet. Trigger one above.
                </TableCell>
              </TableRow>
            )}
            {runs.map((r) => (
              <TableRow
                key={r.id}
                data-state={r.id === selectedRunId ? "selected" : undefined}
                className="cursor-pointer"
                onClick={() => setSelectedRunId(r.id)}
              >
                <TableCell className="font-medium">{r.city}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
                </TableCell>
                <TableCell>{r.firecrawl_calls}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </TableCell>
                <TableCell className="max-w-[280px] truncate text-xs text-destructive">
                  {r.error ?? ""}
                </TableCell>
                <TableCell>
                  <Button
                    variant={r.id === selectedRunId ? "default" : "outline"}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRunId(r.id);
                    }}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4">
          <h2 className="text-sm font-semibold">
            Providers {selectedRun ? `· ${selectedRun.city}` : ""}
          </h2>
          <p className="text-xs text-muted-foreground">
            {selectedRun
              ? `Run ${selectedRun.id.slice(0, 8)}… · ${providers.length} extracted`
              : "Select a run above to inspect providers."}
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>URL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingProviders && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!loadingProviders && providers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                  No providers for this run.
                </TableCell>
              </TableRow>
            )}
            {providers.map((p) => {
              const price =
                p.price_min != null && p.price_max != null
                  ? p.price_min === p.price_max
                    ? `$${p.price_min}`
                    : `$${p.price_min}–$${p.price_max}`
                  : p.price_min != null
                    ? `$${p.price_min}+`
                    : "—";
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-xs">{p.platform}</TableCell>
                  <TableCell className="max-w-[180px] truncate text-xs">
                    {p.category_raw ?? "—"}
                  </TableCell>
                  <TableCell>
                    {p.tier ? <Badge variant="outline">{p.tier}</Badge> : "—"}
                  </TableCell>
                  <TableCell className="text-xs">{price}</TableCell>
                  <TableCell className="text-xs">
                    {p.confidence != null ? p.confidence.toFixed(2) : "—"}
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate text-xs">
                    {p.url ? (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline"
                      >
                        link
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="text-sm font-semibold">
              QA queue {selectedRun ? `· ${selectedRun.city}` : ""}
            </h2>
            <p className="text-xs text-muted-foreground">
              Auto-flagged on insert: confidence &lt; 0.7 or missing price.{" "}
              {qaItems.length} {showResolved ? "total" : "open"} item{qaItems.length === 1 ? "" : "s"}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowResolved((v) => !v)}
            >
              {showResolved ? "Hide resolved" : "Show resolved"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => selectedRunId && loadQa(selectedRunId, showResolved)}
              disabled={loadingQa}
            >
              <RefreshCw className={`mr-1 h-3 w-3 ${loadingQa ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reason</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Flagged</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingQa && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!loadingQa && qaItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  {selectedRun ? "Nothing in QA for this run." : "Select a run to inspect QA items."}
                </TableCell>
              </TableRow>
            )}
            {qaItems.map((q) => (
              <TableRow key={q.id}>
                <TableCell className="text-xs">{q.reason}</TableCell>
                <TableCell className="text-xs">
                  {q.confidence != null ? Number(q.confidence).toFixed(2) : "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(q.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  {q.resolved_at ? (
                    <Badge variant="outline">resolved</Badge>
                  ) : (
                    <Badge variant="secondary">open</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {!q.resolved_at && (
                    <Button size="sm" variant="outline" onClick={() => resolveQa(q.id)}>
                      <Check className="mr-1 h-3 w-3" /> Resolve
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>

  );
}
