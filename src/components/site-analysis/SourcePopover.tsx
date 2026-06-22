// Source-trust UI for the SAS page.
//
// Three small pieces in one file because they share styling tokens:
//   - SourceChip       — colored pill ("Fresh", "From cache", etc.)
//   - SourcePopover    — ⓘ icon that opens a detail card with verify links
//   - DataSourcesStrip — row of chips above the metric tiles
//   - DegradedBanner   — yellow strip when any source is backup/missing
//
// All numbers in the popover come from `SourceMeta` emitted by the engine —
// the UI does not invent provenance.

import { Info, ExternalLink, Copy, AlertTriangle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import {
  type SourceMeta,
  type SasProvenance,
  STATUS_COLOR,
  STATUS_LABEL,
  relativeAge,
  hasDegradedSource,
  degradedReasons,
} from "@/lib/sas/sources";

const NAVY = "#07142f";
const MUTED = "#526078";
const BORDER = "#eef2f7";

// ---------------------------------------------------------------------------
// Chip
// ---------------------------------------------------------------------------

export function SourceChip({
  source,
  label,
}: {
  source: SourceMeta;
  label?: string;
}) {
  const c = STATUS_COLOR[source.status];
  const text = label ?? source.label;
  const age = source.status === "cached" ? relativeAge(source.fetchedAt) : null;
  return (
    <SourcePopover source={source}>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight hover:opacity-90"
        style={{ backgroundColor: c.bg, color: c.fg }}
        title={`${text} · ${STATUS_LABEL[source.status]}`}
      >
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: c.dot }}
        />
        <span className="truncate max-w-[160px]">{text}</span>
        <span className="opacity-75">· {STATUS_LABEL[source.status]}</span>
        {age && <span className="opacity-60">· {age}</span>}
      </button>
    </SourcePopover>
  );
}

// ---------------------------------------------------------------------------
// Popover (also exposed as a stand-alone ⓘ icon trigger via <InfoSource/>)
// ---------------------------------------------------------------------------

export function SourcePopover({
  source,
  children,
}: {
  source: SourceMeta;
  children: React.ReactNode;
}) {
  const c = STATUS_COLOR[source.status];
  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url).then(
      () => toast.success("Link copied"),
      () => toast.error("Could not copy link"),
    );
  };
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-[320px] p-0"
        style={{ borderColor: BORDER }}
      >
        <div
          className="flex items-center gap-2 px-3 py-2 text-[11px] font-semibold"
          style={{ backgroundColor: c.bg, color: c.fg, borderBottom: `1px solid ${BORDER}` }}
        >
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: c.dot }}
          />
          {STATUS_LABEL[source.status]}
          {source.heuristic && (
            <span
              className="ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
              style={{ backgroundColor: "#fff3cd", color: "#7a5800" }}
              title="This is an estimate, not a direct measurement"
            >
              Heuristic
            </span>
          )}
        </div>
        <div className="px-3 py-2.5 text-[12px]" style={{ color: NAVY }}>
          <div className="font-bold">{source.label}</div>
          {source.year != null && (
            <div className="text-[11px]" style={{ color: MUTED }}>
              Dataset year: {String(source.year)}
            </div>
          )}
          {source.fetchedAt && (
            <div className="text-[11px]" style={{ color: MUTED }}>
              Fetched: {new Date(source.fetchedAt).toLocaleString()}{" "}
              <span className="opacity-70">({relativeAge(source.fetchedAt)})</span>
              {source.cacheAgeDays != null && source.status === "cached" && (
                <span className="opacity-70"> · cache age {source.cacheAgeDays} d</span>
              )}
            </div>
          )}
          {source.note && (
            <p className="mt-2 text-[11px]" style={{ color: MUTED }}>
              {source.note}
            </p>
          )}
          {source.error && (
            <p
              className="mt-2 rounded border px-2 py-1 text-[11px]"
              style={{
                color: "#a3142b",
                borderColor: "#f5c6cd",
                backgroundColor: "#fdf2f4",
              }}
            >
              Upstream error: {source.error}
            </p>
          )}
          {source.verifyLinks && source.verifyLinks.length > 0 && (
            <div className="mt-3 space-y-1">
              <div
                className="text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: MUTED }}
              >
                Verify at source
              </div>
              {source.verifyLinks.map((l, i) => (
                <div key={i} className="flex items-center gap-1">
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-1 items-center gap-1 truncate rounded border px-2 py-1 text-[11px] font-semibold"
                    style={{ borderColor: BORDER, color: "#174be8" }}
                    title={l.url}
                  >
                    <ExternalLink size={11} />
                    <span className="truncate">{l.label}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => copyLink(l.url)}
                    className="rounded border p-1.5 text-[11px]"
                    style={{ borderColor: BORDER, color: MUTED }}
                    title="Copy link"
                  >
                    <Copy size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {(!source.verifyLinks || source.verifyLinks.length === 0) &&
            source.status !== "user_input" && (
              <p className="mt-3 text-[10px] italic" style={{ color: MUTED }}>
                No direct verify link for this number.
              </p>
            )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Inline ⓘ icon — drop this next to any tile or label
// ---------------------------------------------------------------------------

export function InfoSource({ source }: { source: SourceMeta | undefined | null }) {
  if (!source) return null;
  const c = STATUS_COLOR[source.status];
  return (
    <SourcePopover source={source}>
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-full p-0.5 hover:bg-slate-100"
        style={{ color: c.dot }}
        title={`Source: ${source.label} · ${STATUS_LABEL[source.status]}`}
        aria-label="Source details"
      >
        <Info size={11} />
      </button>
    </SourcePopover>
  );
}

// ---------------------------------------------------------------------------
// Top-of-card chip strip
// ---------------------------------------------------------------------------

export function DataSourcesStrip({ provenance }: { provenance?: SasProvenance | null }) {
  if (!provenance) return null;
  const chips: { source: SourceMeta; label: string }[] = [];
  if (provenance.affluence) {
    chips.push({ source: provenance.affluence, label: "Census" });
  }
  if (provenance.ecosystem) {
    chips.push({ source: provenance.ecosystem, label: "Schools" });
  }
  if (provenance.accessibility) {
    chips.push({ source: provenance.accessibility, label: "Roads" });
  }
  if (provenance.schoolProfile) {
    chips.push({ source: provenance.schoolProfile, label: "Your input" });
  }
  if (!chips.length) return null;
  return (
    <div
      className="mt-3 flex flex-wrap items-center gap-1.5 rounded border px-2 py-1.5"
      style={{ borderColor: BORDER, backgroundColor: "#f7faff" }}
    >
      <span
        className="text-[9px] font-semibold uppercase tracking-wide"
        style={{ color: MUTED }}
      >
        Data sources
      </span>
      {chips.map((c, i) => (
        <SourceChip key={i} source={c.source} label={c.label} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Degraded-run banner
// ---------------------------------------------------------------------------

export function DegradedBanner({ provenance }: { provenance?: SasProvenance | null }) {
  if (!hasDegradedSource(provenance)) return null;
  const reasons = degradedReasons(provenance);
  return (
    <div
      className="mt-3 flex items-start gap-2 rounded border px-2.5 py-2 text-[11px]"
      style={{ borderColor: "#fbeec8", backgroundColor: "#fff8e0", color: "#7a5800" }}
    >
      <AlertTriangle size={13} className="mt-0.5 shrink-0" />
      <div>
        <div className="font-bold">Degraded data sources used</div>
        <ul className="mt-1 list-disc pl-4">
          {reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
