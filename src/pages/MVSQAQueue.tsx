// ============================================================================
// /mvs-qa-queue — manager-only review page for low-confidence MVS week
// extractions AND providers whose week extraction returned nothing. Lets the
// reviewer correct status (weeks) or mark the provider issue resolved.
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useIsManager } from "@/hooks/dbHealth/useIsManager";
import { supabase } from "@/integrations/supabase/client";
import { invalidateAllMvs } from "@/lib/mvs/useLiveMvs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

type WeekStatus = "open" | "limited" | "waitlist" | "sold_out" | "unknown";

type ProviderInfo = {
  id: string;
  name: string | null;
  city: string | null;
  website_url?: string | null;
  url?: string | null;
};

type WeekInfo = {
  id: string;
  status: WeekStatus | null;
  week_start: string | null;
  week_end: string | null;
  screenshot_url: string | null;
  source_url: string | null;
  confidence: number | null;
  provider_id: string;
  provider?: ProviderInfo | null;
};

type TriedEntry = {
  url: string;
  step: "map" | "search" | "scrape" | "ai";
  ok: boolean;
  http_status?: number;
  note?: string;
};

type Diagnostics = {
  root_url?: string | null;
  tried?: TriedEntry[];
  error?: string | null;
} | null;

type QueueRow = {
  id: string;
  entity_id: string;
  entity_type: "week" | "provider";
  reason: string | null;
  confidence: number | null;
  resolved_at: string | null;
  created_at: string;
  diagnostics?: Diagnostics;
  week?: WeekInfo | null;
  provider?: ProviderInfo | null; // populated for entity_type === 'provider'
};

const STATUS_OPTIONS: WeekStatus[] = ["sold_out", "waitlist", "limited", "open", "unknown"];

async function signedUrlFor(path: string | null): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = await supabase.storage
    .from("mvs-screenshots")
    .createSignedUrl(path, 60 * 30);
  return data?.signedUrl ?? null;
}

export default function MVSQAQueue() {
  const { loading: roleLoading, isManager } = useIsManager();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<QueueRow[] | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [cityFilter, setCityFilter] = useState<string>("__all__");
  const [pending, setPending] = useState<Record<string, WeekStatus>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [screenshots, setScreenshots] = useState<Record<string, string | null>>({});
  const [allCities, setAllCities] = useState<string[]>([]);

  // Load the full city list from mvs_providers so the dropdown matches the
  // MVS table — not just cities that happen to have QA rows right now.
  useEffect(() => {
    if (!isManager) return;
    (async () => {
      const { data } = await supabase
        .from("mvs_providers")
        .select("city")
        .not("city", "is", null);
      const set = new Set<string>();
      for (const r of data ?? []) if (r.city) set.add(r.city);
      setAllCities(Array.from(set).sort((a, b) => a.localeCompare(b)));
    })();
  }, [isManager]);

  const load = useCallback(async () => {
    let q = supabase
      .from("mvs_qa_queue")
      .select("id, entity_id, entity_type, reason, confidence, resolved_at, created_at, diagnostics")
      .order("created_at", { ascending: false })
      .limit(500);
    if (!showResolved) q = q.is("resolved_at", null);
    const { data: qaData, error } = await q;
    if (error) {
      toast.error(`Failed to load queue: ${error.message}`);
      setRows([]);
      return;
    }

    const weekIds = (qaData ?? []).filter((r) => r.entity_type === "week").map((r) => r.entity_id);
    const providerIdsDirect = (qaData ?? [])
      .filter((r) => r.entity_type === "provider")
      .map((r) => r.entity_id);

    const { data: weeks } = weekIds.length
      ? await supabase
          .from("mvs_weeks")
          .select(
            "id, status, week_start, week_end, screenshot_url, source_url, confidence, provider_id",
          )
          .in("id", weekIds)
      : { data: [] as any[] };

    const allProviderIds = Array.from(
      new Set([
        ...providerIdsDirect,
        ...((weeks ?? []).map((w) => w.provider_id) as string[]),
      ]),
    );
    const { data: provs } = allProviderIds.length
      ? await supabase
          .from("mvs_providers")
          .select("id, name, city, website_url, url")
          .in("id", allProviderIds)
      : { data: [] as any[] };
    const provMap = new Map((provs ?? []).map((p: any) => [p.id, p]));
    const weekMap = new Map(
      (weeks ?? []).map((w: any) => [
        w.id,
        { ...w, provider: provMap.get(w.provider_id) ?? null } as WeekInfo,
      ]),
    );

    setRows(
      (qaData ?? []).map((r) => ({
        ...(r as QueueRow),
        week: r.entity_type === "week" ? weekMap.get(r.entity_id) ?? null : null,
        provider:
          r.entity_type === "provider" ? (provMap.get(r.entity_id) as ProviderInfo) ?? null : null,
      })),
    );
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

  // City list (filter dropdown) + per-city counts
  const cityCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) {
      const c = r.week?.provider?.city ?? r.provider?.city ?? "(unknown)";
      m.set(c, (m.get(c) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (!rows) return null;
    if (cityFilter === "__all__") return rows;
    return rows.filter((r) => {
      const c = r.week?.provider?.city ?? r.provider?.city ?? "(unknown)";
      return c === cityFilter;
    });
  }, [rows, cityFilter]);

  // Group filtered rows by provider id
  const grouped = useMemo(() => {
    type Group = {
      providerId: string;
      providerName: string;
      city: string;
      website: string | null;
      weekRows: QueueRow[];
      providerRow: QueueRow | null;
    };
    const map = new Map<string, Group>();
    for (const r of filteredRows ?? []) {
      const pid =
        r.entity_type === "week"
          ? r.week?.provider_id ?? `orphan-${r.id}`
          : r.entity_id;
      const prov = r.week?.provider ?? r.provider ?? null;
      const name = prov?.name ?? "(unknown provider)";
      const city = prov?.city ?? "(unknown)";
      const website = prov?.website_url ?? prov?.url ?? null;
      const g =
        map.get(pid) ??
        ({ providerId: pid, providerName: name, city, website, weekRows: [], providerRow: null } as Group);
      if (r.entity_type === "week") g.weekRows.push(r);
      else g.providerRow = r;
      map.set(pid, g);
    }
    return Array.from(map.values()).sort((a, b) => a.providerName.localeCompare(b.providerName));
  }, [filteredRows]);

  const openCount = useMemo(
    () => (filteredRows ?? []).filter((r) => r.resolved_at == null).length,
    [filteredRows],
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
    invalidateAllMvs(queryClient);
    load();
  };

  const handleUnresolve = useCallback(
    async (rowId: string) => {
      const { error } = await supabase.rpc("mvs_qa_unresolve" as never, { _queue_id: rowId } as never);
      if (error) {
        toast.error(`Undo failed: ${error.message}`);
        return;
      }
      toast.success("Re-opened");
      invalidateAllMvs(queryClient);
      load();
    },
    [load, queryClient],
  );

  const handleResolveOnly = async (row: QueueRow) => {
    setSavingId(row.id);
    const { data, error } = await supabase.rpc("mvs_qa_resolve", {
      _queue_id: row.id,
      _new_status: (row.week?.status ?? "unknown") as WeekStatus,
    });
    setSavingId(null);
    if (error) {
      console.error("[MVS QA] resolve failed", { row, error, data });
      toast.error(`Resolve failed: ${error.message || error.code || "unknown error"}`, {
        description: error.details || error.hint || undefined,
        duration: 8000,
      });
      return;
    }
    // Optimistically remove the row so the reviewer sees it disappear right away.
    setRows((prev) =>
      prev ? prev.map((r) => (r.id === row.id ? { ...r, resolved_at: new Date().toISOString() } : r)) : prev,
    );
    toast.success("✓ Marked resolved", {
      duration: 8000,
      action: {
        label: "Undo",
        onClick: () => handleUnresolve(row.id),
      },
    });
    invalidateAllMvs(queryClient);
    load();
  };

  const [rerunningProviderId, setRerunningProviderId] = useState<string | null>(null);
  const [rerunningCity, setRerunningCity] = useState(false);

  const rerunForProviders = useCallback(
    async (city: string, providerIds: string[], label: string) => {
      const { data, error } = await supabase.functions.invoke("mvs-extract-weeks", {
        body: { city, provider_ids: providerIds },
      });
      if (error) {
        toast.error(`Re-run failed: ${error.message}`, { duration: 8000 });
        return false;
      }
      const processed = (data as { providers_processed?: number } | null)?.providers_processed ?? 0;
      toast.success(`Re-extracted ${processed} provider${processed === 1 ? "" : "s"} for ${label}`);
      invalidateAllMvs(queryClient);
      await load();
      return true;
    },
    [load, queryClient],
  );

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

  const totalProviders = grouped.length;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-3">
        <Link
          to="/market-validation"
          className="inline-flex items-center gap-1 text-sm text-primary underline hover:no-underline"
        >
          ← Back to Market Validation
        </Link>
      </div>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">MVS QA Queue</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {openCount} open QA item{openCount === 1 ? "" : "s"} ·{" "}
            {totalProviders} provider{totalProviders === 1 ? "" : "s"}
            {cityFilter !== "__all__" ? ` · ${cityFilter}` : ` · ${cityCounts.length} cit${cityCounts.length === 1 ? "y" : "ies"} with issues`}
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            City:
            <Select value={cityFilter} onValueChange={(v) => setCityFilter(v)}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">
                  All MVS cities · {rows?.length ?? 0} QA item{(rows?.length ?? 0) === 1 ? "" : "s"}
                </SelectItem>
                {allCities.map((c) => {
                  const n = cityCounts.find(([cc]) => cc === c)?.[1] ?? 0;
                  return (
                    <SelectItem key={c} value={c}>
                      {c} · {n} QA
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
            />
            Show resolved
          </label>
        </div>
      </header>

      {rows == null ? (
        <div className="text-sm text-muted-foreground">Loading queue…</div>
      ) : grouped.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          Nothing to review. {showResolved ? "No resolved items either." : "All caught up."}
        </div>
      ) : (
        <ul className="space-y-6">
          {grouped.map((g) => (
            <li key={g.providerId} className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b pb-2">
                <div>
                  <div className="text-lg font-semibold">{g.providerName}</div>
                  <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2">
                    <span>{g.city}</span>
                    {g.website ? (
                      <>
                        <span>·</span>
                        <a
                          href={g.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-primary"
                        >
                          open provider website ↗
                        </a>
                      </>
                    ) : (
                      <>
                        <span>·</span>
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(
                            `${g.providerName} ${g.city} summer camp registration`,
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-primary"
                        >
                          search the web for this provider ↗
                        </a>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {g.providerRow && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className="rounded px-2 py-0.5 font-semibold cursor-help"
                          style={{ backgroundColor: "#fde68a", color: "#92400e" }}
                        >
                          provider issue
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-[12px] leading-relaxed">
                        The bot could not find a working registration page on this provider's website. Open the link on the left, check if a camp registration page exists, then click "Mark resolved" once you have fixed the URL or confirmed there is none.
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {g.weekRows.length > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className="rounded px-2 py-0.5 font-semibold cursor-help"
                          style={{ backgroundColor: "#fee2e2", color: "#a3142b" }}
                        >
                          {g.weekRows.length} week{g.weekRows.length === 1 ? "" : "s"} flagged
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-[12px] leading-relaxed">
                        The AI was less than 70% sure about the status it picked for these weeks (open / waitlist / sold out). A human needs to look at the evidence page or screenshot and confirm or correct it.
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>

              {/* Provider-level issue (no weeks extracted) */}
              {g.providerRow && (
                <div
                  className="mb-3 rounded border bg-amber-50/40 p-3 text-sm"
                  style={{ opacity: g.providerRow.resolved_at ? 0.55 : 1 }}
                >
                  <div className="text-foreground">
                    <span className="font-medium">Why flagged: </span>
                    {g.providerRow.reason ?? "extraction returned 0 weeks"}
                  </div>

                  {/* Diagnostics: which URLs the bot actually tried */}
                  {(() => {
                    const diag = g.providerRow!.diagnostics as Diagnostics;
                    if (!diag || (!diag.root_url && (!diag.tried || diag.tried.length === 0))) {
                      return (
                        <div className="mt-2 text-xs italic text-muted-foreground">
                          Diagnostics weren't captured for this row. Re-run the pipeline for this city to record what the bot tried.
                        </div>
                      );
                    }
                    return (
                      <div className="mt-3 rounded border bg-white/70 p-2 text-xs">
                        {diag.root_url && (
                          <div className="mb-2">
                            <span className="font-semibold">Bot started at: </span>
                            <a
                              href={diag.root_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline break-all"
                            >
                              {diag.root_url} ↗
                            </a>
                          </div>
                        )}
                        {diag.tried && diag.tried.length > 0 ? (
                          <div>
                            <div className="mb-1 font-semibold">Pages the bot tried ({diag.tried.length}):</div>
                            <ul className="space-y-1">
                              {diag.tried.map((t, i) => {
                                const isUrl = t.url && /^https?:\/\//i.test(t.url);
                                return (
                                  <li key={i} className="leading-snug">
                                    <span
                                      className="mr-1 inline-block rounded px-1 text-[10px] font-semibold uppercase"
                                      style={{
                                        backgroundColor: t.ok ? "#dcfce7" : "#fee2e2",
                                        color: t.ok ? "#166534" : "#991b1b",
                                      }}
                                    >
                                      {t.step}
                                    </span>
                                    {isUrl ? (
                                      <a
                                        href={t.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary underline break-all"
                                      >
                                        {t.url}
                                      </a>
                                    ) : (
                                      <span className="break-all">{t.url}</span>
                                    )}
                                    {t.note && (
                                      <span className="text-muted-foreground"> — {t.note}</span>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ) : null}
                        {diag.error && (
                          <div className="mt-2">
                            <span className="font-semibold">Final result: </span>
                            <span className="text-red-700">{diag.error}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {g.providerRow.resolved_at ? (
                    <div className="mt-2 text-xs font-medium text-green-700">
                      ✓ Resolved
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center gap-3">
                      <Button
                        size="sm"
                        onClick={() => handleResolveOnly(g.providerRow!)}
                        disabled={savingId === g.providerRow.id}
                      >
                        {savingId === g.providerRow.id ? "Saving…" : "Mark resolved"}
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Resolve after re-running extraction or fixing the provider's website URL.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Week-level rows */}
              {g.weekRows.length > 0 && (
                <ul className="space-y-3">
                  {g.weekRows.map((row) => {
                    const w = row.week;
                    const screenshot = screenshots[row.id];
                    const selected =
                      pending[row.id] ?? (w?.status as WeekStatus | undefined) ?? "unknown";
                    const isResolved = row.resolved_at != null;
                    return (
                      <li
                        key={row.id}
                        className="rounded border p-3"
                        style={{ opacity: isResolved ? 0.6 : 1 }}
                      >
                        <div className="grid gap-3 md:grid-cols-[1fr,220px]">
                          <div className="space-y-1 text-sm">
                            <div className="text-muted-foreground">
                              Week {w?.week_start ?? "?"}
                              {w?.week_end ? ` → ${w.week_end}` : ""}
                            </div>
                            <div>
                              <span className="text-muted-foreground">AI guessed: </span>
                              <span className="font-medium">{w?.status ?? "—"}</span>
                              {w?.confidence != null && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-muted-foreground cursor-help">
                                      {" "}
                                      (AI certainty: {Math.round((w.confidence ?? 0) * 100)}%)
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs text-[12px] leading-relaxed">
                                    This is the AI model's own self-rated certainty for the week status it guessed. Anything under 70% lands in this queue for a human to confirm.
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            {row.reason && (
                              <div className="text-muted-foreground">
                                <span className="font-medium text-foreground">Reason:</span>{" "}
                                {row.reason}
                              </div>
                            )}
                            {w?.source_url && (
                              <div className="break-all text-xs">
                                <span className="text-muted-foreground">Evidence page: </span>
                                <a
                                  href={w.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary underline"
                                >
                                  {w.source_url}
                                </a>
                                {!/\/(camp|class|enroll|register|book|summer|schedule|session)/i.test(
                                  w.source_url,
                                ) && (
                                  <span
                                    className="ml-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold"
                                    style={{ backgroundColor: "#fef3c7", color: "#92400e" }}
                                    title="This URL looks like the provider homepage, not a camp/registration/schedule page. Re-run extraction to try to find the exact page."
                                  >
                                    weak evidence URL
                                  </span>
                                )}
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
                              <div className="flex h-24 items-center justify-center rounded border bg-muted text-xs text-muted-foreground">
                                No screenshot
                              </div>
                            )}
                          </div>
                        </div>

                        {!isResolved && (
                          <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-2">
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
            </li>
          ))}
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
