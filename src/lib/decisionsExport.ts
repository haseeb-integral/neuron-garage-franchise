/**
 * Phase 2 demo — export helpers for Brett's decisions.
 *
 * 1A: CSV (scores + verdicts + notes).
 * 1B: branded print-to-PDF window (uses the browser's native print dialog —
 *      no map vendor or PDF engine wired up yet).
 */

import type { MarketDecisionRow, MarketVerdict } from "@/hooks/useMarketDecisions";
import type { SiteDecisionRow, SiteVerdict } from "@/hooks/useSiteDecisions";
import type { ShortlistRow } from "@/data/phase2DemoData";
import type { SiteAnalysisDemoSite } from "@/data/phase2DemoData";

const VERDICT_LABEL: Record<MarketVerdict, string> = {
  pursue: "Pursue",
  hold: "Hold",
  drop: "Drop",
  undecided: "Undecided",
};

const SITE_VERDICT_LABEL: Record<SiteVerdict, string> = {
  recommend: "Recommend",
  worth_a_look: "Worth a look",
  dont_recommend: "Don't recommend",
  undecided: "Undecided",
};

function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportMarketDecisionsCsv(
  shortlist: ShortlistRow[],
  byCity: Map<string, MarketDecisionRow>,
) {
  const headers = [
    "city_id",
    "city",
    "state",
    "pcc_score",
    "tier_demo",
    "pricing",
    "absorption",
    "scaled_op",
    "diversity",
    "depth",
    "balance_band",
    "verdict",
    "notes",
    "decided_at",
  ];
  const rows = shortlist.map((c) => {
    const d = byCity.get(c.id);
    return [
      c.id,
      c.city,
      c.state,
      c.composite,
      c.tier,
      c.pricing,
      c.absorption,
      c.scaledOperator,
      c.diversity,
      c.depth,
      c.balanceBand,
      VERDICT_LABEL[d?.verdict ?? "undecided"],
      d?.notes ?? "",
      d?.decided_at ?? "",
    ].map(csvCell).join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `market-validation-decisions-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportSiteDecisionPack(
  sites: SiteAnalysisDemoSite[],
  byAddress: Map<string, SiteDecisionRow>,
) {
  const winner = sites.find((s) => byAddress.get(s.address)?.is_winner);
  const generatedAt = new Date().toLocaleString();

  const cardHtml = sites
    .map((s) => {
      const d = byAddress.get(s.address);
      const verdict = SITE_VERDICT_LABEL[d?.verdict ?? "undecided"];
      const isWinner = d?.is_winner;
      return `
      <div class="card ${isWinner ? "winner" : ""}">
        <div class="card-h">
          <div>
            <h3>${escapeHtml(s.schoolName)}${isWinner ? ' <span class="winner-tag">★ Winner</span>' : ""}</h3>
            <p class="muted">${escapeHtml(s.address)}</p>
          </div>
          <div class="score">
            <div class="score-num">${s.composite}</div>
            <div class="score-lbl">Site Opportunity</div>
          </div>
        </div>
        <p class="verdict">Brett/Sam's verdict: <strong>${verdict}</strong></p>
        <p>${escapeHtml(s.verdict)}</p>
        ${d?.notes ? `<div class="notes"><strong>Notes:</strong> ${escapeHtml(d.notes)}</div>` : ""}
        <table class="subs">
          <tr><td>School Profile (25%)</td><td>${s.subScores.schoolProfile.value}</td></tr>
          <tr><td>Neighborhood Affluence (25%)</td><td>${s.subScores.neighborhoodAffluence.value}</td></tr>
          <tr><td>Family Density (20%)</td><td>${s.subScores.familyDensity.value}</td></tr>
          <tr><td>School Ecosystem (15%)</td><td>${s.subScores.schoolEcosystem.value}</td></tr>
          <tr><td>Accessibility (15%)</td><td>${s.subScores.accessibility.value}</td></tr>
        </table>
      </div>`;
    })
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Site Analysis Decision Pack</title>
<style>
  body{font-family:Arial,sans-serif;color:#07142f;margin:32px;}
  h1{color:#174be8;margin:0 0 4px;}
  .meta{color:#526078;font-size:12px;margin-bottom:24px;}
  .winner-banner{background:#e3f3e7;border-left:4px solid #1d6b32;padding:12px 16px;margin-bottom:24px;border-radius:4px;}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
  .card{border:1px solid #ccc;border-radius:8px;padding:16px;page-break-inside:avoid;}
  .card.winner{border:2px solid #1d6b32;background:#f6fbf7;}
  .winner-tag{background:#1d6b32;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;margin-left:6px;}
  .card-h{display:flex;justify-content:space-between;align-items:flex-start;}
  .card h3{margin:0;font-size:14px;}
  .muted{color:#526078;font-size:12px;margin:4px 0 8px;}
  .score{text-align:right;}
  .score-num{font-size:28px;font-weight:900;}
  .score-lbl{font-size:10px;color:#526078;text-transform:uppercase;}
  .verdict{background:#eef2f7;padding:8px;border-radius:4px;font-size:13px;margin:8px 0;}
  .notes{background:#fff8d9;padding:8px;border-radius:4px;font-size:12px;margin:8px 0;}
  .subs{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;}
  .subs td{padding:4px 6px;border-top:1px solid #eef2f7;}
  .subs td:last-child{text-align:right;font-weight:700;}
  footer{margin-top:32px;font-size:11px;color:#526078;border-top:1px solid #eef2f7;padding-top:12px;}
  @media print {body{margin:16px;}}
</style></head><body>
  <h1>Site Analysis Decision Pack</h1>
  <div class="meta">Neuron Garage · Phase 2 Feature 1B · Generated ${escapeHtml(generatedAt)}</div>
  ${winner
    ? `<div class="winner-banner"><strong>Chosen site:</strong> ${escapeHtml(winner.schoolName)} — ${escapeHtml(winner.address)} (Site Opportunity Score: ${winner.composite})</div>`
    : `<div class="winner-banner" style="background:#fff1d6;border-left-color:#925100;"><strong>No winner selected.</strong> Compare the candidates below.</div>`}
  <div class="grid">${cardHtml}</div>
  <footer>Phase 2 demo — isochrones and live data not yet wired. Formulas locked in <code>.lovable/phase-2/phase-2-sow.md</code> Item 2.</footer>
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
