import { useState } from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import {
  recomputeSiteScores,
  type GradeBand,
  type SchoolType,
} from "@/lib/sasMath";

interface Preset {
  label: string;
  hint: string;
  schoolName: string;
  address: string;
  schoolType: SchoolType;
  gradeBand: GradeBand;
  enrollment: string;
}

const PRESETS: Preset[] = [
  {
    label: "Trinity Episcopal (Westlake)",
    hint: "TX · positive anchor (SAS doc §6)",
    schoolName: "Trinity Episcopal School",
    address: "4011 Bee Caves Rd, Austin, TX 78746",
    schoolType: "private_elementary",
    gradeBand: "k5_k6",
    enrollment: "580",
  },
  {
    label: "LeafSpring Cedar Park (closed)",
    hint: "TX · negative anchor — Daycare/Other, enrollment 150 (matches anchor card)",
    schoolName: "LeafSpring School at Cedar Park",
    address: "11651 W Parmer Ln, Cedar Park, TX 78613",
    schoolType: "daycare",
    gradeBand: "other",
    enrollment: "150",
  },
  {
    label: "Wayside Eden Park (Austin)",
    hint: "TX · positive anchor (SOW v2.2)",
    schoolName: "Wayside Schools — Eden Park Academy",
    address: "6215 Menchaca Rd, Austin, TX 78745",
    schoolType: "private_elementary",
    gradeBand: "k5_k6",
    enrollment: "400",
  },
  {
    label: "St. Francis (Austin)",
    hint: "TX · positive anchor (SOW v2.2)",
    schoolName: "St. Francis School",
    address: "300 E Huntland Dr, Austin, TX 78752",
    schoolType: "private_elementary",
    gradeBand: "k5_k6",
    enrollment: "600",
  },
  {
    label: "Telluride Mountain School",
    hint: "CO · small-market positive (SOW v2.2)",
    schoolName: "Telluride Mountain School",
    address: "200 San Miguel River Rd, Telluride, CO 81435",
    schoolType: "private_elementary",
    gradeBand: "k5_k6",
    enrollment: "200",
  },
];


function getEnrollmentTooltipLine(schoolType: SchoolType): string {
  switch (schoolType) {
    case "private_elementary":
      return "Typical real-world average for private elementary: ~110 students.";
    case "public_elementary":
      return "Typical real-world average for public elementary: ~432 students.";
    case "montessori_elementary":
      return "Typical real-world average for Montessori elementary: ~90 students.";
    case "montessori_preschool":
      return "Montessori pre-schools are usually small (20–60). Pre-school = poor K–6 camp fit.";
    case "charter_elementary":
      return "Charter elementary enrollment is not separately published and varies widely by network.";
    case "daycare":
      return "Daycare center size varies widely by state and license.";
    default:
      return "Average varies by school type. Enter the real number if known.";
  }
}

/**
 * Live Site Analysis Engine card (Feature 1B v0.3).
 *
 * Renders only when `VITE_SAS_ENGINE_LIVE === "true"`. The demo path on
 * `/site-analysis` is completely untouched when the flag is off.
 *
 * Calls the `compute-sas` edge function and polls the `site_analyses` row.
 */

export interface LiveEngineResult {
  sas: number;
  pillars: {
    schoolProfile: number;
    affluence: number;
    familyDensity: number;
    ecosystem: number;
    accessibility: number;
  };
  place?: string;
  signals?: unknown;
}

export interface LiveEngineInput {
  schoolName: string;
  address: string;
  schoolType: SchoolType;
  gradeBand: GradeBand;
  enrollment: string;
}

interface LiveEngineCardProps {
  onSaveToSlot?: (input: LiveEngineInput, result: LiveEngineResult) => void;
  canSave?: boolean;
  /** If set, the Save button labels itself as "Replace <name>". */
  replaceTargetLabel?: string | null;
  /** Cancel an in-progress replace selection. */
  onCancelReplace?: () => void;
}

export function LiveEngineCard({ onSaveToSlot, canSave = true, replaceTargetLabel, onCancelReplace }: LiveEngineCardProps = {}) {
  const [address, setAddress] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [schoolType, setSchoolType] = useState<SchoolType>("private_elementary");
  const [enrollment, setEnrollment] = useState<string>("");
  const [gradeBand, setGradeBand] = useState<GradeBand>("k5_k6");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LiveEngineResult | null>(null);
  const [saved, setSaved] = useState(false);

  function loadPreset(p: Preset) {
    setSchoolName(p.schoolName);
    setAddress(p.address);
    setSchoolType(p.schoolType);
    setGradeBand(p.gradeBand);
    setEnrollment(p.enrollment);
    setError(null);
    setResult(null);
    setSaved(false);
  }

  async function run() {
    setError(null);
    setResult(null);
    setSaved(false);
    if (!address.trim() || !schoolName.trim()) {
      setError("School name and address are required.");
      return;
    }
    // Enrollment is optional per spec. If blank or invalid, fill with neutral
    // midpoint of the 150–800 scoring range so the user is not penalized.
    let effectiveEnrollment = enrollment.trim();
    if (!effectiveEnrollment || !Number.isFinite(Number(effectiveEnrollment)) || Number(effectiveEnrollment) <= 0) {
      effectiveEnrollment = "475";
      setEnrollment("475");
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("compute-sas", {
        body: {
          address: address.trim(),
          school_name: schoolName.trim(),
          school_type: schoolType,
          enrollment: Number(effectiveEnrollment),
          grade_band: gradeBand,
        },
      });
      if (error) throw error;
      if (data?.status === "failed") throw new Error(data.error ?? "Engine failed");
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function handleSave() {
    if (!result || !onSaveToSlot) return;
    const effectiveEnrollment =
      enrollment.trim() && Number.isFinite(Number(enrollment)) && Number(enrollment) > 0
        ? enrollment
        : "475";
    onSaveToSlot(
      { schoolName, address, schoolType, gradeBand, enrollment: effectiveEnrollment },
      result,
    );
    setSaved(true);
  }


  return (
    <section
      className="mb-4 rounded-lg border-2 bg-white p-4"
      style={{ borderColor: "#174be8" }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-[13px] font-bold" style={{ color: "#07142f" }}>
            Run site score
          </h3>
          <p className="text-[11px]" style={{ color: "#526078" }}>
            Geocode → 10/15-min isochrones → ACS sampling → school ecosystem → SAS.
          </p>
        </div>
        {replaceTargetLabel ? (
          <div className="flex items-center gap-1.5">
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "#fff3cd", color: "#7a5800" }}>
              Replacing: {replaceTargetLabel}
            </span>
            <button type="button" onClick={onCancelReplace} className="rounded border px-1.5 py-0.5 text-[10px]" style={{ borderColor: "#eef2f7", color: "#526078" }}>
              Cancel
            </button>
          </div>
        ) : (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "#dde7ff", color: "#174be8" }}>
            Live engine
          </span>
        )}
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#526078" }}>
          Quick test:
        </span>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => loadPreset(p)}
            title={p.hint}
            className="rounded-full border px-2 py-0.5 text-[11px] transition hover:bg-[#dde7ff]"
            style={{ borderColor: "#dde7ff", color: "#174be8", background: "#f4f7ff" }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-5">

        <label className="flex flex-col gap-1 text-[11px] md:col-span-2" style={{ color: "#526078" }}>
          School name *
          <input
            type="text"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            className="rounded border px-2 py-1 text-[12px]"
            style={{ borderColor: "#eef2f7", color: "#07142f" }}
            placeholder="Trinity Episcopal School"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] md:col-span-3" style={{ color: "#526078" }}>
          Address *
          <input
            id="sas-address-input"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="rounded border px-2 py-1 text-[12px]"
            style={{ borderColor: "#eef2f7", color: "#07142f" }}
            placeholder="4011 Bee Caves Rd, Austin, TX 78746"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px]" style={{ color: "#526078" }}>
          School type
          <select
            value={schoolType}
            onChange={(e) => setSchoolType(e.target.value as SchoolType)}
            className="rounded border px-2 py-1 text-[12px]"
            style={{ borderColor: "#eef2f7", color: "#07142f" }}
          >
            <option value="private_elementary">Private elementary</option>
            <option value="public_elementary">Public elementary</option>
            <option value="charter_elementary">Charter elementary</option>
            <option value="montessori_elementary">Montessori elementary</option>
            <option value="montessori_preschool">Montessori pre-school</option>
            <option value="daycare">Daycare</option>
            <option value="other_k8">Other K-8</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px]" style={{ color: "#526078" }}>
          <span className="flex items-center gap-1">
            Enrollment (optional)
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help" style={{ color: "#8a94a6" }}>
                  <Info size={12} />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-[11px]" style={{ color: "#07142f" }}>
                <div className="font-semibold">Why 475?</div>
                <div className="mt-1">
                  The enrollment score uses a 150–800 range. 475 is the midpoint, so leaving the field blank gives a neutral score instead of accidentally helping or hurting the result.
                </div>
                <div className="mt-1" style={{ color: "#526078" }}>
                  {getEnrollmentTooltipLine(schoolType)}
                </div>
              </TooltipContent>
            </Tooltip>
          </span>
          <input
            type="number"
            min={1}
            value={enrollment}
            onChange={(e) => setEnrollment(e.target.value)}
            className="rounded border px-2 py-1 text-[12px]"
            style={{ borderColor: "#eef2f7", color: "#07142f" }}
            placeholder="Leave blank to use 475"
          />
          <span className="text-[10px] leading-tight" style={{ color: "#8a94a6" }}>
            Use actual enrollment if known. If left blank, we use 475 as a neutral scoring estimate.
          </span>
        </label>
        <label className="flex flex-col gap-1 text-[11px] md:col-span-3" style={{ color: "#526078" }}>
          Grade band
          <select
            value={gradeBand}
            onChange={(e) => setGradeBand(e.target.value as GradeBand)}
            className="rounded border px-2 py-1 text-[12px]"
            style={{ borderColor: "#eef2f7", color: "#07142f" }}
          >
            <option value="k5_k6">K-5 / K-6</option>
            <option value="prek_5">Pre-K through 5</option>
            <option value="k8">K-8</option>
            <option value="other">Other</option>
          </select>
        </label>
      </div>

      {/* Formula + big action button footer */}
      <div
        className="mt-3 flex flex-col gap-3 border-t pt-3 md:flex-row md:items-center md:justify-between"
        style={{ borderColor: "#eef2f7" }}
      >
        <div className="flex items-start gap-2 min-w-0">
          <span
            className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold italic"
            style={{ background: "#eef2f7", color: "#174be8", fontFamily: "Georgia, serif" }}
            title="Formula"
          >
            fx
          </span>
          <code className="text-[11px] leading-snug" style={{ color: "#07142f" }}>
            SAS = 0.25·SchoolProfile + 0.25·Affluence + 0.20·FamilyDensity + 0.15·Ecosystem + 0.15·Accessibility
          </code>
        </div>
        <button
          onClick={run}
          disabled={busy}
          className="shrink-0 rounded-md px-6 py-2.5 text-[14px] font-bold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
          style={{ background: "#174be8", minWidth: 180 }}
        >
          {busy ? "Computing…" : "Compute SAS →"}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-[12px]" style={{ color: "#a3142b" }}>
          {error}
        </p>
      )}

      {result && (() => {
        // One-number rule: recompute composite from the engine's pillars so
        // the headline number and the pillar tiles can never drift apart.
        const recomputed = recomputeSiteScores(result.pillars);
        return (
          <div className="mt-4 rounded border p-3" style={{ borderColor: "#eef2f7", background: "#f7faff" }}>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="text-[12px] font-bold" style={{ color: "#07142f" }}>
                SAS: <span style={{ fontSize: 22 }}>{recomputed.composite}</span>
              </h4>
              <div className="flex items-center gap-2">
                {result.place && (
                  <span className="text-[10px]" style={{ color: "#526078" }}>
                    {result.place}
                  </span>
                )}
                {onSaveToSlot && (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saved || !canSave}
                    title={
                      !canSave
                        ? "All 4 slots are full — remove a candidate first"
                        : saved
                        ? "Saved to a card below"
                        : "Save this exact engine result as a candidate card"
                    }
                    className="rounded px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
                    style={{ background: saved ? "#1d6b32" : "#174be8" }}
                  >
                    {saved ? (replaceTargetLabel ? "✓ Replaced" : "✓ Added as card") : !canSave ? "Slots full (4/4) — remove a card first" : (replaceTargetLabel ? `Replace ${replaceTargetLabel} →` : "Add as new card →")}
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] md:grid-cols-5" style={{ color: "#07142f" }}>
              <Stat label="School profile (25%)" v={recomputed.pillars.schoolProfile} />
              <Stat label="Affluence (25%)" v={recomputed.pillars.affluence} />
              <Stat label="Family density (20%)" v={recomputed.pillars.familyDensity} />
              <Stat label="Ecosystem (15%)" v={recomputed.pillars.ecosystem} />
              <Stat label="Accessibility (15%)" v={recomputed.pillars.accessibility} />
            </div>
          </div>
        );
      })()}
    </section>
  );
}

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded border bg-white px-2 py-1" style={{ borderColor: "#eef2f7" }}>
      <div className="text-[9px] uppercase tracking-wide" style={{ color: "#526078" }}>{label}</div>
      <div className="text-[13px] font-bold">{v}</div>
    </div>
  );
}

export const SAS_ENGINE_LIVE = import.meta.env.VITE_SAS_ENGINE_LIVE === "true";
