// ============================================================================
// SchoolCoverageByCity
//
// Replacement for the noisy global "X% of teachers are missing a school name"
// warning. Shows coverage per city, scoped to cities that actually have
// teacher_prospects (i.e. cities the user is working). Sorted by teacher
// count desc so the cities that matter most for outreach surface first.
//
// Three numbers per city:
//   - Total teachers in the prospect pool
//   - % carrying a free-text school name (what we have today)
//   - % linked to a row in public_schools (what the matcher would unlock)
//
// Lives under Advanced Mode → Status tab. Simple Mode intentionally omits
// this — the data is only useful when you're picking a city to enrich.
// ============================================================================

import { useState } from "react";
import { Building2, Loader2 } from "lucide-react";
import { useCitySchoolCoverage } from "@/hooks/useCitySchoolCoverage";

const PAGE_SIZE = 10;

export function SchoolCoverageByCity() {
  const { list, loading, error } = useCitySchoolCoverage();
  const [showAll, setShowAll] = useState(false);

  return (
    <div className="rounded-xl border border-[#eef2f7] bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 rounded-md bg-[#eef4ff] p-1.5">
          <Building2 size={16} className="text-[#174be8]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-black text-[#07142f]">Teacher school coverage by city</h3>
            {loading && <Loader2 size={12} className="animate-spin text-[#94a3b8]" />}
          </div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-[#526078]">
            Only cities with teacher prospects are listed. <b>With name</b> = a free-text
            school is on file. <b>Matched</b> = teacher is linked to a row in <code>public_schools</code>.
            School data only matters for cities you're actively enriching.
          </p>

          {error && (
            <div className="mt-3 rounded-md border border-[#fecaca] bg-[#fef2f2] p-2.5 text-[11px] text-[#7f1d1d]">
              Failed to load coverage: {error}
            </div>
          )}

          {!error && !loading && list.length === 0 && (
            <div className="mt-3 rounded-md border border-dashed border-[#cbd5e1] bg-[#f7faff] p-3 text-[11px] text-[#526078]">
              No teacher prospects in the database yet.
            </div>
          )}

          {list.length > 0 && (
            <div className="mt-3 overflow-hidden rounded-lg border border-[#eef2f7]">
              <table className="w-full text-left text-[11.5px]">
                <thead className="bg-[#f7faff] text-[10px] font-bold uppercase tracking-wide text-[#526078]">
                  <tr>
                    <th className="px-3 py-2">City</th>
                    <th className="px-3 py-2 text-right">Teachers</th>
                    <th className="px-3 py-2 text-right">With name</th>
                    <th className="px-3 py-2 text-right">Matched</th>
                  </tr>
                </thead>
                <tbody>
                  {(showAll ? list : list.slice(0, PAGE_SIZE)).map((row) => {
                    const namePct = row.totalTeachers
                      ? Math.round((row.withSchoolName / row.totalTeachers) * 100)
                      : 0;
                    const matchPct = row.totalTeachers
                      ? Math.round((row.linkedToSchool / row.totalTeachers) * 100)
                      : 0;
                    return (
                      <tr key={`${row.city}|${row.state}`} className="border-t border-[#eef2f7]">
                        <td className="px-3 py-2 font-bold text-[#07142f]">
                          {row.city}
                          <span className="ml-1 text-[#94a3b8]">· {row.state || "—"}</span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-[#34445f]">
                          {row.totalTeachers.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          <PctChip pct={namePct} />
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          <PctChip pct={matchPct} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {list.length > PAGE_SIZE && (
                <div className="border-t border-[#eef2f7] bg-[#f7faff] px-3 py-1.5 text-right">
                  <button
                    onClick={() => setShowAll((v) => !v)}
                    className="text-[11px] font-bold text-[#174be8] hover:underline"
                  >
                    {showAll ? `Show top ${PAGE_SIZE}` : `Show all ${list.length} cities`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PctChip({ pct }: { pct: number }) {
  const color =
    pct >= 70 ? { bg: "#ecfdf5", fg: "#0a8f5a" } :
    pct >= 30 ? { bg: "#fffbeb", fg: "#b7791f" } :
                { bg: "#fef2f2", fg: "#dc2626" };
  return (
    <span
      className="inline-flex min-w-[42px] justify-center rounded-full px-2 py-0.5 text-[10.5px] font-bold tabular-nums"
      style={{ background: color.bg, color: color.fg }}
    >
      {pct}%
    </span>
  );
}
