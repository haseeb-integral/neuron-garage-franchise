// Market Brief — gorgeous web page that doubles as a print-quality PDF.
//
// Same source of truth as every other MVS surface: useLiveMvs() →
// computeMvs(). The numbers, weights, providers, and weeks rendered here
// are the live recomputed bundle — never stale DB composites.
//
// Print to PDF: browser File → Print → "Save as PDF". Print CSS lives in
// src/styles/market-brief-print.css.

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import logoUrl from "@/assets/neuron-garage-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useLiveMvs } from "@/lib/mvs/useLiveMvs";
import {
  DEFAULT_WEIGHTS,
  MVS_NORMALIZATION_VERSION,
} from "@/lib/mvs/computeMvs";
import "@/styles/market-brief-print.css";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmt = (v: number | null | undefined, d = 1) =>
  v == null || !Number.isFinite(v) ? "—" : v.toFixed(d);
const fmtInt = (v: number | null | undefined) =>
  v == null || !Number.isFinite(v) ? "—" : Math.round(v).toLocaleString();
const fmtMoney = (v: number | null | undefined) =>
  v == null || !Number.isFinite(v) ? "—" : `$${Math.round(v).toLocaleString()}`;
const fmtPct = (v: number | null | undefined, d = 0) =>
  v == null || !Number.isFinite(v) ? "—" : `${v.toFixed(d)}%`;
const fmtTs = (iso: string | null | undefined) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toISOString().replace("T", " ").slice(0, 16) + " UTC";
  } catch { return iso; }
};

const PILLARS: {
  key: keyof typeof DEFAULT_WEIGHTS;
  title: string;
  subtitle: string;
  formula: string;
}[] = [
  { key: "pricingAcceptance", title: "Pricing Acceptance", subtitle: "Are families already paying premium pricing?",
    formula: "0.40 × norm(median, $300–$700) + 0.40 × norm(p75, $400–$800) + 0.20 × norm(% ≥ $500, 0–100)" },
  { key: "scaledOperator", title: "Scaled Operator", subtitle: "Validated vs saturated by national operators?",
    formula: "0.65 × norm(Validation, 0–8) + 0.35 × (100 − norm(DirectLoad per 10k, 0–5))" },
  { key: "enrichmentDiversity", title: "Enrichment Diversity", subtitle: "Do families invest across multiple categories?",
    formula: "norm(clamp(CategoryCount, 2, 10), 2, 10) × 100" },
  { key: "marketDepth", title: "Market Depth", subtitle: "How large is the premium ecosystem?",
    formula: "norm(PremiumProviderCount, 4–40)" },
  { key: "marketBalance", title: "Market Balance Index", subtitle: "Is there still room in this market?",
    formula: "norm(CoverageRatio = affluent_families ÷ premium_count, 50–500). ≥350 underserved." },
];

// Weight slider state in the URL: ?w=pa:0.2,ma:0.25,...
function parseWeights(s: string | null): Record<string, number> {
  if (!s) return { ...DEFAULT_WEIGHTS };
  // Note: `ma:` (Market Absorption) is intentionally absent — pillar removed in v1.1.
  // Unknown tokens in old saved URLs are silently ignored below.
  const keyMap: Record<string, keyof typeof DEFAULT_WEIGHTS> = {
    pa: "pricingAcceptance", so: "scaledOperator",
    ed: "enrichmentDiversity", md: "marketDepth", mb: "marketBalance",
  };
  const out: Record<string, number> = { ...DEFAULT_WEIGHTS };
  for (const pair of s.split(",")) {
    const [k, v] = pair.split(":");
    const full = keyMap[k];
    const num = Number(v);
    if (full && Number.isFinite(num)) out[full] = num;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Visual primitives
// ---------------------------------------------------------------------------

// Composite radial — big donut on the cover.
function CompositeDonut({ value, label, size = 260 }: { value: number | null; label: string; size?: number }) {
  const v = value ?? 0;
  const pct = Math.max(0, Math.min(100, v));
  const r = (size - 22) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id="mb-donut-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"  stopColor="#9bb4ff" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
      </defs>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={12} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke="url(#mb-donut-grad)" strokeWidth={12}
        strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset}
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
      <text x="50%" y="48%" textAnchor="middle" fill="white" fontFamily="Fraunces, serif"
            fontSize={size * 0.32} fontWeight={700} dominantBaseline="middle">
        {value != null ? value.toFixed(1) : "—"}
      </text>
      <text x="50%" y="68%" textAnchor="middle" fill="rgba(255,255,255,0.7)"
            fontFamily="Inter, sans-serif" fontSize={11} letterSpacing={2}>
        {label}
      </text>
    </svg>
  );
}

// Pillar bar — colored gradient horizontal bar (0–100).
function PillarBar({ value, weight }: { value: number | null; weight: number }) {
  const v = value ?? 0;
  const pct = Math.max(0, Math.min(100, v));
  const color =
    v >= 70 ? "linear-gradient(90deg, #14b87a, #0a8c5b)"
    : v >= 50 ? "linear-gradient(90deg, #3a6cf5, #174be8)"
    : v >= 30 ? "linear-gradient(90deg, #f7b955, #e08a1a)"
    : "linear-gradient(90deg, #ef5d72, #c41a36)";
  return (
    <div className="mb-avoid-break" style={{ marginTop: 6 }}>
      <div style={{
        position: "relative", height: 10, borderRadius: 999, background: "var(--mb-line)", overflow: "hidden",
      }}>
        <div style={{
          width: `${pct}%`, height: "100%", background: color, borderRadius: 999,
          transition: "width 240ms ease",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--mb-muted)", marginTop: 4 }}>
        <span>weight {(weight * 100).toFixed(0)}%</span>
        <span>contributes {value != null ? (value * weight).toFixed(1) : "—"} pts</span>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const palette: Record<string, { bg: string; fg: string; label: string }> = {
    sold_out:         { bg: "#e3f3e7", fg: "#1d6b32", label: "Sold out" },
    waitlist:         { bg: "#e3f3e7", fg: "#1d6b32", label: "Waitlist" },
    low_availability: { bg: "#eaf0ff", fg: "#174be8", label: "Low avail." },
    limited:          { bg: "#eaf0ff", fg: "#174be8", label: "Limited" },
    open:             { bg: "#eef2f7", fg: "#526078", label: "Open" },
    unknown:          { bg: "#eef2f7", fg: "#526078", label: "Unknown" },
  };
  const p = palette[status] ?? palette.unknown;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 999,
      background: p.bg, color: p.fg, fontSize: 10, fontWeight: 600, letterSpacing: 0.2,
    }}>{p.label}</span>
  );
}

function SectionHead({ n, label, sub }: { n: number; label: string; sub?: string }) {
  return (
    <header className="mb-avoid-break" style={{ marginTop: 26, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "var(--mb-blue)", letterSpacing: 1 }}>
          §{String(n).padStart(2, "0")}
        </span>
        <h2 className="mb-serif" style={{ fontSize: 24, fontWeight: 600, margin: 0, color: "var(--mb-navy)" }}>{label}</h2>
      </div>
      {sub && <p style={{ margin: "4px 0 0 30px", color: "var(--mb-muted)", fontSize: 12 }}>{sub}</p>}
      <div style={{ marginTop: 10, height: 2, background: "linear-gradient(90deg, var(--mb-blue), transparent)", borderRadius: 2 }} />
    </header>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface PipelineRun {
  id: string; status: string; started_at: string | null; finished_at: string | null;
  firecrawl_calls: number; error: string | null;
}
interface WeekDetail {
  provider_id: string; provider_name: string; week_start: string; week_end: string | null;
  status: string; confidence: number | null; screenshot_url: string | null;
}

export default function MarketBrief() {
  const [params] = useSearchParams();
  const city = params.get("city") ?? "";
  const state = params.get("state") ?? "";
  const cityKey = city && state ? `${city}, ${state}` : "";
  const weights = useMemo(() => parseWeights(params.get("w")), [params]);

  const { result, providers, weeks, acs, flag, loading, error } = useLiveMvs(cityKey, { weights });
  const [latestRun, setLatestRun] = useState<PipelineRun | null>(null);
  const [weeksDetailed, setWeeksDetailed] = useState<WeekDetail[]>([]);
  const [fetchingExtras, setFetchingExtras] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setFetchingExtras(true);
      try {
        const { data: runRow } = await supabase
          .from("mvs_pipeline_runs")
          .select("id, status, started_at, finished_at, firecrawl_calls, error")
          .eq("city", cityKey)
          .order("created_at", { ascending: false })
          .limit(1).maybeSingle();
        if (!cancelled && runRow) {
          setLatestRun({
            id: runRow.id as string, status: String(runRow.status),
            started_at: (runRow.started_at as string) ?? null,
            finished_at: (runRow.finished_at as string) ?? null,
            firecrawl_calls: Number(runRow.firecrawl_calls ?? 0),
            error: (runRow.error as string) ?? null,
          });
        }
        if (providers.length > 0) {
          const nameById = new Map(providers.map((p) => [p.id, p.name]));
          const { data: wkRows } = await supabase
            .from("mvs_weeks")
            .select("provider_id, week_start, week_end, status, confidence, screenshot_url")
            .in("provider_id", providers.map((p) => p.id))
            .order("week_start", { ascending: true });
          if (!cancelled) {
            setWeeksDetailed((wkRows ?? []).map((w: any) => ({
              provider_id: w.provider_id, provider_name: nameById.get(w.provider_id) ?? "—",
              week_start: String(w.week_start), week_end: w.week_end ? String(w.week_end) : null,
              status: String(w.status), confidence: w.confidence == null ? null : Number(w.confidence),
              screenshot_url: (w.screenshot_url as string) ?? null,
            })));
          }
        }
      } finally {
        if (!cancelled) setFetchingExtras(false);
      }
    }
    if (cityKey && !loading) load();
    return () => { cancelled = true; };
  }, [cityKey, loading, providers]);

  useEffect(() => {
    if (cityKey) document.title = `Market Brief — ${city}, ${state}`;
  }, [cityKey, city, state]);

  if (!cityKey) {
    return (
      <div style={{ padding: 60, fontFamily: "Inter, sans-serif", color: "#07142f" }}>
        <h1>Market Brief</h1>
        <p>Missing <code>?city=...&state=...</code> in the URL.</p>
        <Link to="/market-validation">← Back to Market Validation</Link>
      </div>
    );
  }
  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", color: "#07142f" }}>
        <div style={{ textAlign: "center" }}>
          <Loader2 className="animate-spin" style={{ margin: "0 auto" }} />
          <p style={{ marginTop: 12 }}>Loading live {city} data…</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ padding: 40, color: "#a3142b" }}>Failed to load {city}: {error}</div>
    );
  }
  if (!result) {
    return (
      <div style={{ padding: 40, color: "#526078" }}>
        No live data for {city} yet. Run the pipeline first from <Link to="/market-validation/rollout">/market-validation/rollout</Link>.
      </div>
    );
  }

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const premium = providers.filter((p) => p.tier === "premium");
  const weeksByProv = new Map<string, typeof weeks>();
  for (const w of weeks) {
    const arr = weeksByProv.get(w.provider_id) ?? [];
    arr.push(w);
    weeksByProv.set(w.provider_id, arr);
  }
  const lowConfidence = flag?.low_confidence_badge ?? false;

  const entries = PILLARS.map((p) => ({ ...p, score: result.scores[p.key] })).filter((e) => e.score != null) as
    (typeof PILLARS[number] & { score: number })[];
  const sorted = [...entries].sort((a, b) => b.score - a.score);
  const strengths = sorted.slice(0, 2);
  const risks = sorted.slice(-2).reverse();

  return (
    <div className="mb-doc">
      {/* Floating toolbar — screen only */}
      <div className="mb-no-print" style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)",
        borderBottom: "1px solid #e5eaf2", padding: "10px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <Link to="/market-validation" style={{
          display: "inline-flex", alignItems: "center", gap: 6, color: "#174be8",
          textDecoration: "none", fontSize: 13, fontWeight: 600,
        }}>
          <ArrowLeft size={14} /> Back to Market Validation
        </Link>
        <div style={{ fontSize: 12, color: "#526078" }}>
          Tip: <strong>Cmd/Ctrl + P</strong> → Save as PDF for a branded printout.
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "#07142f", color: "white", border: "none",
            padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}
        >
          <Printer size={14} /> Print / Save as PDF
        </button>
      </div>

      <div style={{ padding: "24px 0" }}>
        {/* ============================================================
            COVER
           ============================================================ */}
        <section className="mb-page mb-page--cover">
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage:
              "radial-gradient(40% 30% at 12% 18%, rgba(155,180,255,0.18), transparent 70%), radial-gradient(50% 40% at 88% 90%, rgba(201,161,74,0.10), transparent 70%)",
            pointerEvents: "none",
          }} />
          <div style={{ position: "relative", padding: "0.7in 0.7in 0.5in", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <img src={logoUrl} alt="Neuron Garage" style={{ height: 28, width: 28, filter: "brightness(0) invert(1)" }} />
              <div style={{ color: "white", fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>NEURON GARAGE</div>
            </div>
            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}>
              Confidential · Internal
            </div>
          </div>

          <div style={{ position: "relative", padding: "0.4in 0.7in 0", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, letterSpacing: 3, textTransform: "uppercase" }}>
              Market Validation Brief
            </div>
            <h1 className="mb-serif" style={{
              color: "white", fontSize: 84, fontWeight: 600, lineHeight: 0.95, margin: "8px 0 0",
              letterSpacing: "-0.025em",
            }}>
              {city}
            </h1>
            <div className="mb-serif" style={{ color: "rgba(255,255,255,0.7)", fontSize: 36, fontWeight: 400, fontStyle: "italic" }}>
              {state}
            </div>
          </div>

          <div style={{
            position: "relative", padding: "0.5in 0.7in 0",
            display: "grid", gridTemplateColumns: "1fr auto", gap: 40, alignItems: "center",
          }}>
            <div>
              <p style={{ color: "rgba(255,255,255,0.78)", fontSize: 14, lineHeight: 1.65, maxWidth: 460, margin: 0 }}>
                A live, recomputed look at premium summer-camp demand in {city} — pricing acceptance,
                sellout velocity, operator validation, and market depth. Every number on every page is
                pulled from the same scoring helper that drives the on-screen MVS table.
              </p>
              <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "repeat(4, auto)", gap: 28 }}>
                <Stat label="Generated" value={today} />
                <Stat label="Providers" value={String(providers.length)} />
                <Stat label="Week rows" value={String(weeks.length)} />
                <Stat label="Confidence" value={lowConfidence ? "LOW" : "OK"} tone={lowConfidence ? "warn" : "ok"} />
              </div>
            </div>
            <CompositeDonut value={result.mvs} label="MVS COMPOSITE" size={260} />
          </div>

          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            padding: "0.4in 0.7in", display: "flex", justifyContent: "space-between",
            color: "rgba(255,255,255,0.5)", fontSize: 10, letterSpacing: 1, textTransform: "uppercase",
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}>
            <span>Norm v{MVS_NORMALIZATION_VERSION}</span>
            <span>neurongarage.com</span>
          </div>
        </section>

        {/* ============================================================
            BODY — single page wrapper, sections inside
           ============================================================ */}
        <section className="mb-page mb-break-before">
          <BrandHeader city={city} state={state} today={today} />

          <SectionHead n={1} label="Executive Summary" sub="Composite score, top strengths, and top risks at a glance." />
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 28 }}>
            <div>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--mb-navy)", margin: 0 }}>
                <strong>{city}, {state}</strong> scores <strong>{fmt(result.mvs)}</strong> out of 100 on the
                Market Validation Score, computed live from <strong>{providers.length}</strong> tracked providers
                and <strong>{weeks.length}</strong> per-week observations. Premium tier accounts for{" "}
                <strong>{premium.length}</strong> of those providers
                {lowConfidence ? " — confidence is flagged LOW; review before sharing externally." : "; confidence is OK."}
              </p>
              <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <Callout tone="ok" title="Strengths">
                  {strengths.length === 0 ? <em>—</em> : strengths.map((s) => (
                    <div key={s.key} style={{ marginBottom: 6 }}>
                      <strong>{s.title}</strong> · {s.score.toFixed(1)}
                    </div>
                  ))}
                </Callout>
                <Callout tone="warn" title="Risks">
                  {risks.length === 0 ? <em>—</em> : risks.map((s) => (
                    <div key={s.key} style={{ marginBottom: 6 }}>
                      <strong>{s.title}</strong> · {s.score.toFixed(1)}
                    </div>
                  ))}
                </Callout>
              </div>
            </div>
            <aside style={{
              padding: 20, borderRadius: 12, background: "var(--mb-cream)",
              border: "1px solid #efe7d8",
            }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--mb-muted)", textTransform: "uppercase" }}>
                Composite
              </div>
              <div className="mb-serif" style={{ fontSize: 54, fontWeight: 700, lineHeight: 1, marginTop: 6, color: "var(--mb-navy)" }}>
                {fmt(result.mvs)}
              </div>
              <div style={{ fontSize: 11, color: "var(--mb-muted)", marginTop: 2 }}>/ 100</div>
              <hr style={{ border: 0, borderTop: "1px solid #efe7d8", margin: "14px 0" }} />
              <div style={{ display: "grid", gap: 8 }}>
                {PILLARS.map((p) => (
                  <div key={p.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span style={{ color: "var(--mb-muted)" }}>{p.title}</span>
                    <span className="mb-mono" style={{ fontWeight: 600, color: "var(--mb-navy)" }}>{fmt(result.scores[p.key])}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>

          <SectionHead n={2} label="Pillar Scores" sub="Six weighted dimensions that roll up to the composite." />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            {PILLARS.map((p, idx) => {
              const score = result.scores[p.key];
              return (
                <div key={p.key} className="mb-avoid-break" style={{
                  padding: 18, borderRadius: 10, border: "1px solid var(--mb-line)", background: "white",
                }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "var(--mb-blue)", fontWeight: 700, letterSpacing: 1 }}>
                        PILLAR {String(idx + 1).padStart(2, "0")}
                      </div>
                      <div className="mb-serif" style={{ fontSize: 18, fontWeight: 600, color: "var(--mb-navy)", marginTop: 2 }}>
                        {p.title}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--mb-muted)", marginTop: 2 }}>{p.subtitle}</div>
                    </div>
                    <div className="mb-mono" style={{ fontSize: 28, fontWeight: 700, color: "var(--mb-navy)", lineHeight: 1 }}>
                      {fmt(score)}
                    </div>
                  </div>
                  <PillarBar value={score} weight={weights[p.key]} />
                </div>
              );
            })}
          </div>
        </section>

        {/* ============================================================
            PILLAR DETAILS
           ============================================================ */}
        <section className="mb-page mb-break-before">
          <BrandHeader city={city} state={state} today={today} />
          <SectionHead n={3} label="Pillar Inputs & Formulas" sub="Raw numbers behind each pillar score." />
          {PILLARS.map((p) => {
            const score = result.scores[p.key];
            const inputs = (result.inputs as any)[p.key] as Record<string, unknown>;
            const rows = Object.entries(inputs || {}).filter(([k, v]) => v != null && k !== "year2Signal");
            return (
              <div key={p.key} className="mb-avoid-break" style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
                  <h3 className="mb-serif" style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{p.title}</h3>
                  <span className="mb-mono" style={{ fontSize: 12, color: "var(--mb-blue)", fontWeight: 700 }}>{fmt(score)}</span>
                  <span style={{ fontSize: 11, color: "var(--mb-muted)" }}>· weight {(weights[p.key] * 100).toFixed(0)}%</span>
                </div>
                {rows.length === 0 ? (
                  <p style={{ fontSize: 12, color: "var(--mb-muted)", fontStyle: "italic", margin: 0 }}>
                    No input data available for this pillar.
                  </p>
                ) : (
                  <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                    <tbody>
                      {rows.map(([k, v], i) => {
                        let val: string;
                        if (typeof v === "number") {
                          if (k.toLowerCase().includes("price")) val = fmtMoney(v);
                          else if (k.toLowerCase().includes("rate") || k.toLowerCase().includes("pct")) val = fmtPct(v as number, 1);
                          else if (k.toLowerCase().includes("ratio")) val = (v as number).toFixed(3);
                          else if (Number.isInteger(v)) val = fmtInt(v as number);
                          else val = (v as number).toFixed(2);
                        } else { val = String(v); }
                        return (
                          <tr key={k} style={{ background: i % 2 === 1 ? "var(--mb-soft)" : "white" }}>
                            <td style={{ padding: "5px 8px", color: "var(--mb-muted)" }}>{k}</td>
                            <td className="mb-mono" style={{ padding: "5px 8px", textAlign: "right", fontWeight: 600, color: "var(--mb-navy)" }}>{val}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                <div className="mb-mono" style={{ fontSize: 10, color: "var(--mb-muted)", marginTop: 6, paddingTop: 6, borderTop: "1px solid var(--mb-line)" }}>
                  {p.formula}
                </div>
              </div>
            );
          })}
        </section>

        {/* ============================================================
            ROSTER + LINEAGE + METHOD
           ============================================================ */}
        <section className="mb-page mb-break-before">
          <BrandHeader city={city} state={state} today={today} />

          <SectionHead n={4} label="Premium Provider Roster" sub={`${premium.length} of ${providers.length} providers classified premium tier.`} />
          {premium.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--mb-muted)", fontStyle: "italic" }}>No premium providers in the live set.</p>
          ) : (
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--mb-navy)", color: "white" }}>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11 }}>Provider</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 11 }}>$ min/wk</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 11 }}>$ max/wk</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11 }}>Category</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 11 }}>Weeks</th>
                </tr>
              </thead>
              <tbody>
                {premium.map((p, i) => (
                  <tr key={p.id} style={{ background: i % 2 === 1 ? "var(--mb-soft)" : "white", borderBottom: "1px solid var(--mb-line)" }}>
                    <td style={{ padding: "8px 10px", fontWeight: 600 }}>{p.name}</td>
                    <td className="mb-mono" style={{ padding: "8px 10px", textAlign: "right" }}>{fmtMoney(p.price_min)}</td>
                    <td className="mb-mono" style={{ padding: "8px 10px", textAlign: "right" }}>{fmtMoney(p.price_max)}</td>
                    <td style={{ padding: "8px 10px", color: "var(--mb-muted)" }}>{p.category_classified ?? "—"}</td>
                    <td className="mb-mono" style={{ padding: "8px 10px", textAlign: "right" }}>{weeksByProv.get(p.id)?.length ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Plain-English legend: what feeds the score vs what's context only. */}
          <div style={{
            margin: "16px 0 12px",
            padding: "12px 14px",
            background: "#f8fafc",
            border: "1px solid var(--mb-line)",
            borderLeft: "4px solid var(--mb-navy)",
            borderRadius: 4,
            fontSize: 12,
            lineHeight: 1.55,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 6, color: "var(--mb-navy)" }}>How the score works</div>
            <ul style={{ margin: 0, paddingLeft: 18, color: "var(--mb-ink)" }}>
              <li>The MVS score for this city is built <strong>only from Premium providers</strong> (the table above).</li>
              <li>We find providers from 5 sources: <strong>gsearch</strong> (Google web search), <strong>gmaps</strong> (Google Maps), <strong>ah</strong> (ActivityHero), <strong>yelp</strong>, <strong>sawyer</strong>.</li>
              <li>Every provider we find is sorted into a tier: <strong>premium</strong> ($400+/wk or known national brand), <strong>mid</strong>, <strong>budget</strong>, or <strong>community</strong>.</li>
              <li>The table below shows mid / budget / community providers. They confirm the market is real, but they do <strong>not</strong> change the score.</li>
            </ul>
          </div>

          {/* Non-premium providers — informational only, never feeds the score. */}
          <SectionHead
            n={4.5 as any}
            label="Non-Premium Providers (context only — not scored)"
            sub={`${providers.filter((p) => p.tier !== "premium").length} mid / budget / community rows for this city.`}
          />
          {providers.filter((p) => p.tier !== "premium").length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--mb-muted)", fontStyle: "italic" }}>No non-premium providers in the live set.</p>
          ) : (
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--mb-navy)", color: "white" }}>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11 }}>Provider</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11 }}>Tier</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 11 }}>$ min/wk</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 11 }}>$ max/wk</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11 }}>Category</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11 }}>Sources</th>
                </tr>
              </thead>
              <tbody>
                {[...providers]
                  .filter((p) => p.tier !== "premium")
                  .sort((a, b) => {
                    const order: Record<string, number> = { premium: 0, mid: 1, budget: 2, community: 3 };
                    const ta = order[a.tier ?? "community"] ?? 9;
                    const tb = order[b.tier ?? "community"] ?? 9;
                    if (ta !== tb) return ta - tb;
                    return a.name.localeCompare(b.name);
                  })
                  .map((p, i) => {
                    const tierColors: Record<string, { bg: string; fg: string }> = {
                      premium: { bg: "#0a3a7a", fg: "white" },
                      mid: { bg: "#3b6fb8", fg: "white" },
                      budget: { bg: "#cbd5e1", fg: "#0a1f3d" },
                      community: { bg: "#e5e7eb", fg: "#475569" },
                    };
                    const tc = tierColors[p.tier ?? "community"] ?? tierColors.community;
                    const sourceLabels: Record<string, string> = {
                      google_search: "gsearch",
                      google_maps: "gmaps",
                      activity_hero: "ah",
                      yelp: "yelp",
                      sawyer: "sawyer",
                    };
                    const srcs = (p.sources ?? []) as string[];
                    return (
                      <tr key={p.id} style={{ background: i % 2 === 1 ? "var(--mb-soft)" : "white", borderBottom: "1px solid var(--mb-line)" }}>
                        <td style={{ padding: "8px 10px", fontWeight: 600 }}>{p.name}</td>
                        <td style={{ padding: "8px 10px" }}>
                          <span style={{ background: tc.bg, color: tc.fg, padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, textTransform: "uppercase" }}>
                            {p.tier ?? "—"}
                          </span>
                        </td>
                        <td className="mb-mono" style={{ padding: "8px 10px", textAlign: "right" }}>{fmtMoney(p.price_min)}</td>
                        <td className="mb-mono" style={{ padding: "8px 10px", textAlign: "right" }}>{fmtMoney(p.price_max)}</td>
                        <td style={{ padding: "8px 10px", color: "var(--mb-muted)" }}>{p.category_classified ?? "—"}</td>
                        <td style={{ padding: "8px 10px" }}>
                          {srcs.length === 0 ? (
                            <span style={{ color: "var(--mb-muted)", fontStyle: "italic", fontSize: 10 }}>—</span>
                          ) : (
                            <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
                              {srcs.map((s) => (
                                <span
                                  key={s}
                                  style={{
                                    background: s === "google_search" ? "#dcfce7" : "#eef2ff",
                                    color: s === "google_search" ? "#14532d" : "#3730a3",
                                    padding: "1px 6px",
                                    borderRadius: 3,
                                    fontSize: 10,
                                    fontWeight: 600,
                                  }}
                                >
                                  {sourceLabels[s] ?? s}
                                </span>
                              ))}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}

          <SectionHead n={5} label="Pillar Weights" sub="Current blend used to produce the composite." />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {PILLARS.map((p) => (
              <div key={p.key} style={{ padding: 12, borderRadius: 8, border: "1px solid var(--mb-line)", background: "var(--mb-soft)" }}>
                <div style={{ fontSize: 11, color: "var(--mb-muted)" }}>{p.title}</div>
                <div className="mb-mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--mb-navy)", marginTop: 2 }}>
                  {(weights[p.key] * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>

          <SectionHead n={6} label="Data Lineage" sub="Latest pipeline run that produced these numbers." />
          {latestRun ? (
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <tbody>
                {([
                  ["Run ID", latestRun.id],
                  ["Status", latestRun.status],
                  ["Started", fmtTs(latestRun.started_at)],
                  ["Finished", fmtTs(latestRun.finished_at)],
                  ["Firecrawl calls", String(latestRun.firecrawl_calls)],
                  ["Provider rows (mvs_providers)", String(providers.length)],
                  ["Week rows (mvs_weeks)", String(weeks.length)],
                  ["ACS children 5-12", acs ? fmtInt(acs.children_5_12_count) : "—"],
                  ["ACS affluent dual-income families", acs ? fmtInt(acs.affluent_dual_income_family_count) : "—"],
                  ["Error", latestRun.error ?? "none"],
                ] as [string, string][]).map(([k, v], i) => (
                  <tr key={k} style={{ background: i % 2 === 1 ? "var(--mb-soft)" : "white" }}>
                    <td style={{ padding: "6px 10px", color: "var(--mb-muted)", width: "45%" }}>{k}</td>
                    <td className="mb-mono" style={{ padding: "6px 10px", color: "var(--mb-navy)", wordBreak: "break-all" }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ fontSize: 12, color: "var(--mb-muted)", fontStyle: "italic" }}>No pipeline run recorded for this city yet.</p>
          )}

          <SectionHead n={7} label="Methodology Notes" />
          <ul style={{ fontSize: 12, lineHeight: 1.7, color: "var(--mb-navy)", margin: 0, paddingLeft: 18 }}>
            <li>Composite = Σ (weight × pillar score). Pillars clamped 0–100; if any pillar is null the composite is null.</li>
            <li>Normalization version: <span className="mb-mono">{MVS_NORMALIZATION_VERSION}</span>. Shared helper: <span className="mb-mono">src/lib/mvs/computeMvs.ts</span>.</li>
            <li>Confidence flag: {lowConfidence ? "LOW — review before sharing externally." : "OK."}</li>
            <li>Full methodology: <span className="mb-mono">/mvs-methodology</span>.</li>
          </ul>
          <p style={{ marginTop: 14, padding: 12, background: "var(--mb-soft)", borderLeft: "3px solid var(--mb-blue)", fontSize: 11, color: "var(--mb-muted)", borderRadius: 4 }}>
            <strong style={{ color: "var(--mb-navy)" }}>Brett's rule:</strong> every number on this page is recomputed from the same helper the on-screen MVS table,
            deep-dive panel, and compare modal use. No stored composites.
          </p>
        </section>

        {/* ============================================================
            APPENDIX — per-week premium bookings
           ============================================================ */}
        <section className="mb-page mb-break-before">
          <BrandHeader city={city} state={state} today={today} />
          <SectionHead n={8} label="Appendix — Per-Week Premium Bookings"
            sub={`${weeksDetailed.filter(w => premium.some(p => p.id === w.provider_id)).length} provider×week rows from mvs_weeks (premium tier only).`} />
          {fetchingExtras ? (
            <p style={{ fontSize: 12, color: "var(--mb-muted)" }}><Loader2 size={12} className="animate-spin" style={{ display: "inline" }} /> Loading appendix…</p>
          ) : (
            <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--mb-navy)", color: "white" }}>
                  <th style={{ textAlign: "left", padding: "8px 10px" }}>Provider</th>
                  <th style={{ textAlign: "left", padding: "8px 10px" }}>Week start</th>
                  <th style={{ textAlign: "left", padding: "8px 10px" }}>Week end</th>
                  <th style={{ textAlign: "left", padding: "8px 10px" }}>Status</th>
                  <th style={{ textAlign: "right", padding: "8px 10px" }}>Conf.</th>
                </tr>
              </thead>
              <tbody>
                {weeksDetailed
                  .filter((w) => premium.some((p) => p.id === w.provider_id))
                  .sort((a, b) => a.provider_name.localeCompare(b.provider_name) || a.week_start.localeCompare(b.week_start))
                  .map((r, i) => (
                    <tr key={`${r.provider_id}-${r.week_start}`} style={{ background: i % 2 === 1 ? "var(--mb-soft)" : "white", borderBottom: "1px solid var(--mb-line)" }}>
                      <td style={{ padding: "6px 10px", fontWeight: 600 }}>{r.provider_name}</td>
                      <td className="mb-mono" style={{ padding: "6px 10px" }}>{r.week_start}</td>
                      <td className="mb-mono" style={{ padding: "6px 10px" }}>{r.week_end ?? "—"}</td>
                      <td style={{ padding: "6px 10px" }}><StatusPill status={r.status} /></td>
                      <td className="mb-mono" style={{ padding: "6px 10px", textAlign: "right" }}>
                        {r.confidence != null ? r.confidence.toFixed(2) : "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
          <p style={{ marginTop: 18, fontSize: 10, color: "var(--mb-muted)", lineHeight: 1.6 }}>
            Appendix data pulled at render time directly from <span className="mb-mono">mvs_weeks</span>.
            Shown for transparency only — Market Absorption was removed from the composite in v1.1.
          </p>
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  const color = tone === "warn" ? "#ffd9d9" : tone === "ok" ? "#c7f5dc" : "white";
  return (
    <div>
      <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 9, letterSpacing: 2, textTransform: "uppercase" }}>{label}</div>
      <div className="mb-mono" style={{ color, fontSize: 14, fontWeight: 700, marginTop: 3 }}>{value}</div>
    </div>
  );
}

function Callout({ tone, title, children }: { tone: "ok" | "warn"; title: string; children: React.ReactNode }) {
  const bg = tone === "ok" ? "#e9f7ee" : "#fce7ec";
  const fg = tone === "ok" ? "#1d6b32" : "#a3142b";
  const border = tone === "ok" ? "#bfe6cc" : "#f5c2cb";
  return (
    <div style={{ padding: 14, borderRadius: 10, background: bg, border: `1px solid ${border}` }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: fg, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--mb-navy)" }}>{children}</div>
    </div>
  );
}

function BrandHeader({ city, state, today }: { city: string; state: string; today: string }) {
  return (
    <div className="mb-avoid-break" style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      paddingBottom: 12, borderBottom: "1px solid var(--mb-line)", marginBottom: 4,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <img src={logoUrl} alt="" style={{ height: 18, width: 18 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--mb-navy)", letterSpacing: 0.5 }}>NEURON GARAGE</span>
        <span style={{ fontSize: 11, color: "var(--mb-muted)" }}>· Market Validation Brief</span>
      </div>
      <div style={{ fontSize: 10, color: "var(--mb-muted)", letterSpacing: 0.5 }}>
        {city}, {state} · {today}
      </div>
    </div>
  );
}
