// Supporting source/trust panels rendered inside the city blow-up
// (LiveCityDeepDive). These exist so the main file stays readable while we
// add per-source provenance, week activity, and operator-match views.
import { ExternalLink, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { MvsProviderInput, MvsWeekInput } from "@/lib/mvs/computeMvs";

const NAVY = "#07142f";
const MUTED = "#526078";
const BORDER = "#eef2f7";
const SOFT = "#f7faff";
const BLUE = "#174be8";
const CHIP =
  "inline-flex items-center whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold";

// ---------------------------------------------------------------------------
// Per-card info popover
// ---------------------------------------------------------------------------

function providerLink(p: MvsProviderInput): string | null {
  return p.source_listing_url ?? p.website_url ?? p.url ?? null;
}

function SourceCard({
  label,
  value,
  valueColor,
  popoverTitle,
  popoverBody,
}: {
  label: string;
  value: React.ReactNode;
  valueColor?: string;
  popoverTitle: string;
  popoverBody: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-md border px-3 py-2"
      style={{ borderColor: BORDER, backgroundColor: SOFT }}
    >
      <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: NAVY }}>
        {label}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full p-0.5 text-[#526078] hover:bg-white hover:text-[#174be8]"
              aria-label={`More info about ${label}`}
            >
              <Info size={12} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 text-[12px]">
            <div className="mb-2 text-[13px] font-bold" style={{ color: NAVY }}>
              {popoverTitle}
            </div>
            <div style={{ color: NAVY }}>{popoverBody}</div>
          </PopoverContent>
        </Popover>
      </span>
      <span className="text-[13px] font-black tabular-nums" style={{ color: valueColor ?? BLUE }}>
        {value}
      </span>
    </div>
  );
}

function ProviderList({ items }: { items: MvsProviderInput[] }) {
  if (items.length === 0) {
    return <p className="text-[11px]" style={{ color: MUTED }}>No providers tagged.</p>;
  }
  return (
    <ul className="max-h-56 space-y-1 overflow-y-auto">
      {items.map((p) => {
        const href = providerLink(p);
        return (
          <li key={p.id} className="flex items-start justify-between gap-2">
            <span className="truncate">{p.name}</span>
            {href && (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center text-[#174be8] hover:underline"
                aria-label={`Open ${p.name}`}
              >
                <ExternalLink size={11} />
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// Short, human-friendly labels for `mvs_providers.sources[]` codes.
export const SOURCE_LABELS: Record<string, string> = {
  sawyer: "Sawyer",
  google_maps: "Google Maps",
  google_search: "Google Search",
  activityhero: "ActivityHero",
  yelp: "Yelp",
  manual: "Manual",
};

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "—";
  const diff = Date.now() - then;
  if (diff < 60_000) return "just now";
  const m = Math.round(diff / 60_000);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} hr ago`;
  const d = Math.round(h / 24);
  return `${d} d ago`;
}

// ---------------------------------------------------------------------------
// Data Sources strip (Item 3)
// ---------------------------------------------------------------------------

export function DataSourcesPanel({
  providers,
  weeks,
  watchlistCount,
  acsAvailable,
  lastRefreshed,
  qaOpenCount,
}: {
  providers: MvsProviderInput[];
  weeks: MvsWeekInput[];
  watchlistCount: number;
  acsAvailable: boolean;
  lastRefreshed: string | null;
  qaOpenCount: number;
}) {
  // Count distinct providers per discovery source.
  const counts = new Map<string, number>();
  for (const p of providers) {
    const srcs = p.sources ?? [];
    if (srcs.length === 0) {
      counts.set("unknown", (counts.get("unknown") ?? 0) + 1);
    } else {
      for (const s of srcs) {
        counts.set(s, (counts.get(s) ?? 0) + 1);
      }
    }
  }

  const discoverySources = [
    "sawyer",
    "google_maps",
    "google_search",
    "activityhero",
    "yelp",
  ]
    .map((s) => ({ key: s, label: SOURCE_LABELS[s] ?? s, count: counts.get(s) ?? 0 }))
    .filter((s) => s.count > 0);

  const fresh = formatRelative(lastRefreshed);
  const weekSourceCount = weeks.filter((w) => w.source_url).length;

  return (
    <section
      className="mb-6 rounded-lg border bg-white p-4"
      style={{ borderColor: BORDER }}
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[13px] font-bold" style={{ color: NAVY }}>
          Data sources powering this score
        </h3>
        <span className="text-[11px]" style={{ color: MUTED }}>
          Last refreshed{" "}
          <span className="font-semibold" style={{ color: NAVY }}>
            {fresh}
          </span>
          {qaOpenCount > 0 && (
            <>
              {" · "}
              <span
                style={{ color: "#a3142b", cursor: "help" }}
                title="QA queue tracks per-provider data-quality issues that affect today's scoring pillars. Items from the retired Market Absorption pillar (broken registration pages) are filtered out and not counted here."
              >
                {qaOpenCount} item{qaOpenCount === 1 ? "" : "s"} in QA queue
              </span>
            </>
          )}

        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
        {discoverySources.map((s) => {
          const matching = providers.filter((p) => (p.sources ?? []).includes(s.key));
          return (
            <SourceCard
              key={s.key}
              label={s.label}
              value={s.count}
              popoverTitle={`${s.label} — ${s.count} provider${s.count === 1 ? "" : "s"}`}
              popoverBody={
                <>
                  <p className="mb-2 text-[11px]" style={{ color: MUTED }}>
                    These camps were discovered through {s.label}. Click the link icon to open the provider page.
                  </p>
                  <ProviderList items={matching} />
                </>
              }
            />
          );
        })}

        {(() => {
          const withWeekSource = providers.filter((p) =>
            weeks.some((w) => w.provider_id === p.id && w.source_url),
          );
          return (
            <SourceCard
              label="Sawyer week availability"
              value={`${weekSourceCount}/${weeks.length}`}
              popoverTitle="Sawyer week availability"
              popoverBody={
                <>
                  <p className="mb-2 text-[11px]" style={{ color: MUTED }}>
                    {weekSourceCount} of {weeks.length} tracked weeks have a Sawyer page we could read. These providers have at least one week with a source URL.
                  </p>
                  <ProviderList items={withWeekSource} />
                </>
              }
            />
          );
        })()}

        <SourceCard
          label="US Census ACS (5-yr)"
          value={acsAvailable ? "loaded" : "—"}
          valueColor={acsAvailable ? BLUE : MUTED}
          popoverTitle="US Census ACS (5-year)"
          popoverBody={
            <>
              <p className="mb-2">
                Status: <span className="font-semibold">{acsAvailable ? "Loaded" : "Not available"}</span>
              </p>
              <p className="mb-2 text-[11px]" style={{ color: MUTED }}>
                American Community Survey 5-year estimates power demographic sub-scores (household income, age distribution, population density).
              </p>
              <a
                href="https://data.census.gov/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#174be8] hover:underline"
              >
                <ExternalLink size={11} /> Open data.census.gov
              </a>
            </>
          }
        />

        <SourceCard
          label="Operator watchlist"
          value={watchlistCount}
          popoverTitle={`Operator watchlist — ${watchlistCount} brand${watchlistCount === 1 ? "" : "s"}`}
          popoverBody={
            <p className="text-[11px]" style={{ color: MUTED }}>
              {watchlistCount} national brands tracked in <code className="rounded bg-[#f7faff] px-1 py-px text-[#174be8]">mvs_operator_watchlist</code>. See the "National operators in this market" panel below for which brands matched providers in this city.
            </p>
          }
        />
      </div>

      <p className="mt-3 text-[11px]" style={{ color: MUTED }}>
        Every camp counted above feeds the score below. Open <span className="font-semibold" style={{ color: NAVY }}>Show sources</span> on any sub-score card to see which feeds shaped that number.
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Per-sub-score confidence stamp (Item 6)
// ---------------------------------------------------------------------------

export function ConfidenceStamp({
  level,
  detail,
}: {
  level: "high" | "medium" | "low";
  detail: string;
}) {
  const palette = {
    high: {
      bg: "#e3f3e7",
      fg: "#1d6b32",
      label: "Strong data coverage",
      meaning: "Enough premium providers fed this sub-score for a stable result.",
    },
    medium: {
      bg: "#fff5e0",
      fg: "#8a5a00",
      label: "Partial data coverage",
      meaning: "Fewer premium providers fed this sub-score. The number may shift as more sources are added.",
    },
    low: {
      bg: "#fce7ec",
      fg: "#a3142b",
      label: "Limited data coverage",
      meaning: "Too few premium providers fed this sub-score for a stable result. Treat the number with caution.",
    },
  }[level];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`${CHIP} cursor-help`}
          style={{ backgroundColor: palette.bg, color: palette.fg }}
        >
          {palette.label}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-[12px] leading-relaxed">
        <div className="font-semibold mb-1">{palette.label}</div>
        <div className="mb-1">{palette.meaning}</div>
        <div className="opacity-80">{detail}</div>
      </TooltipContent>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// Source chips for an individual provider row (Item 1)
// ---------------------------------------------------------------------------

export function ProviderSourceChips({ sources }: { sources: string[] | null | undefined }) {
  const list = sources ?? [];
  if (list.length === 0) {
    return (
      <span className="text-[10px]" style={{ color: MUTED }}>
        unknown
      </span>
    );
  }
  const max = 2;
  const shown = list.slice(0, max);
  const extra = list.length - max;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {shown.map((s) => (
        <span
          key={s}
          className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
          style={{ backgroundColor: SOFT, color: BLUE, border: `1px solid ${BORDER}` }}
        >
          {SOURCE_LABELS[s] ?? s}
        </span>
      ))}
      {extra > 0 && (
        <span
          className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
          style={{ backgroundColor: SOFT, color: MUTED, border: `1px solid ${BORDER}` }}
          title={list.join(", ")}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}

export function OpenSourceLink({ href }: { href: string | null | undefined }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="ml-1 inline-flex items-center text-[#174be8] hover:underline"
      title="Open the source listing in a new tab"
      aria-label="Open source listing"
    >
      <ExternalLink size={11} />
    </a>
  );
}

// ---------------------------------------------------------------------------
// Week activity mini-table under Market Absorption (Item 2)
// ---------------------------------------------------------------------------

export function WeekActivityTable({
  providers,
  weeks,
}: {
  providers: MvsProviderInput[];
  weeks: MvsWeekInput[];
}) {
  const rows = providers.map((p) => {
    const pw = weeks.filter((w) => w.provider_id === p.id);
    const soldOut = pw.filter((w) => w.status === "sold_out").length;
    const waitlist = pw.filter((w) => w.status === "waitlist").length;
    const open = pw.filter((w) => w.status === "open").length;
    const firstSource = pw.find((w) => w.source_url)?.source_url ?? p.source_listing_url ?? p.website_url ?? p.url ?? null;
    return { p, pw, soldOut, waitlist, open, firstSource };
  }).filter((r) => r.pw.length > 0);

  if (rows.length === 0) return null;

  return (
    <section className="mb-6 rounded-lg border bg-white" style={{ borderColor: BORDER }}>
      <div className="border-b px-4 py-3" style={{ borderColor: BORDER }}>
        <h3 className="text-[14px] font-bold" style={{ color: NAVY }}>
          Week-by-week activity — Market Absorption evidence
        </h3>
        <p className="text-[11px]" style={{ color: MUTED }}>
          One row per premium camp with scraped week-level availability from <code className="rounded bg-[#f7faff] px-1 py-px text-[#174be8]">mvs_weeks</code>. Click the link icon to open the Sawyer page we read.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ color: MUTED }}>
              <th className="px-4 py-2 text-left font-semibold">Provider</th>
              <th className="px-4 py-2 text-right font-semibold">Weeks tracked</th>
              <th className="px-4 py-2 text-right font-semibold">Sold out</th>
              <th className="px-4 py-2 text-right font-semibold">Waitlist</th>
              <th className="px-4 py-2 text-right font-semibold">Open</th>
              <th className="px-4 py-2 text-right font-semibold">Sellout %</th>
              <th className="px-4 py-2 text-left font-semibold">Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, pw, soldOut, waitlist, open, firstSource }) => {
              const pct = pw.length > 0 ? Math.round((soldOut / pw.length) * 100) : 0;
              return (
                <tr key={p.id} className="border-t" style={{ borderColor: BORDER }}>
                  <td className="px-4 py-2.5 font-semibold" style={{ color: NAVY }}>{p.name}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: NAVY }}>{pw.length}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: "#a3142b" }}>{soldOut}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: "#8a5a00" }}>{waitlist}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: "#1d6b32" }}>{open}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold" style={{ color: NAVY }}>{pct}%</td>
                  <td className="px-4 py-2.5" style={{ color: NAVY }}>
                    {firstSource ? (
                      <a href={firstSource} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#174be8] hover:underline">
                        <ExternalLink size={11} /> Open
                      </a>
                    ) : (
                      <span style={{ color: MUTED }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// National operators matched panel (Item 4)
// ---------------------------------------------------------------------------

export function NationalOperatorsPanel({
  providers,
  watchlist,
}: {
  providers: MvsProviderInput[];
  watchlist: { name: string; default_overlap: "direct" | "adjacent" | "distant" }[];
}) {
  if (watchlist.length === 0) return null;

  // Same fuzzy logic the scorer uses: substring match on lowercased names.
  const matches = watchlist
    .map((w) => {
      const lower = w.name.toLowerCase();
      const matched = providers.filter((p) =>
        (p.name ?? "").toLowerCase().includes(lower),
      );
      return { w, matched };
    })
    .filter((m) => m.matched.length > 0);

  if (matches.length === 0) {
    return (
      <section className="mb-6 rounded-lg border bg-white p-4" style={{ borderColor: BORDER }}>
        <h3 className="text-[14px] font-bold" style={{ color: NAVY }}>
          National operators in this market
        </h3>
        <p className="mt-1 text-[11px]" style={{ color: MUTED }}>
          No watchlist brands matched the {providers.length} provider{providers.length === 1 ? "" : "s"} discovered here. Scaled Operator score reflects a market where no national chains have planted a flag — counted as "unvalidated" by the formula.
        </p>
      </section>
    );
  }

  const directCount = matches.filter((m) => m.w.default_overlap === "direct").length;
  const adjacentCount = matches.filter((m) => m.w.default_overlap === "adjacent").length;

  return (
    <section className="mb-6 rounded-lg border bg-white" style={{ borderColor: BORDER }}>
      <div className="border-b px-4 py-3" style={{ borderColor: BORDER }}>
        <h3 className="text-[14px] font-bold" style={{ color: NAVY }}>
          National operators in this market — Scaled Operator evidence
        </h3>
        <p className="text-[11px]" style={{ color: MUTED }}>
          {matches.length} watchlist brand{matches.length === 1 ? "" : "s"} matched against {providers.length} discovered providers · {directCount} direct competitor{directCount === 1 ? "" : "s"} · {adjacentCount} adjacent.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ color: MUTED }}>
              <th className="px-4 py-2 text-left font-semibold">Brand (watchlist)</th>
              <th className="px-4 py-2 text-left font-semibold">Overlap</th>
              <th className="px-4 py-2 text-left font-semibold">Matched provider(s)</th>
              <th className="px-4 py-2 text-left font-semibold">Source</th>
            </tr>
          </thead>
          <tbody>
            {matches.map(({ w, matched }) => (
              <tr key={w.name} className="border-t align-top" style={{ borderColor: BORDER }}>
                <td className="px-4 py-2.5 font-semibold" style={{ color: NAVY }}>{w.name}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={CHIP}
                    style={{
                      backgroundColor: w.default_overlap === "direct" ? "#fce7ec" : w.default_overlap === "adjacent" ? "#fff5e0" : SOFT,
                      color: w.default_overlap === "direct" ? "#a3142b" : w.default_overlap === "adjacent" ? "#8a5a00" : BLUE,
                    }}
                  >
                    {w.default_overlap}
                  </span>
                </td>
                <td className="px-4 py-2.5" style={{ color: NAVY }}>
                  {matched.map((p) => (
                    <div key={p.id} className="flex items-center gap-1">
                      <span>{p.name}</span>
                      <OpenSourceLink href={p.source_listing_url ?? p.website_url ?? p.url ?? null} />
                    </div>
                  ))}
                </td>
                <td className="px-4 py-2.5" style={{ color: MUTED }}>
                  <span className="text-[11px]">mvs_operator_watchlist</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
