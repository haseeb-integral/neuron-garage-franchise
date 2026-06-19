// ============================================================================
// /mvs-qa-queue — manager-only review page for low-confidence MVS week
// extractions. Lists each open item with the scraped screenshot + AI guess,
// lets the reviewer pick the correct status and resolve the queue item in a
// single atomic RPC call.
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useIsManager } from "@/hooks/dbHealth/useIsManager";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type WeekStatus = "open" | "limited" | "waitlist" | "sold_out" | "unknown";

type QueueRow = {
  id: string;
  entity_id: string;
  entity_type: "week" | "provider";
  reason: string | null;
  confidence: number | null;
  resolved_at: string | null;
  created_at: string;
  week?: {
    id: string;
    status: WeekStatus | null;
    week_start: string | null;
    week_end: string | null;
    screenshot_url: string | null;
    source_url: string | null;
    confidence: number | null;
    provider_id: string;
    provider?: {
      name: string | null;
      city: string | null;
    } | null;
  } | null;
};

const STATUS_OPTIONS: WeekStatus[] = ["sold_out", "waitlist", "limited", "open", "unknown"];

async function signedUrlFor(path: string | null): Promise<string | null> {
  if (!path) return null;
  // path may already be a full URL
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = await supabase.storage
    .from("mvs-screenshots")
    .createSignedUrl(path, 60 * 30);
  return data?.signedUrl ?? null;
}

export default function MVSQAQueue() {
  const { loading: roleLoading, isManager } = useIsManager();
  const [rows, setRows] = useState<QueueRow[] | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [pending, setPending] = useState<Record<string, WeekStatus>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [screenshots, setScreenshots] = useState<Record<string, string | null>>({});

  const load = useCallback(async () => {
    let query = supabase
      .from("mvs_qa_queue")
      .select(
        `id, entity_id, entity_type, reason, confidence, resolved_at, created_at,
         week:mvs_weeks!mvs_qa_queue_entity_id_fkey(
           id, status, week_start, week_end, screenshot_url, source_url, confidence, provider_id,
           provider:mvs_providers(name, city)
         )`,
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (!showResolved) query = query.is("resolved_at", null);
    const { data, error } = await query;
    if (error) {
      // Fallback without FK alias if PostgREST cannot infer it
      const fallback = await supabase
        .from("mvs_qa_queue")
        .select("id, entity_id, entity_type, reason, confidence, resolved_at, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (fallback.error) {
        toast.error(`Failed to load queue: ${fallback.error.message}`);
        setRows([]);
        return;
      }
      // Hydrate weeks manually
      const ids = (fallback.data ?? [])
        .filter((r) => r.entity_type === "week")
        .map((r) => r.entity_id);
      const { data: weeks } = ids.length
        ? await supabase
            .from("mvs_weeks")
            .select(
              "id, status, week_start, week_end, screenshot_url, source_url, confidence, provider_id",
            )
            .in("id", ids)
        : { data: [] as any[] };
      const providerIds = Array.from(new Set((weeks ?? []).map((w) => w.provider_id)));
      const { data: provs } = providerIds.length
        ? await supabase.from("mvs_providers").select("id, name, city").in("id", providerIds)
        : { data: [] as any[] };
      const provMap = new Map((provs ?? []).map((p: any) => [p.id, p]));
      const weekMap = new Map(
        (weeks ?? []).map((w: any) => [
          w.id,
          { ...w, provider: provMap.get(w.provider_id) ?? null },
        ]),
      );
      setRows(
        (fallback.data ?? []).map((r) => ({
          ...(r as QueueRow),
          week: r.entity_type === "week" ? (weekMap.get(r.entity_id) as any) : null,
        })),
      );
      return;
    }
    setRows((data ?? []) as unknown as QueueRow[]);
  }, [showResolved]);

  useEffect(() => {
    if (!isManager) return;
    load();
  }, [isManager, load]);

  // Sign screenshot URLs as rows arrive
  useEffect(() => {
    if (!rows) return;
    let cancelled = false;
    (async () => {
      const next: Record<string, string | null> = {};
      await Promise.all(
        rows.map(async (r) => {
          const path = r.week?.screenshot_url ?? null;
          if (!path) return;
          next[r.id] = await signedUrlFor(path);
        }),
      );
      if (!cancelled) setScreenshots((prev) => ({ ...prev, ...next }));
    })();
    return () => {
      cancelled = true;
    };
  }, [rows]);

  const openCount = useMemo(
    () => (rows ?? []).filter((r) => r.resolved_at == null).length,
    [rows],
  );

  const handleSave = async (row: QueueRow) => {
    const newStatus = pending[row.id] ?? row.week?.status ?? "unknown";
    setSavingId(row.id);
    const { error } = await supabase.rpc("mvs_qa_resolve", {
      _queue_id: row.id,
      _new_status: newStatus,
    });
    setSavingId(null);
    if (error) {
      toast.error(`Save failed: ${error.message}`);
      return;
    }
    toast.success("Resolved");
    setPending((p) => {
      const { [row.id]: _, ...rest } = p;
      return rest;
    });
    load();
  };

  const handleResolveOnly = async (row: QueueRow) => {
    setSavingId(row.id);
    const { error } = await supabase.rpc("mvs_qa_resolve", {
      _queue_id: row.id,
      _new_status: (row.week?.status ?? "unknown") as WeekStatus,
    });
    setSavingId(null);
    if (error) {
      toast.error(`Resolve failed: ${error.message}`);
      return;
    }
    toast.success("Marked resolved");
    load();
  };

  if (roleLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }
  if (!isManager) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold">Forbidden</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The QA queue is restricted to managers and admins.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">MVS QA Queue</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {openCount} open item{openCount === 1 ? "" : "s"} — review low-confidence
            week extractions and correct the status.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
          />
          Show resolved
        </label>
      </header>

      {rows == null ? (
        <div className="text-sm text-muted-foreground">Loading queue…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          Nothing to review. {showResolved ? "No resolved items either." : "All caught up."}
        </div>
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => {
            const w = row.week;
            const screenshot = screenshots[row.id];
            const selected =
              pending[row.id] ?? (w?.status as WeekStatus | undefined) ?? "unknown";
            const isResolved = row.resolved_at != null;
            return (
              <li
                key={row.id}
                className="rounded-lg border bg-card p-4 shadow-sm"
                style={{ opacity: isResolved ? 0.6 : 1 }}
              >
                <div className="grid gap-4 md:grid-cols-[1fr,260px]">
                  <div className="space-y-2 text-sm">
                    <div className="font-semibold text-base">
                      {w?.provider?.name ?? "(unknown provider)"}
                    </div>
                    <div className="text-muted-foreground">
                      {w?.provider?.city ?? "—"} · Week{" "}
                      {w?.week_start ?? "?"}
                      {w?.week_end ? ` → ${w.week_end}` : ""}
                    </div>
                    <div>
                      <span className="text-muted-foreground">AI guessed: </span>
                      <span className="font-medium">{w?.status ?? "—"}</span>
                      {w?.confidence != null && (
                        <span className="text-muted-foreground">
                          {" "}
                          ({Math.round((w.confidence ?? 0) * 100)}% confidence)
                        </span>
                      )}
                    </div>
                    {row.reason && (
                      <div className="text-muted-foreground">
                        <span className="font-medium text-foreground">Reason:</span>{" "}
                        {row.reason}
                      </div>
                    )}
                    {w?.source_url && (
                      <div className="break-all">
                        <span className="text-muted-foreground">Source: </span>
                        <a
                          href={w.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          {w.source_url}
                        </a>
                      </div>
                    )}
                    {isResolved && (
                      <div className="text-xs text-muted-foreground">
                        Resolved {new Date(row.resolved_at!).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div>
                    {screenshot ? (
                      <a href={screenshot} target="_blank" rel="noopener noreferrer">
                        <img
                          src={screenshot}
                          alt="Source screenshot"
                          className="w-full rounded border"
                          loading="lazy"
                        />
                      </a>
                    ) : (
                      <div className="flex h-32 items-center justify-center rounded border bg-muted text-xs text-muted-foreground">
                        No screenshot
                      </div>
                    )}
                  </div>
                </div>

                {!isResolved && (
                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-3">
                    <span className="text-sm text-muted-foreground">Correct status:</span>
                    <Select
                      value={selected}
                      onValueChange={(v) =>
                        setPending((p) => ({ ...p, [row.id]: v as WeekStatus }))
                      }
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => handleSave(row)}
                      disabled={savingId === row.id}
                    >
                      {savingId === row.id ? "Saving…" : "Save"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => handleResolveOnly(row)}
                      disabled={savingId === row.id}
                      className="text-xs text-muted-foreground underline hover:text-foreground"
                    >
                      Mark resolved without change
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-8 text-xs text-muted-foreground">
        <Link to="/market-validation" className="underline">
          ← Back to Market Validation
        </Link>
      </div>
    </div>
  );
}
