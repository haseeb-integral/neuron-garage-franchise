import { useState } from "react";
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
}

const PRESETS: Preset[] = [
  {
    label: "Trinity Christian Academy",
    hint: "TX · positive anchor",
    schoolName: "Trinity Christian Academy",
    address: "4131 Spring Valley Rd, Addison, TX 75001",
    schoolType: "private_elementary",
    gradeBand: "k5_k6",
  },
  {
    label: "LeafSpring Plano (closed)",
    hint: "TX · negative anchor",
    schoolName: "LeafSpring School at Plano",
    address: "7000 Preston Rd, Plano, TX 75024",
    schoolType: "private_elementary",
    gradeBand: "k5_k6",
  },
  {
    label: "Highland Park",
    hint: "TX · affluent",
    schoolName: "Highland Park Presbyterian Day School",
    address: "4220 Emerson Ave, Dallas, TX 75205",
    schoolType: "private_elementary",
    gradeBand: "k5_k6",
  },
  {
    label: "Cherry Creek",
    hint: "CO · affluent (needs CO seed)",
    schoolName: "Cherry Creek Academy",
    address: "4500 E Cherry Creek S Dr, Denver, CO 80246",
    schoolType: "private_elementary",
    gradeBand: "k5_k6",
  },
  {
    label: "Mason TX (rural)",
    hint: "TX · low density control",
    schoolName: "Mason Test Site",
    address: "100 Main St, Mason, TX 76856",
    schoolType: "private_elementary",
    gradeBand: "k5_k6",
  },
];

/**
 * Live Site Analysis Engine card (Feature 1B v0.1).
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
}

export function LiveEngineCard({ onSaveToSlot, canSave = true }: LiveEngineCardProps = {}) {
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
    setEnrollment("");
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
    if (!enrollment.trim() || !Number.isFinite(Number(enrollment)) || Number(enrollment) <= 0) {
      setError("Enrollment is required — the engine refuses to fabricate a default. Enter the real student count.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("compute-sas", {
        body: {
          address: address.trim(),
          school_name: schoolName.trim(),
          school_type: schoolType,
          enrollment: enrollment ? Number(enrollment) : null,
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
    onSaveToSlot(
      { schoolName, address, schoolType, gradeBand, enrollment },
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
            Live Site Analysis Engine (v0.1)
          </h3>
          <p className="text-[11px]" style={{ color: "#526078" }}>
            Geocode → 10/15-min isochrones → ACS sampling → school ecosystem → SAS.
          </p>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ background: "#dde7ff", color: "#174be8" }}
        >
          ENGINE LIVE
        </span>
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
            placeholder="Trinity Christian Academy"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] md:col-span-3" style={{ color: "#526078" }}>
          Address *
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="rounded border px-2 py-1 text-[12px]"
            style={{ borderColor: "#eef2f7", color: "#07142f" }}
            placeholder="4131 Spring Valley Rd, Addison, TX 75001"
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
            <option value="montessori">Montessori</option>
            <option value="daycare">Daycare</option>
            <option value="other_k8">Other K-8</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px]" style={{ color: "#526078" }}>
          Enrollment *
          <input
            type="number"
            min={1}
            required
            value={enrollment}
            onChange={(e) => setEnrollment(e.target.value)}
            className="rounded border px-2 py-1 text-[12px]"
            style={{ borderColor: "#eef2f7", color: "#07142f" }}
            placeholder="e.g. 600"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px]" style={{ color: "#526078" }}>
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
        <div className="flex items-end gap-2">
          <button
            onClick={run}
            disabled={busy}
            className="rounded px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-60"
            style={{ background: "#174be8" }}
          >
            {busy ? "Computing…" : "Compute SAS"}
          </button>
        </div>
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
                    {saved ? "✓ Added as new card" : !canSave ? "Slots full (4/4) — remove a card first" : "Add as new card →"}
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
