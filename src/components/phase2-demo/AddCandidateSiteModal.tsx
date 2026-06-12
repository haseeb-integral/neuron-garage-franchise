import { useState } from "react";
import { X } from "lucide-react";

import type { SiteAnalysisDemoSite } from "@/data/phase2DemoData";

const NAVY = "#07142f";
const MUTED = "#526078";
const BORDER = "#eef2f7";
const SOFT = "#f7faff";
const BLUE = "#174be8";

const SCHOOL_TYPES: SiteAnalysisDemoSite["schoolType"][] = [
  "Private elementary",
  "Public elementary",
  "Charter elementary",
  "Montessori",
  "Other K-8",
  "Other",
];

// Deterministic stub score derived from school type + enrollment so the demo
// feels real without any backend call. Flagged SAMPLE everywhere it's shown.
const TYPE_FACTOR: Record<SiteAnalysisDemoSite["schoolType"], number> = {
  "Private elementary": 1.0,
  Montessori: 0.9,
  "Charter elementary": 0.85,
  "Public elementary": 0.75,
  "Other K-8": 0.6,
  Other: 0.5,
};

function stubScore(schoolType: SiteAnalysisDemoSite["schoolType"], enrollment: number) {
  const tf = TYPE_FACTOR[schoolType];
  const enrNorm = Math.max(0, Math.min(1, (enrollment - 150) / (800 - 150)));
  const schoolProfile = Math.round(100 * (0.5 * tf + 0.25 * enrNorm + 0.25 * (tf > 0.7 ? 1 : 0.6)));
  const neighborhoodAffluence = Math.round(55 + tf * 30);
  const familyDensity = Math.round(50 + tf * 25);
  const schoolEcosystem = Math.round(55 + tf * 25);
  const accessibility = Math.round(60 + tf * 20);
  const composite = Math.round(
    0.25 * schoolProfile +
      0.25 * neighborhoodAffluence +
      0.2 * familyDensity +
      0.15 * schoolEcosystem +
      0.15 * accessibility,
  );
  return { composite, schoolProfile, neighborhoodAffluence, familyDensity, schoolEcosystem, accessibility };
}

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (site: SiteAnalysisDemoSite) => void;
}

export function AddCandidateSiteModal({ open, onClose, onAdd }: Props) {
  const [schoolName, setSchoolName] = useState("");
  const [address, setAddress] = useState("");
  const [schoolType, setSchoolType] = useState<SiteAnalysisDemoSite["schoolType"]>("Private elementary");
  const [enrollment, setEnrollment] = useState(400);

  if (!open) return null;

  const canSubmit = schoolName.trim().length > 0 && address.trim().length > 0;

  function reset() {
    setSchoolName("");
    setAddress("");
    setSchoolType("Private elementary");
    setEnrollment(400);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const s = stubScore(schoolType, enrollment);
    const id = `custom-${Date.now()}`;
    const site: SiteAnalysisDemoSite = {
      id,
      schoolName: schoolName.trim(),
      address: address.trim(),
      schoolType,
      enrollment,
      gradeAlignment:
        schoolType === "Other" ? "Misaligned (PK–K only) ✗" : "Matches NG 5–12 ✓",
      composite: s.composite,
      verdict: "Sample-scored candidate site. Stub formula — Week 3 wires real Census/NCES/isochrones.",
      subScores: {
        schoolProfile: {
          value: s.schoolProfile,
          weight: 0.25,
          formula:
            "0.50 × school_type_factor + 0.25 × normalize(Enrollment, 150–800) + 0.25 × grade_alignment_factor",
        },
        neighborhoodAffluence: {
          value: s.neighborhoodAffluence,
          weight: 0.25,
          formula: "0.40 × norm(Median HHI 10min) + 0.35 × norm(% HH >$150k) + 0.25 × norm(% Dual-Income)",
        },
        familyDensity: {
          value: s.familyDensity,
          weight: 0.2,
          formula:
            "0.50 × norm(Children 5–12 / 10min) + 0.30 × norm(Children 5–12 / 15min) + 0.20 × norm(Families w/ kids / 10min)",
        },
        schoolEcosystem: {
          value: s.schoolEcosystem,
          weight: 0.15,
          formula: "0.40 × norm(Elementary count) + 0.30 × norm(Private school count) + 0.30 × norm(Nearby student pop)",
        },
        accessibility: {
          value: s.accessibility,
          weight: 0.15,
          formula:
            "0.30 × access(distance to major road) + 0.30 × access(distance to highway) + 0.40 × norm(Pop reachable 15min)",
        },
      },
      isochroneCallouts: {
        medianHHI10min: "—",
        pctOver150k10min: "—",
        pctDualIncome10min: "—",
        children5to12Within10min: "—",
        children5to12Within15min: "—",
        familiesWithKids5to12Within10min: "—",
      },
    };
    onAdd(site);
    reset();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(7,20,47,0.55)" }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg border bg-white p-5"
        style={{ borderColor: BORDER }}
      >
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h3 className="text-[14px] font-bold" style={{ color: NAVY }}>
              Add candidate site
            </h3>
            <p className="mt-0.5 text-[11px]" style={{ color: MUTED }}>
              Demo — score is a deterministic stub derived from school type and enrollment.
              Real isochrone/Census/NCES wiring lands in Week 3.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1" aria-label="Close" style={{ color: MUTED }}>
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2">
          <label className="flex flex-col gap-1 text-[11px]" style={{ color: MUTED }}>
            School name *
            <input
              autoFocus
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="e.g. Galileo Frisco Independent"
              className="rounded-md border px-2 py-1.5 text-[12px]"
              style={{ borderColor: BORDER, color: NAVY }}
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px]" style={{ color: MUTED }}>
            Address *
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, Frisco, TX 75034"
              className="rounded-md border px-2 py-1.5 text-[12px]"
              style={{ borderColor: BORDER, color: NAVY }}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-[11px]" style={{ color: MUTED }}>
              School type
              <select
                value={schoolType}
                onChange={(e) => setSchoolType(e.target.value as SiteAnalysisDemoSite["schoolType"])}
                className="rounded-md border px-2 py-1.5 text-[12px]"
                style={{ borderColor: BORDER, color: NAVY }}
              >
                {SCHOOL_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px]" style={{ color: MUTED }}>
              Enrollment
              <input
                type="number"
                min={50}
                max={2000}
                value={enrollment}
                onChange={(e) => setEnrollment(Number(e.target.value) || 0)}
                className="rounded-md border px-2 py-1.5 text-[12px]"
                style={{ borderColor: BORDER, color: NAVY }}
              />
            </label>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border px-3 py-1.5 text-[12px] font-semibold"
            style={{ borderColor: BORDER, color: MUTED, backgroundColor: SOFT }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-md px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: BLUE }}
          >
            Add &amp; score
          </button>
        </div>
      </form>
    </div>
  );
}
