import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Download, ExternalLink, Loader2, MapPin, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { ProviderScreenshotButton } from "@/components/phase2-demo/ProviderScreenshotButton";

const NAVY = "#07142f";
const MUTED = "#526078";
const BORDER = "#eef2f7";
const SOFT = "#f7faff";
const BLUE = "#174be8";

type Provider = {
  id: string;
  city: string;
  name: string | null;
  platform: string | null;
  url: string | null;
  website_url: string | null;
  source_listing_url: string | null;
  price_min: number | null;
  price_max: number | null;
  category_raw: string | null;
  category_classified: string | null;
  tier: string | null;
  confidence: number | null;
  sources: unknown;
  created_at: string;
  updated_at: string;
};

function fmtPrice(min: number | null, max: number | null) {
  if (min == null && max == null) return "—";
  if (min != null && max != null && min !== max) return `$${min}–$${max}`;
  return `$${min ?? max}`;
}

function csvEscape(v: unknown) {
  if (v == null) return "";
  const s = String(v).replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

export default function CityCompetitors() {
  const [params] = useSearchParams();
  const city = params.get("city") ?? "";
  const state = params.get("state") ?? "";
  const cityKey = state ? `${city}, ${state}` : city;

  const [rows, setRows] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [sourceTypeFilter, setSourceTypeFilter] = useState<"all" | "ai_only" | "ai_hidden">("all");


  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      const { data, error } = await supabase
        .from("mvs_providers")
        .select("*")
        .eq("city", cityKey)
        .order("tier", { ascending: true })
        .order("name", { ascending: true });
      if (cancelled) return;
      if (error) setError(error.message);
      else setRows((data as Provider[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [cityKey]);

  const tiers = useMemo(
    () => Array.from(new Set(rows.map((r) => r.tier).filter(Boolean))) as string[],
    [rows]
  );
  const cats = useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => r.category_classified || r.category_raw).filter(Boolean))
      ) as string[],
    [rows]
  );

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (tierFilter !== "all" && r.tier !== tierFilter) return false;
      const c = r.category_classified || r.category_raw || "";
      if (catFilter !== "all" && c !== catFilter) return false;
      if (!ql) return true;
      return (
        (r.name ?? "").toLowerCase().includes(ql) ||
        (r.platform ?? "").toLowerCase().includes(ql) ||
        c.toLowerCase().includes(ql) ||
        (r.website_url ?? "").toLowerCase().includes(ql)
      );
    });
  }, [rows, q, tierFilter, catFilter]);

  const exportCsv = () => {
    const headers = [
      "name",
      "tier",
      "category",
      "platform",
      "price_min",
      "price_max",
      "website_url",
      "source_listing_url",
      "url",
      "confidence",
      "discovered_at",
      "updated_at",
    ];
    const lines = [headers.join(",")];
    for (const r of filtered) {
      lines.push(
        [
          csvEscape(r.name),
          csvEscape(r.tier),
          csvEscape(r.category_classified || r.category_raw),
          csvEscape(r.platform),
          csvEscape(r.price_min),
          csvEscape(r.price_max),
          csvEscape(r.website_url),
          csvEscape(r.source_listing_url),
          csvEscape(r.url),
          csvEscape(r.confidence),
          csvEscape(r.created_at),
          csvEscape(r.updated_at),
        ].join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `competitors-${cityKey.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="All competitors for this city"
        subtitle="Every provider the Market Validation pipeline has found in this city across all runs."
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
          {loading ? "Loading…" : `${filtered.length} of ${rows.length} provider${rows.length === 1 ? "" : "s"}`}
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

      <div
        className="mb-3 flex flex-wrap items-center gap-2 rounded-md border p-2"
        style={{ borderColor: BORDER, backgroundColor: SOFT }}
      >
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2" style={{ color: MUTED }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, platform, category, URL…"
            className="w-[260px] rounded-md border bg-white py-1 pl-7 pr-2 text-[12px]"
            style={{ borderColor: BORDER, color: NAVY }}
          />
        </div>
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="rounded-md border bg-white px-2 py-1 text-[12px]"
          style={{ borderColor: BORDER, color: NAVY }}
        >
          <option value="all">All tiers</option>
          {tiers.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="rounded-md border bg-white px-2 py-1 text-[12px]"
          style={{ borderColor: BORDER, color: NAVY }}
        >
          <option value="all">All categories</option>
          {cats.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-3 rounded-md border p-3 text-[12px]" style={{ borderColor: "#f5c2cd", backgroundColor: "#fce7ec", color: "#a3142b" }}>
          Failed to load providers: {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 rounded-md border bg-white p-6 text-[12px]" style={{ borderColor: BORDER, color: MUTED }}>
          <Loader2 className="h-4 w-4 animate-spin" /> Loading providers for {cityKey}…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border bg-white p-6 text-[12px]" style={{ borderColor: BORDER, color: MUTED }}>
          No providers found for {cityKey}. Try running the pipeline from the scoring console.
        </div>
      ) : (
        <div className="overflow-auto rounded-md border bg-white" style={{ borderColor: BORDER }}>
          <table className="w-full border-collapse text-[12px]">
            <thead style={{ backgroundColor: SOFT, color: NAVY }}>
              <tr>
                <th className="border-b px-3 py-2 text-left font-semibold" style={{ borderColor: BORDER }}>Name</th>
                <th className="border-b px-3 py-2 text-left font-semibold" style={{ borderColor: BORDER }}>Tier</th>
                <th className="border-b px-3 py-2 text-left font-semibold" style={{ borderColor: BORDER }}>Category</th>
                <th className="border-b px-3 py-2 text-left font-semibold" style={{ borderColor: BORDER }}>Platform</th>
                <th className="border-b px-3 py-2 text-right font-semibold" style={{ borderColor: BORDER }}>Price/wk</th>
                <th className="border-b px-3 py-2 text-left font-semibold" style={{ borderColor: BORDER }}>Website</th>
                <th className="border-b px-3 py-2 text-left font-semibold" style={{ borderColor: BORDER }}>Source listing</th>
                <th className="border-b px-3 py-2 text-left font-semibold" style={{ borderColor: BORDER }}>Proof</th>
                <th className="border-b px-3 py-2 text-right font-semibold" style={{ borderColor: BORDER }}>Discovered</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-[#f7faff]">
                  <td className="border-b px-3 py-2 align-top font-semibold" style={{ borderColor: BORDER, color: NAVY }}>
                    {r.name || "—"}
                  </td>
                  <td className="border-b px-3 py-2 align-top" style={{ borderColor: BORDER, color: NAVY }}>
                    {r.tier || "—"}
                  </td>
                  <td className="border-b px-3 py-2 align-top" style={{ borderColor: BORDER, color: NAVY }}>
                    {r.category_classified || r.category_raw || "—"}
                  </td>
                  <td className="border-b px-3 py-2 align-top" style={{ borderColor: BORDER, color: MUTED }}>
                    {r.platform || "—"}
                  </td>
                  <td className="border-b px-3 py-2 text-right align-top tabular-nums" style={{ borderColor: BORDER, color: NAVY }}>
                    {fmtPrice(r.price_min, r.price_max)}
                  </td>
                  <td className="border-b px-3 py-2 align-top" style={{ borderColor: BORDER }}>
                    {r.website_url ? (
                      <a href={r.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold" style={{ color: BLUE }}>
                        Visit <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span style={{ color: MUTED }}>—</span>
                    )}
                  </td>
                  <td className="border-b px-3 py-2 align-top" style={{ borderColor: BORDER }}>
                    {r.source_listing_url || r.url ? (
                      <a href={(r.source_listing_url || r.url) as string} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1" style={{ color: BLUE }}>
                        Listing <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span style={{ color: MUTED }}>—</span>
                    )}
                  </td>
                  <td className="border-b px-3 py-2 align-top" style={{ borderColor: BORDER }}>
                    <ProviderScreenshotButton providerId={r.id} providerName={r.name} variant="link" />
                  </td>
                  <td className="border-b px-3 py-2 text-right align-top" style={{ borderColor: BORDER, color: MUTED }}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
