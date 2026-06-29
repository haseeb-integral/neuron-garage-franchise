import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Download, ExternalLink, Loader2, MapPin, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useProviderEvidence, type EvidenceRow } from "@/lib/mvs/useProviderEvidence";
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

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return rows.filter((r) => {
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
  }, [rows, q, queryFilter, keptFilter]);

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
    ];
    const lines = [headers.join(",")];
    for (const r of filtered) {
      const kept = priceKept(r);
      const sourceUrl =
        r.matched_provider_entry?.url || r.source_listing_url || r.url || "";
      lines.push(
        [
          csvEscape(r.name),
          csvEscape(r.city),
          csvEscape(r.tier),
          csvEscape(r.category_classified || r.category_raw),
          csvEscape(r.price_min),
          csvEscape(r.price_max),
          csvEscape(kept.label),
          csvEscape(r.matched_query?.query ?? ""),
          csvEscape(r.matched_query?.source_type ?? ""),
          csvEscape(sourceUrl),
          csvEscape(r.website_url),
          csvEscape("Phase 2"),
          csvEscape(r.created_at),
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
        <div className="ml-auto text-[11px]" style={{ color: MUTED }}>
          {loading
            ? "Loading…"
            : `${filtered.length} of ${rows.length} provider${rows.length === 1 ? "" : "s"}`}
          {runCreatedAt && (
            <span className="ml-2">
              · Debug from run {new Date(runCreatedAt).toLocaleString()}
            </span>
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
              {filtered.map((r) => {
                const kept = priceKept(r);
                const sourceUrl =
                  r.matched_provider_entry?.url || r.source_listing_url || r.url || null;
                return (
                  <tr
                    key={r.id}
                    className="cursor-pointer align-top hover:bg-[#f7faff]"
                    onClick={() => setSelected(r)}
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
                      {r.platform === "tavily_lead_v1" || r.tavily_pilot_entry?.extraction_method === "tavily_lead_v1"
                        ? "Phase 4 (Tavily)"
                        : r.platform === "tavily_fallback_firecrawl" || r.tavily_pilot_entry
                        ? "Phase 4 (Fallback)"
                        : r.matched_query
                        ? "Phase 2"
                        : "—"}
                    </td>
                    <td className="border-b px-3 py-2" style={{ borderColor: BORDER }}>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {r.platform === "tavily_lead_v1" || r.tavily_pilot_entry?.extraction_method === "tavily_lead_v1" ? (
                          <span
                            className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide"
                            style={{ backgroundColor: "#dcfce7", color: "#166534" }}
                            title="Verified literal match against page content"
                          >
                            tavily_lead_v1
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
  const sourcesArr = Array.isArray(row?.sources) ? (row?.sources as unknown[]) : [];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        {row && (
          <>
            <SheetHeader>
              <SheetTitle style={{ color: NAVY }}>{row.name || "Unnamed provider"}</SheetTitle>
              <SheetDescription>
                {row.tier ? `${row.tier} · ` : ""}
                {row.category_classified || row.category_raw || "Uncategorized"} · {row.city}
              </SheetDescription>
            </SheetHeader>

            <Section title="Provider basics">
              <KV label="Price/wk" value={fmtPrice(row.price_min, row.price_max)} />
              <KV label="Confidence" value={row.confidence != null ? row.confidence.toFixed(2) : "—"} />
              <KV
                label="Website"
                value={
                  row.website_url ? (
                    <a
                      href={row.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold"
                      style={{ color: BLUE }}
                    >
                      {row.website_url} <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
              <KV
                label="Discovered"
                value={new Date(row.created_at).toLocaleString()}
              />
              <KV
                label="Last seen"
                value={new Date(row.updated_at || row.created_at).toLocaleString()}
              />
            </Section>

            <Section title="Source query">
              {q ? (
                <>
                  <div
                    className="mb-2 rounded-md border p-2 text-[12px]"
                    style={{ borderColor: BORDER, backgroundColor: SOFT, color: NAVY }}
                  >
                    “{q.query}”
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <KV label="Source type" value={q.source_type || "—"} />
                    <KV label="Raw results" value={q.raw_results_returned ?? "—"} />
                    <KV label="Providers extracted" value={q.providers_extracted ?? "—"} />
                    <KV label="Prices kept" value={q.prices_kept ?? "—"} />
                    <KV
                      label="$ amounts seen in source"
                      value={q.raw_dollar_amounts_in_source ?? "—"}
                    />
                    <KV
                      label="Prices dropped by guard"
                      value={(q.prices_dropped_by_guard ?? []).length}
                    />
                  </div>
                  {q.top_urls && q.top_urls.length > 0 && (
                    <div className="mt-3">
                      <div
                        className="mb-1 text-[10px] font-bold uppercase tracking-wide"
                        style={{ color: MUTED }}
                      >
                        Top URLs from this query
                      </div>
                      <ul className="space-y-0.5 text-[12px]">
                        {q.top_urls.slice(0, 5).map((u) => (
                          <li key={u} className="truncate">
                            <a
                              href={u}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1"
                              style={{ color: BLUE }}
                              title={u}
                            >
                              {u} <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-[12px]" style={{ color: MUTED }}>
                  No per-query debug data for this provider. It was discovered before the debug
                  capture was enabled, or surfaced by a source we don't yet log per-query.
                </div>
              )}
            </Section>

            <Section title="Guard result">
              {(() => {
                const hasPrice = row.price_min != null || row.price_max != null;
                if (hasPrice) {
                  return (
                    <div
                      className="rounded-md border p-2 text-[12px]"
                      style={{ borderColor: "#cfead8", backgroundColor: "#e7f7ee", color: GREEN }}
                    >
                      Price kept: <strong>{fmtPrice(row.price_min, row.price_max)}</strong>. The
                      value appears literally in the source markdown (±$2 tolerance).
                    </div>
                  );
                }
                if (row.guard_drop.length > 0) {
                  return (
                    <div
                      className="rounded-md border p-2 text-[12px]"
                      style={{ borderColor: "#f4d8a8", backgroundColor: "#fff7e8", color: AMBER }}
                    >
                      Guard dropped Gemini's price guess because the literal number could not be
                      found in the source markdown:
                      <ul className="mt-1 list-disc pl-4">
                        {row.guard_drop.map((d, i) => (
                          <li key={i}>
                            <code>{d.field}</code> = {d.value ?? "null"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                }
                return (
                  <div className="text-[12px]" style={{ color: MUTED }}>
                    No price was extracted for this provider. Pricing may be on the provider's own
                    website rather than the listing page (Phase 4 target).
                  </div>
                );
              })()}
            </Section>

            {row.tavily_pilot_entry && (
              <Section title="Phase 4 Verification Details">
                <div
                  className="rounded-md border p-2 text-[12px]"
                  style={{
                    borderColor:
                      row.tavily_pilot_entry.extraction_method === "tavily_lead_v1" ? "#cfead8" : BORDER,
                    backgroundColor:
                      row.tavily_pilot_entry.extraction_method === "tavily_lead_v1" ? "#e7f7ee" : SOFT,
                    color: NAVY,
                  }}
                >
                  <div className="mb-1 font-semibold">
                    Extraction Method:{" "}
                    <span className="font-mono">
                      {row.tavily_pilot_entry.extraction_method || "fallback"}
                    </span>
                  </div>
                  {row.tavily_pilot_entry.tavily_answer && (
                    <div className="mb-2 text-[11px] italic" style={{ color: MUTED }}>
                      Tavily AI Summary: “{row.tavily_pilot_entry.tavily_answer}”
                    </div>
                  )}
                  {row.tavily_pilot_entry.snippet_around_price && (
                    <div className="mt-1 border-t pt-1 font-mono text-[11px]">
                      Verified Page Text: “{row.tavily_pilot_entry.snippet_around_price}”
                    </div>
                  )}
                </div>
              </Section>
            )}

            <Section title="Evidence (saved sources)">
              {sourceUrl && (
                <div className="mb-2 text-[12px]">
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold"
                    style={{ color: BLUE }}
                  >
                    Open source listing <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              <div className="mb-2">
                <ProviderScreenshotButton
                  providerId={row.id}
                  providerName={row.name}
                  variant="link"
                />
              </div>
              {sourcesArr.length > 0 && (
                <details>
                  <summary
                    className="cursor-pointer text-[11px] font-semibold"
                    style={{ color: BLUE }}
                  >
                    Raw sources ({sourcesArr.length})
                  </summary>
                  <pre
                    className="mt-1 max-h-64 overflow-auto rounded-md border p-2 text-[10px]"
                    style={{ borderColor: BORDER, backgroundColor: SOFT, color: NAVY }}
                  >
                    {JSON.stringify(sourcesArr, null, 2)}
                  </pre>
                </details>
              )}
            </Section>

            <Section title="Verification">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-block rounded px-2 py-0.5 text-[11px] font-semibold"
                  style={{ backgroundColor: "#eef2f7", color: MUTED }}
                >
                  Needs review
                </span>
                <button
                  type="button"
                  disabled
                  className="rounded border px-2 py-1 text-[11px] font-semibold opacity-50"
                  style={{ borderColor: BORDER, color: MUTED }}
                  title="Coming in next phase"
                >
                  Verify
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded border px-2 py-1 text-[11px] font-semibold opacity-50"
                  style={{ borderColor: BORDER, color: MUTED }}
                  title="Coming in next phase"
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded border px-2 py-1 text-[11px] font-semibold opacity-50"
                  style={{ borderColor: BORDER, color: MUTED }}
                  title="Coming in next phase"
                >
                  Edit price
                </button>
              </div>
              <p className="mt-2 text-[11px]" style={{ color: MUTED }}>
                Actions are read-only in this phase. The verification table will land in a follow-up
                phase.
              </p>
            </Section>
          </>
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
