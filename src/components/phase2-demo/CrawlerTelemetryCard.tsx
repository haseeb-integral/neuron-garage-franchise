import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

type P = {
  price_min: number | null;
  price_max: number | null;
  price_derived_from_brand?: boolean | null;
  ai_overview_snippet?: string | null;
  platform?: string | null;
};

const DIRECTORY_PLATFORMS = new Set([
  "sawyer",
  "activityhero",
  "campminder",
  "jumbula",
  "campbrain",
]);

/**
 * Small collapsible card that shows which crawler layer produced each price.
 * Purely client-derived from providers already loaded — no extra query.
 *
 * Buckets (in priority order per row):
 *   1. B3 AI Overview       → ai_overview_snippet is not null
 *   2. B1 Brand propagation → price_derived_from_brand = true
 *   3. B2 Directory         → platform in known directory set
 *   4. Direct (Steps 1–3)   → priced, none of the above
 *   5. Unpriced             → no price at all
 */
export function CrawlerTelemetryCard({
  providers,
  cityDisplay,
}: {
  providers: P[];
  cityDisplay: string;
}) {
  const [open, setOpen] = useState(false);

  const counts = useMemo(() => {
    let direct = 0;
    let brand = 0;
    let directory = 0;
    let ai = 0;
    let unpriced = 0;
    for (const p of providers) {
      const priced = (p.price_min ?? null) != null || (p.price_max ?? null) != null;
      if (!priced) {
        unpriced++;
        continue;
      }
      if (p.ai_overview_snippet) {
        ai++;
      } else if (p.price_derived_from_brand) {
        brand++;
      } else if (p.platform && DIRECTORY_PLATFORMS.has(p.platform.toLowerCase())) {
        directory++;
      } else {
        direct++;
      }
    }
    return { direct, brand, directory, ai, unpriced, total: providers.length };
  }, [providers]);

  const priced = counts.total - counts.unpriced;

  const rows: { key: string; label: string; hint: string; count: number; color: string }[] = [
    {
      key: "direct",
      label: "Steps 1–3 · Direct site / listing",
      hint: "Price scraped from the provider's own site, Sawyer/ActivityHero listing, or Google Maps.",
      count: counts.direct,
      color: "#1d6b32",
    },
    {
      key: "brand",
      label: "B1 · Brand propagation",
      hint: "Price copied from a sibling location of the same brand (e.g. School of Rock national median).",
      count: counts.brand,
      color: "#8a5a00",
    },
    {
      key: "directory",
      label: "B2 · Directory-first fallback",
      hint: "Found via a directory-scoped query when the provider's own site had no price.",
      count: counts.directory,
      color: "#174be8",
    },
    {
      key: "ai",
      label: "B3 · Google AI Overview",
      hint: "Extracted from the AI Overview / answer box at the top of a Google search.",
      count: counts.ai,
      color: "#6b21a8",
    },
  ];

  return (
    <div className="mt-3 rounded-lg border bg-white" style={{ borderColor: "#eef2f7" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown size={14} className="text-[#526078]" />
          ) : (
            <ChevronRight size={14} className="text-[#526078]" />
          )}
          <span className="text-[12px] font-bold text-[#07142f]">
            Crawler Fallback Telemetry
          </span>
          <span className="text-[11px] text-[#526078]">
            · {priced}/{counts.total} priced in {cityDisplay}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {rows.map((r) => (
            <span
              key={r.key}
              className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: `${r.color}14`, color: r.color }}
              title={r.label}
            >
              {r.key === "direct" ? "S1–3" : r.key.toUpperCase()} {r.count}
            </span>
          ))}
        </div>
      </button>

      {open && (
        <div className="border-t px-3 py-3" style={{ borderColor: "#eef2f7" }}>
          <p className="mb-2 text-[11px] leading-relaxed text-[#526078]">
            B3 runs first in the main pipeline. This card only shows the catch-up rescue pass.
          </p>
          <table className="w-full text-[12px]">
            <tbody>
              {rows.map((r) => {
                const pct = priced > 0 ? Math.round((r.count / priced) * 100) : 0;
                return (
                  <tr key={r.key} className="border-b last:border-b-0" style={{ borderColor: "#f3f5f9" }}>
                    <td className="py-1.5 pr-2">
                      <div className="font-semibold text-[#07142f]">{r.label}</div>
                      <div className="text-[11px] text-[#526078]">{r.hint}</div>
                    </td>
                    <td className="w-20 py-1.5 text-right tabular-nums" style={{ color: r.color }}>
                      <span className="font-black">{r.count}</span>
                      <span className="ml-1 text-[10px] text-[#526078]">
                        {priced > 0 ? `(${pct}%)` : ""}
                      </span>
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td className="py-1.5 pr-2 text-[#526078]">Unpriced (still empty)</td>
                <td className="w-20 py-1.5 text-right tabular-nums text-[#526078]">
                  <span className="font-black">{counts.unpriced}</span>
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-[11px] leading-relaxed text-[#526078]">
            If <strong>B1 / B2 / B3 = 0</strong>, the fallbacks did not fire this run — usually
            because Steps 1–3 already found a price, or the query returned no AI Overview / directory
            match. That is expected and not a bug.
          </p>
        </div>
      )}
    </div>
  );
}
