import { useEffect, useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CityData } from "@/data/cityData";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getSignalGeography, GEO_BADGE_CLASS } from "@/lib/signalGeography";

interface Props {
  open: boolean;
  onClose: () => void;
  market: CityData;
  categoryScores: Record<string, number>;
  refreshVersion?: number;
  autoDownload?: boolean;
}

type MetricStatus = "live" | "proxy" | "missing" | "blocked" | "manual";
type MetricCategory =
  | "demand"
  | "pricing_power"
  | "competitive_landscape"
  | "franchisee_supply"
  | "ease_of_operations"
  | "parent_mindset";

type LiveSignal = {
  id?: string;
  signal_key?: string;
  label?: string;
  value?: string | number | null;
  source?: string | null;
  source_url?: string | null;
  confidence?: number | null;
  raw_data?: {
    status?: MetricStatus;
    metric_category?: MetricCategory;
    used_in_score?: boolean;
    notes?: string | null;
    [key: string]: unknown;
  } | null;
};

type LiveCompetitor = {
  id?: string;
  name?: string;
  type?: string | null;
  category?: string | null;
  source?: string | null;
  source_url?: string | null;
};

function buildSeededFallbackSignals(market: CityData): LiveSignal[] {
  const scored = (market as any).scored;
  if (!scored) return [];
  const childrenPct = Number((market as any).childrenPct ?? (market as any).children_pct ?? 0);
  const seeded = (
    signal_key: string,
    label: string,
    value: string | number | null | undefined,
    metric_category: MetricCategory,
    used_in_score: boolean,
  ): LiveSignal => ({
    signal_key,
    label,
    value: value ?? null,
    source: "Pre-seeded",
    raw_data: { status: "proxy", used_in_score, metric_category },
  });
  return [
    seeded("children_5_12_count", "Children Ages 5–12", scored.children_5_12, "demand", true),
    seeded("children_5_12_pct", "% Population Ages 5–12", childrenPct || null, "demand", true),
    seeded("median_household_income", "Median Household Income", scored.median_household_income, "demand", true),
    seeded("public_elementary_count", "Public elementary schools (NCES CCD)", scored.public_elementary_count, "franchisee_supply", true),
    seeded("public_elementary_enrollment", "Public elementary enrollment", scored.public_elementary_enrollment, "franchisee_supply", false),
    seeded("competitor_count", "Summer camps / enrichment competitors", scored.summer_camp_count, "competitive_landscape", true),
  ].filter((row) => row.value != null);
}

const CAT_LABELS: { key: string; dbKey: MetricCategory; label: string }[] = [
  { key: "demand", dbKey: "demand", label: "Demand" },
  { key: "pricingPower", dbKey: "pricing_power", label: "Pricing Power" },
  { key: "competitiveLandscape", dbKey: "competitive_landscape", label: "Competitive Landscape" },
  { key: "franchiseeSupply", dbKey: "franchisee_supply", label: "Franchisee Supply" },
  { key: "easeOfOperations", dbKey: "ease_of_operations", label: "Ease of Operations" },
  { key: "parentMindset", dbKey: "parent_mindset", label: "Parent Mindset" },
];

const PRIORITY_SIGNAL_KEYS = [
  "median_household_income",
  "income_100k_plus_pct",
  "income_150k_plus_pct",
  "children_5_12_count",
  "children_5_12_pct",
  "education_bachelors_plus_pct",
  "summer_camps_per_10k_children",
  "public_elementary_teacher_count",
  "col_salary_index",
  "rental_venue_count",
  "guide_wage_proxy",
  "robotics_maker_space_count",
  "sow_metric_coverage_readiness",
];

function getStatus(signal: LiveSignal): MetricStatus {
  return signal.raw_data?.status ?? "proxy";
}

function getCategory(signal: LiveSignal): MetricCategory | null {
  return signal.raw_data?.metric_category ?? null;
}

function statusClass(status: MetricStatus) {
  if (status === "live") return "bg-[#e6f7ef] text-[#0ea66e]";
  if (status === "proxy") return "bg-[#eaf0ff] text-[#174be8]";
  if (status === "missing") return "bg-[#f3f6fb] text-[#526078]";
  return "bg-[#fff6dc] text-[#b8860b]";
}

function csvEscape(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function MarketReportModal({ open, onClose, market, categoryScores, refreshVersion = 0, autoDownload = false }: Props) {
  const stateAbbr = market.state === "Texas" ? "TX" : market.state === "Florida" ? "FL" : market.state;
  const [loading, setLoading] = useState(false);
  const [liveSignals, setLiveSignals] = useState<LiveSignal[]>([]);
  const [liveCompetitors, setLiveCompetitors] = useState<LiveCompetitor[]>([]);
  const [latestJob, setLatestJob] = useState<any | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const autoFiredRef = useRef(false);

  useEffect(() => {
    if (!open) return;

    const loadReportData = async () => {
      setLoading(true);
      try {
        // cityId references us_cities_scored.id. Legacy signals/competitors/jobs
        // tables are still keyed by legacy cities.id, so seeded-only rows will
        // return empty until seed-on-demand wires them to the new id.
        const cityId = market.cityId;
        if (!cityId) {
          setLiveSignals([]);
          setLiveCompetitors([]);
          setLatestJob(null);
          return;
        }

        const { data: signals } = await supabase
          .from("city_market_signals")
          .select("*")
          .eq("city_id", cityId);
        // Legacy city_competitors and city_fetch_jobs were dropped May 19.
        const competitors: any[] = [];
        const jobs: any[] = [];

        const fallbackSignals = buildSeededFallbackSignals(market);
        setLiveSignals(((signals?.length ? signals : fallbackSignals) ?? []) as LiveSignal[]);
        setLiveCompetitors(competitors as LiveCompetitor[]);
        setLatestJob(jobs?.[0] ?? null);
      } catch (err) {
        console.error("MarketReportModal load error", err);
      } finally {
        setLoading(false);
      }
    };

    loadReportData();
  }, [open, market.cityId, refreshVersion]);

  const liveCount = liveSignals.filter((s) => getStatus(s) === "live").length;
  const proxyCount = liveSignals.filter((s) => getStatus(s) === "proxy").length;
  const missingCount = liveSignals.filter((s) => getStatus(s) === "missing").length;

  const prioritySignals = useMemo(() => {
    return [...liveSignals]
      .filter((s) => getStatus(s) !== "missing")
      .sort((a, b) => {
        const ai = PRIORITY_SIGNAL_KEYS.indexOf(a.signal_key ?? "");
        const bi = PRIORITY_SIGNAL_KEYS.indexOf(b.signal_key ?? "");
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      })
      .slice(0, 10);
  }, [liveSignals]);

  const coverageByCategory = CAT_LABELS.map((cat) => {
    const rows = liveSignals.filter((s) => getCategory(s) === cat.dbKey);
    return {
      ...cat,
      total: rows.length,
      live: rows.filter((s) => getStatus(s) === "live").length,
      proxy: rows.filter((s) => getStatus(s) === "proxy").length,
      missing: rows.filter((s) => getStatus(s) === "missing").length,
    };
  });

  const handleDownloadCsv = () => {
    if (!liveSignals.length) {
      toast.error("No live SOW signals found to export");
      return;
    }

    const rows = [
      ["Category", "Metric", "Value", "Geography", "Counts Toward Score", "Status", "Source", "Confidence", "Notes", "Source URL"],
      ...liveSignals.map((s) => {
        const geo = getSignalGeography(s.source, s.signal_key);
        return [
          CAT_LABELS.find((c) => c.dbKey === getCategory(s))?.label ?? "Other",
          s.label ?? s.signal_key ?? "",
          s.value ?? "",
          geo.full,
          s.raw_data?.used_in_score ? "Yes" : "No",
          getStatus(s),
          s.source ?? "",
          s.confidence == null ? "" : `${Math.round(s.confidence * 100)}%`,
          s.raw_data?.notes ?? "",
          s.source_url ?? "",
        ];
      }),
      [],
      ["Competitors & Enrichment Programs"],
      ["Name", "Type", "Source", "Source URL"],
      ...liveCompetitors.map((c) => [c.name ?? "", c.type ?? c.category ?? "", c.source ?? "", c.source_url ?? ""]),
    ];

    downloadCsv(`${market.city.toLowerCase().replace(/\s+/g, "-")}-sow-source-evidence.csv`, rows);
    toast.success("SOW source evidence exported");
  };

  const handleDownloadPdf = async () => {
    if (loading) {
      toast.error("Report data still loading");
      return;
    }
    setGeneratingPdf(true);
    try {
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const marginX = 40;
      const marginTop = 56;
      const marginBottom = 48;
      const contentW = pageW - marginX * 2;
      const today = new Date().toISOString().slice(0, 10);
      const headerText = `${market.city}, ${stateAbbr} — SOW Market Report  ·  Generated ${today}`;
      let pageNum = 0;
      let y = marginTop;

      const setColor = (hex: string) => {
        const n = parseInt(hex.replace("#", ""), 16);
        pdf.setTextColor((n >> 16) & 255, (n >> 8) & 255, n & 255);
      };
      const setFill = (hex: string) => {
        const n = parseInt(hex.replace("#", ""), 16);
        pdf.setFillColor((n >> 16) & 255, (n >> 8) & 255, n & 255);
      };
      const setDraw = (hex: string) => {
        const n = parseInt(hex.replace("#", ""), 16);
        pdf.setDrawColor((n >> 16) & 255, (n >> 8) & 255, n & 255);
      };

      const drawChrome = () => {
        pageNum++;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        setColor("#8794ab");
        pdf.text(headerText, marginX, 28);
        setDraw("#e5eaf2");
        pdf.setLineWidth(0.5);
        pdf.line(marginX, 36, pageW - marginX, 36);
        pdf.text(`Page ${pageNum}`, pageW - marginX, pageH - 24, { align: "right" });
      };

      const ensureSpace = (needed: number) => {
        if (y + needed > pageH - marginBottom) {
          pdf.addPage();
          drawChrome();
          y = marginTop;
        }
      };

      const heading = (text: string) => {
        ensureSpace(28);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        setColor("#07142f");
        pdf.text(text, marginX, y);
        y += 6;
        setDraw("#174be8");
        pdf.setLineWidth(1.2);
        pdf.line(marginX, y, marginX + 28, y);
        y += 12;
      };

      const paragraph = (text: string, color = "#3a4c72", size = 9.5) => {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(size);
        setColor(color);
        const lines = pdf.splitTextToSize(text, contentW) as string[];
        const lh = size * 1.35;
        for (const line of lines) {
          ensureSpace(lh);
          pdf.text(line, marginX, y);
          y += lh;
        }
      };

      const row = (left: string, right: string, opts?: { bold?: boolean }) => {
        const lh = 14;
        ensureSpace(lh + 2);
        pdf.setFont("helvetica", opts?.bold ? "bold" : "normal");
        pdf.setFontSize(9.5);
        setColor("#526078");
        const leftLines = pdf.splitTextToSize(left, contentW * 0.66) as string[];
        pdf.text(leftLines[0], marginX, y);
        setColor("#07142f");
        pdf.setFont("helvetica", "bold");
        pdf.text(right, pageW - marginX, y, { align: "right" });
        y += lh;
        setDraw("#f3f5f9");
        pdf.setLineWidth(0.4);
        pdf.line(marginX, y - 4, pageW - marginX, y - 4);
      };

      // ===== Cover header =====
      drawChrome();
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(22);
      setColor("#07142f");
      pdf.text(`${market.city}, ${stateAbbr}`, marginX, y + 10);
      y += 26;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      setColor("#526078");
      pdf.text("SOW Market Report", marginX, y);
      y += 24;

      // ===== Market summary =====
      heading("Market Summary");
      paragraph(
        `This report uses the live SOW metric registry for ${market.city}. It separates confirmed live metrics, proxy-backed metrics, and missing source integrations so the score is auditable instead of relying on hardcoded sample signals.`
      );
      y += 8;

      // ===== Coverage stats =====
      heading("SOW Coverage Status");
      const cardW = (contentW - 16) / 3;
      const cardH = 52;
      ensureSpace(cardH + 6);
      const cards: { n: number; label: string; color: string }[] = [
        { n: liveCount, label: "Live", color: "#0ea66e" },
        { n: proxyCount, label: "Proxy", color: "#174be8" },
        { n: missingCount, label: "Missing", color: "#8794ab" },
      ];
      cards.forEach((c, i) => {
        const x = marginX + i * (cardW + 8);
        setDraw("#eef2f7");
        setFill("#ffffff");
        pdf.setLineWidth(0.6);
        pdf.roundedRect(x, y, cardW, cardH, 4, 4, "FD");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(20);
        setColor(c.color);
        pdf.text(String(c.n), x + cardW / 2, y + 24, { align: "center" });
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        setColor("#8794ab");
        pdf.text(c.label.toUpperCase(), x + cardW / 2, y + 40, { align: "center" });
      });
      y += cardH + 14;

      // ===== Six category scores =====
      heading("Six Category Scores");
      const colW = (contentW - 20) / 2;
      const barH = 6;
      const itemH = 26;
      for (let i = 0; i < CAT_LABELS.length; i += 2) {
        ensureSpace(itemH + 4);
        for (let j = 0; j < 2 && i + j < CAT_LABELS.length; j++) {
          const c = CAT_LABELS[i + j];
          const x = marginX + j * (colW + 20);
          const score = categoryScores[c.key] ?? 0;
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9.5);
          setColor("#526078");
          pdf.text(c.label, x, y);
          pdf.setFont("helvetica", "bold");
          setColor("#07142f");
          pdf.text(String(categoryScores[c.key] ?? "-"), x + colW, y, { align: "right" });
          setFill("#e8edf6");
          pdf.roundedRect(x, y + 5, colW, barH, 3, 3, "F");
          setFill("#174be8");
          pdf.roundedRect(x, y + 5, Math.max(0, Math.min(100, score)) / 100 * colW, barH, 3, 3, "F");
        }
        y += itemH;
      }
      y += 4;

      // ===== Category coverage =====
      heading("SOW Category Coverage");
      coverageByCategory.forEach((c) => {
        row(c.label, `${c.live} live · ${c.proxy} proxy · ${c.missing} missing`);
      });
      y += 8;

      // ===== Key signals =====
      heading("Key Live / Proxy Market Signals");
      if (prioritySignals.length === 0) {
        paragraph("No live/proxy SOW signals found yet. Run the SOW coverage refresh first.", "#526078");
      } else {
        prioritySignals.forEach((s) => {
          const status = getStatus(s).toUpperCase();
          const geo = getSignalGeography(s.source, s.signal_key);
          const used = Boolean(s.raw_data?.used_in_score);
          const tag = `[${status}] [${geo.short}] [${used ? "✓ Counts" : "Info"}]`;
          const label = `${tag}  ${s.label ?? s.signal_key}`;
          row(label, String(s.value ?? "—"));
        });
      }
      y += 8;

      // ===== Competitors =====
      heading("Competitors & Enrichment Programs");
      paragraph(`${liveCompetitors.length} live competitor rows are attached to this market.`, "#526078");
      y += 4;
      const names = liveCompetitors.slice(0, 24).map((c) => c.name).filter(Boolean) as string[];
      if (names.length) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9.5);
        setColor("#174be8");
        // simple chip-style wrapped list
        let cx = marginX;
        const chipH = 16;
        const chipPad = 6;
        const chipGap = 6;
        ensureSpace(chipH + 2);
        for (const name of names) {
          const w = pdf.getTextWidth(name) + chipPad * 2;
          if (cx + w > marginX + contentW) {
            cx = marginX;
            y += chipH + 4;
            ensureSpace(chipH + 2);
          }
          setFill("#eaf0ff");
          pdf.roundedRect(cx, y - chipH + 4, w, chipH, 8, 8, "F");
          setColor("#174be8");
          pdf.text(name, cx + chipPad, y);
          cx += w + chipGap;
        }
        y += chipH + 6;
        if (liveCompetitors.length > names.length) {
          paragraph(`+${liveCompetitors.length - names.length} more`, "#526078", 9);
        }
      }
      y += 6;

      // ===== Recommendation =====
      heading("Recommendation");
      paragraph(
        `Treat ${market.city} as a high-priority market only after reviewing the proxy and missing metrics. The current live/proxy coverage is useful for screening, while pricing, weather, Google Trends, state education, and rental-cost integrations should be completed for a final investment-grade score.`
      );

      const slug = market.city.toLowerCase().replace(/\s+/g, "-");
      pdf.save(`${slug}-${stateAbbr.toLowerCase()}-market-report-${today}.pdf`);
      toast.success("PDF report downloaded");
    } catch (err) {
      console.error("PDF generation failed", err);
      toast.error("PDF generation failed");
    } finally {
      setGeneratingPdf(false);
    }
  };

  useEffect(() => {
    if (!open) {
      autoFiredRef.current = false;
      return;
    }
    if (autoDownload && !loading && !autoFiredRef.current && liveSignals.length >= 0) {
      autoFiredRef.current = true;
      // Wait one tick for DOM paint
      const t = setTimeout(() => { handleDownloadPdf(); }, 250);
      return () => clearTimeout(t);
    }
  }, [open, autoDownload, loading]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-[#07142f]">{market.city}, {stateAbbr} SOW Market Report Preview</DialogTitle>
        </DialogHeader>
        <div ref={reportRef} className="space-y-5 text-[12.5px] text-[#14233b] bg-white">
          <section className="rounded-lg border border-[#eef2f7] bg-[#f8fafe] p-3">
            <h4 className="text-[13px] font-bold text-[#07142f] mb-1">Market Summary</h4>
            <p className="leading-snug text-[#3a4c72]">
              This report preview uses the live SOW metric registry for {market.city}. It separates confirmed live metrics, proxy-backed metrics, and missing source integrations so the score is auditable instead of relying on hardcoded sample signals.
            </p>
            {loading && <p className="mt-2 text-[11px] text-[#526078]">Loading live report evidence…</p>}
          </section>

          <section>
            <h4 className="text-[13px] font-bold text-[#07142f] mb-2">SOW Coverage Status</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md border border-[#eef2f7] p-3">
                <p className="text-2xl font-black text-[#0ea66e]">{liveCount}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8794ab]">Live</p>
              </div>
              <div className="rounded-md border border-[#eef2f7] p-3">
                <p className="text-2xl font-black text-[#174be8]">{proxyCount}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8794ab]">Proxy</p>
              </div>
              <div className="rounded-md border border-[#eef2f7] p-3">
                <p className="text-2xl font-black text-[#526078]">{missingCount}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8794ab]">Missing</p>
              </div>
            </div>
            {latestJob?.response_summary?.mode && (
              <p className="mt-2 text-[11px] text-[#526078]">Latest backend mode: {latestJob.response_summary.mode}</p>
            )}
          </section>

          <section>
            <h4 className="text-[13px] font-bold text-[#07142f] mb-2">Six Category Scores</h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {CAT_LABELS.map((c) => (
                <div key={c.key}>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[#526078]">{c.label}</span>
                    <span className="font-semibold text-[#07142f]">{categoryScores[c.key] ?? "-"}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#e8edf6] mt-1">
                    <div className="h-full rounded-full bg-[#174be8]" style={{ width: `${categoryScores[c.key] ?? 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h4 className="text-[13px] font-bold text-[#07142f] mb-1">SOW Category Coverage</h4>
            <div className="space-y-1">
              {coverageByCategory.map((c) => (
                <div key={c.dbKey} className="flex items-center justify-between border-b border-[#f3f5f9] py-1">
                  <span className="text-[#526078]">{c.label}</span>
                  <span className="font-medium text-[#07142f]">{c.live} live · {c.proxy} proxy · {c.missing} missing</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h4 className="text-[13px] font-bold text-[#07142f] mb-1">Key Live / Proxy Market Signals</h4>
            {prioritySignals.length === 0 ? (
              <p className="text-[#526078]">No live/proxy SOW signals found yet. Run the SOW coverage refresh first.</p>
            ) : (
              <ul className="space-y-1">
                {prioritySignals.map((s) => {
                  const status = getStatus(s);
                  const geo = getSignalGeography(s.source, s.signal_key);
                  const used = Boolean(s.raw_data?.used_in_score);
                  return (
                    <li key={s.id ?? s.signal_key} className="flex items-center justify-between gap-3 border-b border-[#f3f5f9] py-1">
                      <span className="flex min-w-0 items-center gap-1.5 text-[#526078]">
                        <span className={`rounded-full px-1.5 py-px text-[9px] font-bold uppercase ${statusClass(status)}`}>{status}</span>
                        <span className={`rounded-full border px-1.5 py-px text-[9px] font-bold uppercase ${GEO_BADGE_CLASS[geo.level]}`} title={geo.full}>{geo.short}</span>
                        <span
                          className={`rounded-full border px-1.5 py-px text-[9px] font-bold uppercase ${used ? "border-[#bfead6] bg-[#e6f7ef] text-[#0ea66e]" : "border-[#e5eaf2] bg-[#f3f6fb] text-[#8794ab]"}`}
                          title={used ? "Counts toward the composite score" : "Informational only"}
                        >
                          {used ? "✓ Counts" : "Info"}
                        </span>
                        <span className="truncate">{s.label ?? s.signal_key}</span>
                      </span>
                      <span className="shrink-0 font-medium text-[#07142f]">{s.value ?? "—"}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <h4 className="text-[13px] font-bold text-[#07142f] mb-1">Competitors & Enrichment Programs</h4>
            <p className="mb-2 text-[#526078]">{liveCompetitors.length} live competitor rows are attached to this market.</p>
            <div className="flex flex-wrap gap-2">
              {liveCompetitors.slice(0, 12).map((c, idx) => (
                <span key={c.id ?? `${c.name}-${idx}`} className="rounded-full bg-[#eaf0ff] text-[#174be8] px-2 py-0.5 text-[11px]">
                  {c.name}
                </span>
              ))}
              {liveCompetitors.length > 12 && <span className="text-[11px] text-[#526078]">+{liveCompetitors.length - 12} more</span>}
            </div>
          </section>

          <section>
            <h4 className="text-[13px] font-bold text-[#07142f] mb-1">Recommendation</h4>
            <p className="leading-snug text-[#3a4c72]">
              Treat {market.city} as a high-priority market only after reviewing the proxy and missing metrics. The current live/proxy coverage is useful for screening, while pricing, weather, Google Trends, state education, and rental-cost integrations should be completed for a final investment-grade score.
            </p>
          </section>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleDownloadCsv}>Download Source CSV</Button>
          <Button variant="outline" onClick={handleDownloadPdf} disabled={loading || generatingPdf}>
            {generatingPdf ? "Generating PDF…" : "Download PDF Report"}
          </Button>
          <Button className="bg-[#174be8] hover:bg-[#1240c9] text-white" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
