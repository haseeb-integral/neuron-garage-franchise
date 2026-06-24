// SAS Brief — gorgeous web page that doubles as a print-quality PDF.
//
// Mirrors src/pages/MarketBrief.tsx: dark navy gradient cover, Fraunces
// serif title, donut, pillar bars. The payload is handed off via
// sessionStorage by the Site Analysis page — too big for URL params.
// Print to PDF: Cmd/Ctrl + P → Save as PDF. No auto-download.

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Printer, ArrowLeft } from "lucide-react";
import logoUrl from "@/assets/neuron-garage-logo.png";
import {
  VERDICT_LABEL,
  fmtMoney,
  fmtPct,
  fmtCount,
  fmtMi,
  tierColor,
  verdictSentence,
  strengthsBullets,
  risksBullets,
  opportunitiesBullets,
  summaryBullets,
  PILLAR_ORDER,
} from "@/lib/sitePack/copy";
import type { SitePackCandidate } from "@/lib/sitePack/SitePackDocument";
import "@/styles/sas-brief-print.css";

// ---------------------------------------------------------------------------
// Visual primitives
// ---------------------------------------------------------------------------

function CompositeDonut({
  value,
  label,
  size = 260,
}: {
  value: number | null;
  label: string;
  size?: number;
}) {
  const v = value ?? 0;
  const pct = Math.max(0, Math.min(100, v));
  const r = (size - 22) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id="sb-donut-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9bb4ff" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.14)"
        strokeWidth={12}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="url(#sb-donut-grad)"
        strokeWidth={12}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="48%"
        textAnchor="middle"
        fill="white"
        fontFamily="Fraunces, serif"
        fontSize={size * 0.32}
        fontWeight={700}
        dominantBaseline="middle"
      >
        {value != null ? Math.round(value) : "—"}
      </text>
      <text
        x="50%"
        y="68%"
        textAnchor="middle"
        fill="rgba(255,255,255,0.7)"
        fontFamily="Inter, sans-serif"
        fontSize={11}
        letterSpacing={2}
      >
        {label}
      </text>
    </svg>
  );
}

function PillarBar({ value, weight }: { value: number; weight: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const color =
    value >= 70
      ? "linear-gradient(90deg, #14b87a, #0a8c5b)"
      : value >= 50
      ? "linear-gradient(90deg, #3a6cf5, #174be8)"
      : value >= 30
      ? "linear-gradient(90deg, #f7b955, #e08a1a)"
      : "linear-gradient(90deg, #ef5d72, #c41a36)";
  return (
    <div className="sb-avoid-break" style={{ marginTop: 6 }}>
      <div
        style={{
          position: "relative",
          height: 10,
          borderRadius: 999,
          background: "var(--sb-line)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: 999,
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10,
          color: "var(--sb-muted)",
          marginTop: 4,
        }}
      >
        <span>weight {(weight * 100).toFixed(0)}%</span>
        <span>contributes {(value * weight).toFixed(1)} pts</span>
      </div>
    </div>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 999,
        background: color + "1f",
        color,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.3,
      }}
    >
      {label}
    </span>
  );
}

function SectionHead({ n, label, sub }: { n: number | string; label: string; sub?: string }) {
  return (
    <header className="sb-avoid-break" style={{ marginTop: 26, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 11,
            color: "var(--sb-blue)",
            letterSpacing: 1,
          }}
        >
          §{typeof n === "number" ? String(n).padStart(2, "0") : n}
        </span>
        <h2 className="sb-serif" style={{ fontSize: 24, fontWeight: 600, margin: 0, color: "var(--sb-navy)" }}>
          {label}
        </h2>
      </div>
      {sub && (
        <p style={{ margin: "4px 0 0 30px", color: "var(--sb-muted)", fontSize: 12 }}>{sub}</p>
      )}
      <div
        style={{
          marginTop: 10,
          height: 2,
          background: "linear-gradient(90deg, var(--sb-blue), transparent)",
          borderRadius: 2,
        }}
      />
    </header>
  );
}

function BrandHeader({ today, title }: { today: string; title: string }) {
  return (
    <div
      className="sb-avoid-break"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: 10,
        marginBottom: 14,
        borderBottom: "1px solid var(--sb-line)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <img src={logoUrl} alt="Neuron Garage" style={{ height: 18, width: 18 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--sb-navy)", letterSpacing: 0.5 }}>
          NEURON GARAGE
        </span>
        <span style={{ fontSize: 10, color: "var(--sb-muted)" }}>· SAS Report</span>
      </div>
      <div style={{ fontSize: 10, color: "var(--sb-muted)" }}>
        {title} · {today}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color = "rgba(255,255,255,0.95)",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 9,
          letterSpacing: 2,
          color: "rgba(255,255,255,0.55)",
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div className="sb-serif" style={{ fontSize: 18, color, fontWeight: 600, lineHeight: 1.1 }}>
        {value}
      </div>
    </div>
  );
}

function KvBlock({ rows }: { rows: [string, string][] }) {
  return (
    <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
      <tbody>
        {rows.map(([k, v], i) => (
          <tr key={k} style={{ background: i % 2 === 1 ? "var(--sb-soft)" : "white" }}>
            <td style={{ padding: "6px 10px", color: "var(--sb-muted)" }}>{k}</td>
            <td
              className="sb-mono"
              style={{
                padding: "6px 10px",
                textAlign: "right",
                fontWeight: 600,
                color: "var(--sb-navy)",
              }}
            >
              {v}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BulletList({ items, dotColor }: { items: string[]; dotColor: string }) {
  return (
    <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
      {items.map((it, i) => (
        <li
          key={i}
          className="sb-avoid-break"
          style={{ display: "flex", gap: 10, marginBottom: 6, fontSize: 12, lineHeight: 1.55 }}
        >
          <span style={{ color: dotColor, fontWeight: 700, lineHeight: 1.4 }}>•</span>
          <span style={{ flex: 1, color: "var(--sb-navy)" }}>{it}</span>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface BriefPayload {
  candidates: SitePackCandidate[];
  generatedAt: string;
}

export default function SiteBrief() {
  const [params] = useSearchParams();
  const key = params.get("key") ?? "";
  const [payload, setPayload] = useState<BriefPayload | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!key) {
      setMissing(true);
      return;
    }
    try {
      // Primary handoff: read from window.opener (Site Analysis page stashes
      // the payload there so we don't hit the 5 MB localStorage cap that was
      // silently dropping candidates when map PNGs were large).
      const opener = window.opener as
        | { __nrgSasBrief?: Map<string, BriefPayload> }
        | null
        | undefined;
      const fromOpener = opener?.__nrgSasBrief?.get(key);
      if (fromOpener) {
        setPayload(fromOpener);
        try {
          opener!.__nrgSasBrief!.delete(key);
        } catch {
          /* ignore */
        }
        return;
      }
      // Fallback for tab reloads (opener cleared) or older links.
      const raw = localStorage.getItem(key) ?? sessionStorage.getItem(key);
      if (!raw) {
        setMissing(true);
        return;
      }
      setPayload(JSON.parse(raw) as BriefPayload);
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    } catch (err) {
      console.error("Failed to read SAS brief payload", err);
      setMissing(true);
    }
  }, [key]);

  const top = useMemo(() => {
    if (!payload?.candidates?.length) return null;
    const scored = payload.candidates.filter((c) => c.composite != null);
    if (!scored.length) return null;
    return [...scored].sort((a, b) => (b.composite ?? 0) - (a.composite ?? 0))[0];
  }, [payload]);

  useEffect(() => {
    if (top) document.title = `SAS Brief — ${top.schoolName}`;
  }, [top]);

  if (missing) {
    return (
      <div style={{ padding: 60, fontFamily: "Inter, sans-serif", color: "#07142f" }}>
        <h1>SAS Brief</h1>
        <p>
          This brief link has expired or is missing. Briefs are stored only in the tab they were
          opened from.
        </p>
        <Link to="/site-analysis" style={{ color: "#174be8" }}>
          ← Back to Site Analysis
        </Link>
      </div>
    );
  }
  if (!payload) {
    return (
      <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", color: "#07142f" }}>
        Loading SAS brief…
      </div>
    );
  }

  const today = new Date(payload.generatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const candidates = payload.candidates;
  // `top` is the highest scored candidate; falls back to the first card if
  // nothing is scored yet so the cover still renders (Option B — un-scored
  // cards still appear in the brief, just with "—" in the score cells).
  const topOrFallback = top ?? candidates[0];
  const topVerdictColor = tierColor(topOrFallback.tierLabel);

  return (
    <div className="sb-doc">
      {/* Floating toolbar — screen only */}
      <div
        className="sb-no-print"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid #e5eaf2",
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Link
          to="/site-analysis"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "#174be8",
            textDecoration: "none",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={14} /> Back to Site Analysis
        </Link>
        <div style={{ fontSize: 12, color: "#526078" }}>
          Tip: <strong>Cmd/Ctrl + P</strong> → Save as PDF for a branded printout.
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "#07142f",
            color: "white",
            border: "none",
            padding: "8px 14px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <Printer size={14} /> Print / Save as PDF
        </button>
      </div>

      <div style={{ padding: "24px 0" }}>
        {/* ============================================================
            COVER
           ============================================================ */}
        <section className="sb-page sb-page--cover">
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "radial-gradient(40% 30% at 12% 18%, rgba(155,180,255,0.18), transparent 70%), radial-gradient(50% 40% at 88% 90%, rgba(201,161,74,0.10), transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "relative",
              padding: "0.7in 0.7in 0.5in",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <img
                src={logoUrl}
                alt="Neuron Garage"
                style={{ height: 28, width: 28, filter: "brightness(0) invert(1)" }}
              />
              <div style={{ color: "white", fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>
                NEURON GARAGE
              </div>
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.65)",
                fontSize: 10,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              Confidential · Internal
            </div>
          </div>

          <div
            style={{
              position: "relative",
              padding: "0.4in 0.7in 0",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div
              style={{
                color: "rgba(255,255,255,0.65)",
                fontSize: 11,
                letterSpacing: 3,
                textTransform: "uppercase",
              }}
            >
              Site Analysis Report
            </div>
            <h1
              className="sb-serif"
              style={{
                color: "white",
                fontSize: 68,
                fontWeight: 600,
                lineHeight: 0.98,
                margin: "8px 0 0",
                letterSpacing: "-0.025em",
              }}
            >
              {topOrFallback.schoolName}
            </h1>
            <div
              className="sb-serif"
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: 22,
                fontWeight: 400,
                fontStyle: "italic",
                marginTop: 4,
              }}
            >
              {topOrFallback.address}
            </div>
          </div>

          <div
            style={{
              position: "relative",
              padding: "0.5in 0.7in 0",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 40,
              alignItems: "center",
            }}
          >
            <div>
              <p
                style={{
                  color: "rgba(255,255,255,0.78)",
                  fontSize: 14,
                  lineHeight: 1.65,
                  maxWidth: 460,
                  margin: 0,
                }}
              >
                A live, recomputed look at premium daycare and school site fit at {topOrFallback.schoolName} —
                school profile, neighborhood affluence, family density, ecosystem, and accessibility.
                Every number on every page is pulled from the same scoring helper that drives the
                on-screen SAS cards.
              </p>
              <div
                style={{
                  marginTop: 28,
                  display: "grid",
                  gridTemplateColumns: "repeat(4, auto)",
                  gap: 28,
                }}
              >
                <Stat label="Generated" value={today} />
                <Stat label="Candidates" value={String(candidates.length)} />
                <Stat label="Top SAS" value={topOrFallback.composite != null ? String(topOrFallback.composite) : "—"} />
                <Stat label="User Confidence" value={topOrFallback.tierLabel.toUpperCase()} />
              </div>
            </div>
            <CompositeDonut value={topOrFallback.composite} label="SAS COMPOSITE" size={240} />
          </div>

          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "0.4in 0.7in",
              display: "flex",
              justifyContent: "space-between",
              color: "rgba(255,255,255,0.5)",
              fontSize: 10,
              letterSpacing: 1,
              textTransform: "uppercase",
              borderTop: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <span>SAS · v2.2 · 25 / 25 / 20 / 15 / 15 weighting</span>
            <span>neurongarage.com</span>
          </div>
        </section>

        {/* ============================================================
            EXECUTIVE SUMMARY (lists every candidate at a glance)
           ============================================================ */}
        <section className="sb-page sb-break-before">
          <BrandHeader today={today} title="Executive Summary" />
          <SectionHead
            n={1}
            label="Candidates at a glance"
            sub={`${candidates.length} site${candidates.length === 1 ? "" : "s"} analyzed · all numbers recomputed from the same helper as the on-screen SAS cards.`}
          />

          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--sb-navy)", color: "white" }}>
                <th style={{ textAlign: "left", padding: "9px 10px", fontSize: 11 }}>Candidate</th>
                <th style={{ textAlign: "right", padding: "9px 10px", fontSize: 11 }}>SAS</th>
                <th style={{ textAlign: "center", padding: "9px 10px", fontSize: 11 }}>
                  Confidence band
                </th>
                <th style={{ textAlign: "center", padding: "9px 10px", fontSize: 11 }}>
                  User confidence
                </th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c, i) => (
                <tr
                  key={c.address + i}
                  style={{
                    background: i % 2 === 1 ? "var(--sb-soft)" : "white",
                    borderBottom: "1px solid var(--sb-line)",
                  }}
                >
                  <td style={{ padding: "9px 10px", fontWeight: 600 }}>
                    <div>{c.schoolName}</div>
                    <div style={{ fontSize: 10, color: "var(--sb-muted)", fontWeight: 400 }}>
                      {c.address}
                    </div>
                  </td>
                  <td
                    className="sb-mono"
                    style={{
                      padding: "9px 10px",
                      textAlign: "right",
                      fontWeight: 700,
                      color: c.composite != null ? "var(--sb-navy)" : "var(--sb-muted)",
                    }}
                  >
                    {c.composite ?? "—"}
                  </td>
                  <td style={{ padding: "9px 10px", textAlign: "center" }}>
                    {c.composite != null ? (
                      <Chip label={c.tierLabel} color={tierColor(c.tierLabel)} />
                    ) : (
                      <Chip label="Not yet scored" color="#94a3b8" />
                    )}
                  </td>
                  <td style={{ padding: "9px 10px", textAlign: "center", color: "var(--sb-muted)" }}>
                    {VERDICT_LABEL[c.decision?.verdict ?? "undecided"]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Top candidate headline card */}
          <SectionHead n={2} label="Top-ranked candidate" sub={topOrFallback.schoolName} />
          <aside
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: 24,
              alignItems: "center",
              padding: 20,
              borderRadius: 12,
              background: "var(--sb-cream)",
              border: "1px solid #efe7d8",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                className="sb-serif"
                style={{ fontSize: 64, fontWeight: 700, lineHeight: 1, color: "var(--sb-navy)" }}
              >
                {topOrFallback.composite ?? "—"}
              </div>
              <div style={{ fontSize: 10, color: "var(--sb-muted)", letterSpacing: 1, marginTop: 4 }}>
                SAS · /100
              </div>
            </div>
            <div>
              <Chip
                label={topOrFallback.composite != null ? `User Confidence: ${topOrFallback.tierLabel}` : "Not yet scored"}
                color={topOrFallback.composite != null ? topVerdictColor : "#94a3b8"}
              />
              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: "var(--sb-navy)",
                }}
              >
                {topOrFallback.composite != null
                  ? verdictSentence({
                      schoolName: topOrFallback.schoolName,
                      composite: topOrFallback.composite,
                      tierLabel: topOrFallback.tierLabel,
                    })
                  : `${topOrFallback.schoolName} has not been scored yet. Run analysis to populate scores.`}
              </p>
            </div>
          </aside>
        </section>

        {/* ============================================================
            PER-CANDIDATE DETAIL PAGES
           ============================================================ */}
        {candidates.map((c, idx) => {
          const acs10 = c.signals?.acs10;
          const acs15 = c.signals?.acs15;
          const eco = c.signals?.ecosystem;
          const acc = c.signals?.accessibility;
          const color = tierColor(c.tierLabel);

          // Un-scored card — render a minimal "Not yet scored" page (Option B).
          if (c.composite == null || c.pillars == null) {
            return (
              <section key={c.address + idx} className="sb-page sb-break-before">
                <BrandHeader today={today} title={c.schoolName} />
                <SectionHead
                  n={`C${idx + 1}`}
                  label={c.schoolName}
                  sub={`${c.address} · ${c.schoolTypeLabel} · ${c.gradeBandLabel}`}
                />
                <div
                  className="sb-avoid-break"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "180px 1fr",
                    gap: 20,
                    padding: 16,
                    borderRadius: 10,
                    background: "var(--sb-soft)",
                    border: "1px solid var(--sb-line)",
                    borderLeft: "3px solid #94a3b8",
                  }}
                >
                  <div style={{ textAlign: "center", alignSelf: "center" }}>
                    <div
                      className="sb-serif"
                      style={{ fontSize: 52, fontWeight: 700, lineHeight: 1, color: "var(--sb-muted)" }}
                    >
                      —
                    </div>
                    <div
                      style={{ fontSize: 10, color: "var(--sb-muted)", letterSpacing: 1, marginTop: 4 }}
                    >
                      SAS COMPOSITE
                    </div>
                  </div>
                  <div>
                    <Chip label="Not yet scored" color="#94a3b8" />
                    <p
                      style={{
                        margin: "10px 0 0",
                        fontSize: 12.5,
                        lineHeight: 1.55,
                        color: "var(--sb-navy)",
                      }}
                    >
                      This site has not been scored yet. Run analysis on the Site Analysis page to
                      populate pillar scores, neighborhood signals, and the drive-time map for this
                      candidate. It is included in the brief so the comparison set matches the cards
                      you saw on screen.
                    </p>
                  </div>
                </div>
              </section>
            );
          }

          return (
            <section key={c.address + idx} className="sb-page sb-break-before">
              <BrandHeader today={today} title={c.schoolName} />

              <SectionHead
                n={`C${idx + 1}`}
                label={c.schoolName}
                sub={`${c.address} · ${c.schoolTypeLabel} · ${c.gradeBandLabel}`}
              />


              {/* Exec card */}
              <div
                className="sb-avoid-break"
                style={{
                  display: "grid",
                  gridTemplateColumns: "180px 1fr",
                  gap: 20,
                  padding: 16,
                  borderRadius: 10,
                  background: "var(--sb-soft)",
                  border: "1px solid var(--sb-line)",
                  borderLeft: `3px solid ${color}`,
                  marginBottom: 18,
                }}
              >
                <div style={{ textAlign: "center", alignSelf: "center" }}>
                  <div
                    className="sb-serif"
                    style={{
                      fontSize: 52,
                      fontWeight: 700,
                      lineHeight: 1,
                      color: "var(--sb-navy)",
                    }}
                  >
                    {c.composite}
                  </div>
                  <div
                    style={{ fontSize: 10, color: "var(--sb-muted)", letterSpacing: 1, marginTop: 4 }}
                  >
                    SAS COMPOSITE
                  </div>
                </div>
                <div>
                  <Chip label={`User Confidence: ${c.tierLabel}`} color={color} />
                  <p
                    style={{
                      margin: "10px 0 0",
                      fontSize: 12.5,
                      lineHeight: 1.55,
                      color: "var(--sb-navy)",
                    }}
                  >
                    {verdictSentence({
                      schoolName: c.schoolName,
                      composite: c.composite,
                      tierLabel: c.tierLabel,
                    })}
                  </p>
                </div>
              </div>

              {/* Pillar scores */}
              <SectionHead n="P" label="Pillar scores" sub="25 / 25 / 20 / 15 / 15 weighting" />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                  marginBottom: 18,
                }}
              >
                {PILLAR_ORDER.map((p) => {
                  const v = c.pillars[p.key];
                  const w = parseFloat(p.weight) / 100;
                  return (
                    <div
                      key={p.key}
                      className="sb-avoid-break"
                      style={{
                        padding: 14,
                        borderRadius: 8,
                        border: "1px solid var(--sb-line)",
                        background: "white",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                          gap: 10,
                        }}
                      >
                        <div
                          className="sb-serif"
                          style={{ fontSize: 14, fontWeight: 600, color: "var(--sb-navy)" }}
                        >
                          {p.label}
                        </div>
                        <div
                          className="sb-mono"
                          style={{
                            fontSize: 20,
                            fontWeight: 700,
                            color: "var(--sb-navy)",
                            lineHeight: 1,
                          }}
                        >
                          {v}
                        </div>
                      </div>
                      <PillarBar value={v} weight={w} />
                    </div>
                  );
                })}
              </div>

              {/* Signals — affluence + map */}
              <SectionHead n="S" label="Neighborhood affluence (10 / 15-min drive)" />
              <KvBlock
                rows={[
                  ["Median HHI · 10-min", fmtMoney(acs10?.medianHhi)],
                  ["Median HHI · 15-min", fmtMoney(acs15?.medianHhi)],
                  ["Households > $150K · 10-min", fmtPct(acs10?.pctAbove150k)],
                  ["Households > $150K · 15-min", fmtPct(acs15?.pctAbove150k)],
                ]}
              />
              {c.mapPngDataUrl ? (
                <div
                  className="sb-avoid-break"
                  style={{
                    marginTop: 10,
                    border: "1px solid var(--sb-line)",
                    borderRadius: 8,
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={c.mapPngDataUrl}
                    alt="Isochrone map"
                    style={{ width: "100%", display: "block" }}
                  />
                  <div
                    style={{
                      padding: "6px 10px",
                      fontSize: 10,
                      color: "var(--sb-muted)",
                      fontStyle: "italic",
                      background: "var(--sb-soft)",
                    }}
                  >
                    10-minute (inner) and 15-minute (outer) drive-time isochrones around the candidate
                    address.
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 11, color: "var(--sb-muted)", fontStyle: "italic", marginTop: 8 }}>
                  Isochrone map unavailable — re-run the engine to generate drive-time rings.
                </p>
              )}

              <SectionHead n="F" label="Family density & ecosystem" />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <KvBlock
                  rows={[
                    ["Children 5–12 · 10-min", fmtCount(acs10?.children5to12)],
                    ["Children 5–12 · 15-min", fmtCount(acs15?.children5to12)],
                    ["Total population · 15-min", fmtCount(acs15?.totalPop)],
                  ]}
                />
                <KvBlock
                  rows={[
                    ["Elementary schools nearby", fmtCount(eco?.elementaryCount)],
                    ["Private schools nearby", fmtCount(eco?.privateCount)],
                    ["Nearby student population", fmtCount(eco?.nearbyStudentPop)],
                  ]}
                />
              </div>

              <SectionHead n="A" label="Accessibility" />
              <KvBlock
                rows={[
                  ["Distance to major road", fmtMi(acc?.roadDistanceMi)],
                  ["Distance to highway", fmtMi(acc?.highwayDistanceMi)],
                  ["Population reachable · 15-min", fmtCount(acs15?.totalPop)],
                ]}
              />

              {/* Strengths / Risks / Opportunities */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 18,
                  marginTop: 18,
                }}
              >
                <div>
                  <SectionHead n="+" label="Strengths" />
                  <BulletList items={strengthsBullets(c.pillars)} dotColor="var(--sb-green)" />
                </div>
                <div>
                  <SectionHead n="!" label="Risks" />
                  <BulletList items={risksBullets(c.pillars)} dotColor="var(--sb-red)" />
                </div>
                <div>
                  <SectionHead n="o" label="Opportunities" />
                  <BulletList items={opportunitiesBullets(c.pillars)} dotColor="var(--sb-amber)" />
                </div>
                <div>
                  <SectionHead n="→" label="Summary & next steps" />
                  <BulletList
                    items={summaryBullets({
                      tierLabel: c.tierLabel,
                      verdict: c.decision?.verdict,
                      notes: c.decision?.notes,
                    })}
                    dotColor="var(--sb-blue)"
                  />
                </div>
              </div>
            </section>
          );
        })}

        {/* ============================================================
            COMPARISON
           ============================================================ */}
        {candidates.length > 1 && (
          <section className="sb-page sb-break-before">
            <BrandHeader today={today} title="Side-by-side comparison" />
            <SectionHead
              n={9}
              label="Side-by-side comparison"
              sub="Up to 4 candidates · all numbers recomputed from the same calibrated helper."
            />
            <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--sb-blue-soft)" }}>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "9px 10px",
                      fontSize: 11,
                      color: "var(--sb-navy)",
                    }}
                  >
                    Metric
                  </th>
                  {candidates.slice(0, 4).map((c, i) => (
                    <th
                      key={i}
                      style={{
                        textAlign: "center",
                        padding: "9px 10px",
                        fontSize: 11,
                        color: "var(--sb-navy)",
                      }}
                    >
                      {c.schoolName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    label: "Address",
                    values: candidates.slice(0, 4).map((c) => c.address.split(",")[0] ?? c.address),
                  },
                  {
                    label: "SAS Composite",
                    values: candidates.slice(0, 4).map((c) => String(c.composite)),
                    bold: true,
                  },
                  {
                    label: "Confidence band",
                    values: candidates.slice(0, 4).map((c) => c.tierLabel),
                    colors: candidates.slice(0, 4).map((c) => tierColor(c.tierLabel)),
                    bold: true,
                  },
                  ...PILLAR_ORDER.map((p) => ({
                    label: `${p.label} (${p.weight})`,
                    values: candidates.slice(0, 4).map((c) => String(c.pillars[p.key])),
                  })),
                  {
                    label: "User confidence",
                    values: candidates
                      .slice(0, 4)
                      .map((c) => VERDICT_LABEL[c.decision?.verdict ?? "undecided"]),
                  },
                ].map((r, ri) => (
                  <tr
                    key={r.label}
                    style={{
                      background: ri % 2 === 1 ? "var(--sb-soft)" : "white",
                      borderBottom: "1px solid var(--sb-line)",
                    }}
                  >
                    <td
                      style={{
                        padding: "8px 10px",
                        color: "var(--sb-muted)",
                        fontWeight: 600,
                      }}
                    >
                      {r.label}
                    </td>
                    {r.values.map((v, ci) => (
                      <td
                        key={ci}
                        className="sb-mono"
                        style={{
                          padding: "8px 10px",
                          textAlign: "center",
                          color: (r as { colors?: string[] }).colors?.[ci] ?? "var(--sb-navy)",
                          fontWeight: (r as { bold?: boolean }).bold ? 700 : 400,
                        }}
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p
              style={{
                fontSize: 10,
                color: "var(--sb-muted)",
                fontStyle: "italic",
                marginTop: 14,
              }}
            >
              All pillar and composite scores in this report are read from recomputeSiteScores — the
              same helper used by the on-screen SAS cards. No stored DB values are displayed.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
