import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Download, ExternalLink, Loader2, MapPin, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useProviderEvidence, type EvidenceRow } from "@/lib/mvs/useProviderEvidence";
import { classifyExclusion } from "@/lib/mvs/classifyExclusion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ProviderScreenshotButton } from "@/components/phase2-demo/ProviderScreenshotButton";

const NAVY = "#07142f";
const MUTED = "#526078";
const BORDER = "#eef2f7";
const SOFT = "#f7faff";
const BLUE = "#174be8";
const AMBER = "#b45309";
const GREEN = "#0f7b3f";

function fmtPrice(min: number | null | undefined, max: number | null | undefined) {
  if (min == null && max == null) return "—";
  if (min != null && max != null && min !== max) return `$${min}–$${max}`;
  return `$${min ?? max}`;
}

function csvEscape(v: unknown) {
  if (v == null) return "";
  const s = String(v).replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

function priceKept(r: EvidenceRow): { label: string; tone: "kept" | "dropped" | "none" } {
  const hasPrice = r.price_min != null || r.price_max != null;
  if (hasPrice) return { label: "Kept", tone: "kept" };
  if (r.guard_drop && r.guard_drop.length > 0) return { label: "Dropped by guard", tone: "dropped" };
  return { label: "No price found", tone: "none" };
}

export default function ProviderEvidence() {
  const [params] = useSearchParams();
  const city = params.get("city") ?? "";
  const state = params.get("state") ?? "";
  const cityKey = state ? `${city}, ${state}` : city;

  const { rows, queries, runCreatedAt, loading, error } = useProviderEvidence(cityKey);

  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<EvidenceRow | null>(null);
  const [queryFilter, setQueryFilter] = useState<string>("all");
  const [keptFilter, setKeptFilter] = useState<string>("all");
  const [showExcluded, setShowExcluded] = useState(false);

  // Strict Camp View — tag each row with its exclusion reason (or null).
  const rowsWithExclusion = useMemo(
    () => rows.map((r) => ({ row: r, exclusion: classifyExclusion(r) })),
    [rows],
  );
  const activeCount = useMemo(
    () => rowsWithExclusion.filter((x) => x.exclusion === null).length,
    [rowsWithExclusion],
  );
  const excludedBreakdown = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of rowsWithExclusion) {
      if (x.exclusion) m.set(x.exclusion.label, (m.get(x.exclusion.label) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [rowsWithExclusion]);
  const excludedTotal = rows.length - activeCount;

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return rowsWithExclusion
      .filter((x) => (showExcluded ? true : x.exclusion === null))
      .filter(({ row: r }) => {
        if (queryFilter !== "all") {
          if (queryFilter === "__none__") {
            if (r.matched_query) return false;
          } else if (r.matched_query?.query !== queryFilter) {
            return false;
          }
        }
        const k = priceKept(r).tone;
        if (keptFilter !== "all" && k !== keptFilter) return false;
        if (!ql) return true;
        const cat = r.category_classified || r.category_raw || "";
        return (
          (r.name ?? "").toLowerCase().includes(ql) ||
          cat.toLowerCase().includes(ql) ||
          (r.source_listing_url ?? "").toLowerCase().includes(ql) ||
          (r.website_url ?? "").toLowerCase().includes(ql) ||
          (r.matched_query?.query ?? "").toLowerCase().includes(ql)
        );
      });
  }, [rowsWithExclusion, q, queryFilter, keptFilter, showExcluded]);

  const exportCsv = () => {
    const headers = [
      "name",
      "city",
      "tier",
      "category",
      "price_min",
      "price_max",
      "kept_or_dropped",
      "source_query",
      "source_type",
      "source_url",
      "website_url",
      "extraction_phase",
      "discovered_at",
      "exclusion_reason",
    ];
    const lines = [headers.join(",")];
    for (const { row: r, exclusion } of filtered) {
      const kept = priceKept(r);
      // Prefer the matched Google query when present. Otherwise fall back to
      // the provider's discovery platform (e.g. "sawyer") and its listing /
      // website URL so older Sawyer-imported rows still show provenance in
      // the export instead of empty cells.
      const sourceQuery = r.matched_query?.query ?? "";
      const sourceType =
        r.matched_query?.source_type ?? (r as any).platform ?? "";
      const sourceUrl =
        r.matched_provider_entry?.url ||
        r.source_listing_url ||
        r.url ||
        r.website_url ||
        "";
      lines.push(
        [
          csvEscape(r.name),
          csvEscape(r.city),
          csvEscape(r.tier),
          csvEscape(r.category_classified || r.category_raw),
          csvEscape(r.price_min),
          csvEscape(r.price_max),
          csvEscape(kept.label),
          csvEscape(sourceQuery),
          csvEscape(sourceType),
          csvEscape(sourceUrl),
          csvEscape(r.website_url),
          csvEscape("Phase 2"),
          csvEscape(r.created_at),
          csvEscape(exclusion?.reason ?? ""),
        ].join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evidence-${cityKey.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const uniqueQueries = useMemo(
    () => Array.from(new Set(queries.map((q) => q.query))).sort(),
    [queries]
  );

  return (
    <>
      <PageHeader
        title="Provider Evidence Review"
        subtitle={
          cityKey
            ? `Read-only audit of providers and the source queries that surfaced them for ${cityKey}.`
            : "Read-only audit of providers and the source queries that surfaced them."
        }
        hideJourneyBar
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Link
          to="/market-validation"
          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold"
          style={{ borderColor: BORDER, color: BLUE, backgroundColor: "#fff" }}
        >
          <ArrowLeft className="h-3 w-3" /> Back to Market Validation
        </Link>
        <div className="inline-flex items-center gap-1 text-[12px]" style={{ color: NAVY }}>
          <MapPin className="h-3.5 w-3.5" style={{ color: BLUE }} />
          <strong>{city || "—"}</strong>
          {state && <span style={{ color: MUTED }}>, {state}</span>}
        </div>
        <div className="ml-auto flex items-center gap-2 text-[11px]" style={{ color: MUTED }}>
          {loading ? (
            "Loading…"
          ) : showExcluded ? (
            <span>
              {activeCount} active + {excludedTotal} excluded = {rows.length} shown
            </span>
          ) : (
            <>
              <span>
                {filtered.length} of {activeCount} active camps
              </span>
              {excludedTotal > 0 && (
                <span
                  className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{ backgroundColor: "#eef2f7", color: MUTED }}
                  title={excludedBreakdown.map(([l, n]) => `${l}: ${n}`).join(" · ")}
                >
                  +{excludedTotal} excluded (hidden)
                </span>
              )}
            </>
          )}
          {runCreatedAt && (
            <span>· Debug from run {new Date(runCreatedAt).toLocaleString()}</span>
          )}
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={loading || filtered.length === 0}
          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: BLUE }}
        >
          <Download className="h-3 w-3" /> Export CSV
        </button>
      </div>

      {queries.length === 0 && !loading && rows.length > 0 && (
        <div
          className="mb-3 rounded-md border p-3 text-[12px]"
          style={{ borderColor: "#fde6c0", backgroundColor: "#fff7e8", color: AMBER }}
        >
          No per-query debug data found for this city. The Source query column will show "—". Re-run
          the pipeline with the latest discover function to capture debug data.
        </div>
      )}

      <div
        className="mb-3 flex flex-wrap items-center gap-2 rounded-md border p-2"
        style={{ borderColor: BORDER, backgroundColor: SOFT }}
      >
        <div className="relative">
          <Search
            className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2"
            style={{ color: MUTED }}
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, category, URL, query…"
            className="w-[280px] rounded-md border bg-white py-1 pl-7 pr-2 text-[12px]"
            style={{ borderColor: BORDER, color: NAVY }}
          />
        </div>
        <select
          value={queryFilter}
          onChange={(e) => setQueryFilter(e.target.value)}
          className="rounded-md border bg-white px-2 py-1 text-[12px]"
          style={{ borderColor: BORDER, color: NAVY }}
          title="Filter by the Google query that surfaced the provider"
        >
          <option value="all">All source queries</option>
          <option value="__none__">No matched query</option>
          {uniqueQueries.map((qq) => (
            <option key={qq} value={qq}>
              {qq.length > 60 ? qq.slice(0, 60) + "…" : qq}
            </option>
          ))}
        </select>
        <select
          value={keptFilter}
          onChange={(e) => setKeptFilter(e.target.value)}
          className="rounded-md border bg-white px-2 py-1 text-[12px]"
          style={{ borderColor: BORDER, color: NAVY }}
        >
          <option value="all">All prices</option>
          <option value="kept">Price kept</option>
          <option value="dropped">Dropped by guard</option>
          <option value="none">No price found</option>
        </select>
        <label
          className="ml-auto inline-flex items-center gap-1.5 text-[12px]"
          style={{ color: NAVY }}
          title="When ticked, the excluded non-camp locations (daycares, parks, retail workshops, charity drop-in clubs) are added below the active camps. When unticked, only active camps are shown."
        >
          <input
            type="checkbox"
            checked={showExcluded}
            onChange={(e) => setShowExcluded(e.target.checked)}
          />
          Include excluded locations
          {excludedTotal > 0 && (
            <span style={{ color: MUTED }}>(+{excludedTotal})</span>
          )}
        </label>
      </div>

      {error && (
        <div
          className="mb-3 rounded-md border p-3 text-[12px]"
          style={{ borderColor: "#f5c2cd", backgroundColor: "#fce7ec", color: "#a3142b" }}
        >
          Failed to load evidence: {error}
        </div>
      )}

      {loading ? (
        <div
          className="flex items-center gap-2 rounded-md border bg-white p-6 text-[12px]"
          style={{ borderColor: BORDER, color: MUTED }}
        >
          <Loader2 className="h-4 w-4 animate-spin" /> Loading evidence for {cityKey}…
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-md border bg-white p-6 text-[12px]"
          style={{ borderColor: BORDER, color: MUTED }}
        >
          No providers found for {cityKey}. Try running the pipeline from the scoring console.
        </div>
      ) : (
        <div className="overflow-auto rounded-md border bg-white" style={{ borderColor: BORDER }}>
          <table className="w-full border-collapse text-[12px]">
            <thead style={{ backgroundColor: SOFT, color: NAVY }}>
              <tr>
                <th className="border-b px-3 py-2 text-left font-semibold" style={{ borderColor: BORDER }}>
                  Provider
                </th>
                <th className="border-b px-3 py-2 text-left font-semibold" style={{ borderColor: BORDER }}>
                  Category
                </th>
                <th className="border-b px-3 py-2 text-left font-semibold" style={{ borderColor: BORDER }}>
                  Source query
                </th>
                <th className="border-b px-3 py-2 text-left font-semibold" style={{ borderColor: BORDER }}>
                  Source type
                </th>
                <th className="border-b px-3 py-2 text-left font-semibold" style={{ borderColor: BORDER }}>
                  Source URL
                </th>
                <th className="border-b px-3 py-2 text-right font-semibold" style={{ borderColor: BORDER }}>
                  Price/wk
                </th>
                <th className="border-b px-3 py-2 text-left font-semibold" style={{ borderColor: BORDER }}>
                  Kept / dropped
                </th>
                <th className="border-b px-3 py-2 text-left font-semibold" style={{ borderColor: BORDER }}>
                  Phase
                </th>
                <th className="border-b px-3 py-2 text-left font-semibold" style={{ borderColor: BORDER }}>
                  Verification
                </th>
                <th className="border-b px-3 py-2 text-right font-semibold" style={{ borderColor: BORDER }}>
                  Last seen
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ row: r, exclusion }) => {
                const kept = priceKept(r);
                const sourceUrl =
                  r.matched_provider_entry?.url || r.source_listing_url || r.url || null;
                return (
                  <tr
                    key={r.id}
                    className="cursor-pointer align-top hover:bg-[#f7faff]"
                    onClick={() => setSelected(r)}
                    style={exclusion ? { backgroundColor: "#fafafa" } : undefined}
                  >
                    <td
                      className="border-b px-3 py-2 font-semibold"
                      style={{ borderColor: BORDER, color: NAVY }}
                    >
                      {r.name || "—"}
                      {r.tier && (
                        <div className="text-[10px] font-normal" style={{ color: MUTED }}>
                          {r.tier}
                        </div>
                      )}
                    </td>
                    <td className="border-b px-3 py-2" style={{ borderColor: BORDER, color: NAVY }}>
                      {r.category_classified || r.category_raw || "—"}
                    </td>
                    <td
                      className="border-b px-3 py-2"
                      style={{ borderColor: BORDER, color: NAVY, maxWidth: 260 }}
                    >
                      {r.matched_query?.query ? (
                        <span title={r.matched_query.query}>
                          {r.matched_query.query.length > 70
                            ? r.matched_query.query.slice(0, 70) + "…"
                            : r.matched_query.query}
                        </span>
                      ) : (
                        <span style={{ color: MUTED }}>—</span>
                      )}
                    </td>
                    <td className="border-b px-3 py-2" style={{ borderColor: BORDER, color: MUTED }}>
                      {r.matched_query?.source_type || "—"}
                    </td>
                    <td className="border-b px-3 py-2" style={{ borderColor: BORDER }}>
                      {sourceUrl ? (
                        <a
                          href={sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1"
                          style={{ color: BLUE }}
                          title={sourceUrl}
                        >
                          Open <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span style={{ color: MUTED }}>—</span>
                      )}
                    </td>
                    <td
                      className="border-b px-3 py-2 text-right tabular-nums"
                      style={{ borderColor: BORDER, color: NAVY }}
                    >
                      {fmtPrice(r.price_min, r.price_max)}
                    </td>
                    <td className="border-b px-3 py-2" style={{ borderColor: BORDER }}>
                      <span
                        className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{
                          backgroundColor:
                            kept.tone === "kept"
                              ? "#e7f7ee"
                              : kept.tone === "dropped"
                              ? "#fff1d6"
                              : "#eef2f7",
                          color:
                            kept.tone === "kept"
                              ? GREEN
                              : kept.tone === "dropped"
                              ? AMBER
                              : MUTED,
                        }}
                        title={
                          kept.tone === "dropped" && r.guard_drop.length > 0
                            ? `Guard dropped: ${r.guard_drop
                                .map((d) => `${d.field}=${d.value}`)
                                .join(", ")}`
                            : undefined
                        }
                      >
                        {kept.label}
                      </span>
                    </td>
                    <td className="border-b px-3 py-2" style={{ borderColor: BORDER, color: MUTED }}>
                      {r.matched_query ? "Phase 2" : "—"}
                    </td>
                    <td className="border-b px-3 py-2" style={{ borderColor: BORDER }}>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {exclusion ? (
                          <span
                            className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold"
                            style={{ backgroundColor: "#eef2f7", color: MUTED }}
                            title={exclusion.reason}
                          >
                            Excluded — {exclusion.label}
                          </span>
                        ) : (
                          <span
                            className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold"
                            style={{ backgroundColor: "#eef2f7", color: MUTED }}
                          >
                            Needs review
                          </span>
                        )}
                        <button
                          type="button"
                          disabled
                          className="rounded border px-1.5 py-0.5 text-[10px] font-semibold opacity-50"
                          style={{ borderColor: BORDER, color: MUTED }}
                          title="Coming in next phase"
                        >
                          Verify
                        </button>
                        <button
                          type="button"
                          disabled
                          className="rounded border px-1.5 py-0.5 text-[10px] font-semibold opacity-50"
                          style={{ borderColor: BORDER, color: MUTED }}
                          title="Coming in next phase"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                    <td
                      className="border-b px-3 py-2 text-right"
                      style={{ borderColor: BORDER, color: MUTED }}
                    >
                      {new Date(r.updated_at || r.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-[11px]" style={{ color: MUTED }}>
        Click any row to open the full evidence panel. Verify / Reject / Edit actions are still
        read-only and will be wired up in a later phase.
      </p>

      <EvidenceDrawer row={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function EvidenceDrawer({ row, onClose }: { row: EvidenceRow | null; onClose: () => void }) {
  const open = !!row;
  const q = row?.matched_query ?? null;
  const entry = row?.matched_provider_entry ?? null;
  const sourceUrl = entry?.url || row?.source_listing_url || row?.url || null;
  const hasPrice = row?.price_min != null || row?.price_max != null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        {row && (
          <div className="space-y-6">
            <SheetHeader>
              <SheetTitle className="text-xl font-bold" style={{ color: NAVY }}>
                {row.name || "Unnamed Camp"}
              </SheetTitle>
              <SheetDescription className="text-xs font-medium uppercase tracking-wide">
                {row.tier ? `${row.tier} · ` : ""}
                {row.category_classified || row.category_raw || "Camp"} · {row.city}
              </SheetDescription>
            </SheetHeader>

            {/* Section 1: Tuition Truth */}
            <div className="rounded-xl border p-4 bg-[#f8fafe]" style={{ borderColor: BORDER }}>
              <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: MUTED }}>
                Weekly Tuition Truth
              </div>
              <div className="text-2xl font-black mb-2" style={{ color: NAVY }}>
                {fmtPrice(row.price_min, row.price_max)}
                {hasPrice && <span className="text-xs font-normal ml-2 text-[#526078]">/ week</span>}
              </div>

              {hasPrice ? (
                <div className="text-xs text-[#0f7b3f] bg-[#e7f7ee] border border-[#cfead8] rounded-lg p-2.5 flex items-start gap-2">
                  <span className="font-bold shrink-0">✓ Verified:</span>
                  <span>This exact weekly tuition number was found literally in the camp's official listing or website text.</span>
                </div>
              ) : row.guard_drop.length > 0 ? (
                <div className="text-xs text-[#b45309] bg-[#fff7e8] border border-[#f4d8a8] rounded-lg p-2.5 flex items-start gap-2">
                  <span className="font-bold shrink-0">⚠ Blocked:</span>
                  <span>Our AI guessed a price, but our safety rule blocked it because the exact tuition dollar amount wasn't clearly written in the camp's public text.</span>
                </div>
              ) : (
                <div className="text-xs text-[#526078] bg-white border border-[#eef2f7] rounded-lg p-2.5">
                  No weekly tuition price found yet. Our targeted search will keep checking their official website and registration forms.
                </div>
              )}
            </div>

            {/* Section 2: Proof & Website */}
            <div className="space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: BLUE }}>
                Proof & Official Website
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {row.website_url ? (
                  <a
                    href={row.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-lg border bg-white p-3 text-xs font-bold shadow-sm transition-all hover:bg-[#f7faff] hover:border-[#174be8]"
                    style={{ borderColor: BORDER, color: BLUE }}
                  >
                    <span>Visit Camp Website</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <div className="flex items-center justify-center rounded-lg border border-dashed p-3 text-xs text-[#94a3b8] bg-[#f8fafe]">
                    No official website saved
                  </div>
                )}

                {sourceUrl ? (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-lg border bg-white p-3 text-xs font-bold shadow-sm transition-all hover:bg-[#f7faff] hover:border-[#174be8]"
                    style={{ borderColor: BORDER, color: BLUE }}
                  >
                    <span>{sourceUrl.includes("hisawyer.com") || sourceUrl.includes("enrollsy.com") ? "View Direct Booking & Pricing Link" : "View Exact Pricing Source Link"}</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <div className="flex items-center justify-center rounded-lg border border-dashed p-3 text-xs text-[#94a3b8] bg-[#f8fafe]">
                    No search link saved
                  </div>
                )}
              </div>

              <div className="pt-1">
                <ProviderScreenshotButton
                  providerId={row.id}
                  providerName={row.name}
                  variant="link"
                />
              </div>
            </div>

            {/* Section 3: How we searched */}
            <div className="space-y-2 pt-2 border-t" style={{ borderColor: BORDER }}>
              <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
                How We Discovered This Camp
              </div>
              <p className="text-xs leading-relaxed text-[#526078]">
                {(() => {
                  const plat = (row.platform || "").trim().toLowerCase();
                  const isSawyer = plat === "sawyer" || (sourceUrl || "").includes("hisawyer.com");
                  const isEnrollsy = plat === "enrollsy" || (sourceUrl || "").includes("enrollsy.com");
                  const isActivityHero = plat === "activityhero" || (sourceUrl || "").includes("activityhero.com");
                  const isMapsOrYelp = plat === "google_maps" || plat === "yelp" || plat === "maps";

                  if (isSawyer) {
                    const linkText = sourceUrl ? ` Direct Sawyer booking link: ${sourceUrl}.` : "";
                    const priceText = hasPrice ? ` Verified tuition: ${fmtPrice(row.price_min, row.price_max)}/week.` : "";
                    return `Sawyer marketplace scan for ${row.city}.${linkText}${priceText}`;
                  }
                  if (isEnrollsy) {
                    const linkText = sourceUrl ? ` Direct Enrollsy feed link: ${sourceUrl}.` : "";
                    const priceText = hasPrice ? ` Verified tuition: ${fmtPrice(row.price_min, row.price_max)}/week.` : "";
                    return `Enrollsy registration feed scan for ${row.city}.${linkText}${priceText}`;
                  }
                  if (isActivityHero || isMapsOrYelp) {
                    const nicePlat = isActivityHero ? "ActivityHero" : plat === "yelp" ? "Yelp" : "Google Maps";
                    const linkText = sourceUrl ? ` Open link at ${sourceUrl}.` : "";
                    const priceText = hasPrice ? ` Verified tuition: ${fmtPrice(row.price_min, row.price_max)}/week.` : "";
                    return `${nicePlat} scan for ${row.city}.${linkText}${priceText}`;
                  }
                  if (sourceUrl && sourceUrl !== row.website_url) {
                    const priceText = hasPrice ? ` Verified tuition: ${fmtPrice(row.price_min, row.price_max)}/week.` : "";
                    return `Official website map & subpage pricing scan: discovered exact rate sheet at ${sourceUrl}.${priceText}`;
                  }
                  if (q && q.query) {
                    const linkUrl = row.website_url || sourceUrl;
                    const linkText = linkUrl ? ` Open link at ${linkUrl}.` : "";
                    const priceText = hasPrice ? ` Verified tuition: ${fmtPrice(row.price_min, row.price_max)}/week.` : "";
                    return `Google search: “${q.query}”.${linkText}${priceText}`;
                  }
                  return hasPrice
                    ? `We discovered this camp during our scan of ${row.city}. We checked their official web pages from start to finish and verified their exact weekly tuition rate.`
                    : `This camp was found during our market scan of ${row.city}, but after checking their web pages from start to finish, their exact weekly tuition fee wasn't listed publicly.`;
                })()}
              </p>
              <div className="flex items-center gap-4 text-[11px] text-[#8794ab] pt-1">
                <span>First found: {new Date(row.created_at).toLocaleDateString()}</span>
                <span>•</span>
                <span>Last checked: {new Date(row.updated_at || row.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Read-only notice */}
            <div className="rounded-lg bg-[#f1f5f9] p-3 text-[11px] text-[#64748b] text-center">
              Manual verify / reject override buttons are read-only and will land in a follow-up phase.
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4">
      <h3
        className="mb-2 text-[10px] font-bold uppercase tracking-wide"
        style={{ color: BLUE }}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="text-[12px]">
      <div className="text-[10px] uppercase tracking-wide" style={{ color: MUTED }}>
        {label}
      </div>
      <div style={{ color: NAVY }}>{value}</div>
    </div>
  );
}
