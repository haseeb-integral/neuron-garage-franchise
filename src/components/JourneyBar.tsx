import { useNavigate, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCandidateCount } from "@/hooks/useCandidateCount";

interface Step {
  num: number;
  label: string;
  path: string;
  count: string;
}

/**
 * Live counts for the journey bar. Previously these were sourced from
 * `sampleCities.length` / `sampleTeachers.length`, which after the v1.0
 * legacy-mock purge meant the bar always showed "32 cities" / "0 prospects"
 * regardless of the real DB state. Now we query the live tables (cached
 * 60s via React Query) so the bar matches the actual data the client sees.
 */
function useJourneyCounts() {
  const cities = useQuery({
    queryKey: ["journey-bar", "city-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("us_cities_scored")
        .select("id", { count: "exact", head: true });
      return count ?? 0;
    },
    staleTime: 60_000,
  });
  const prospects = useQuery({
    queryKey: ["journey-bar", "prospect-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("teacher_prospects")
        .select("id", { count: "exact", head: true });
      return count ?? 0;
    },
    staleTime: 60_000,
  });
  return { cityCount: cities.data, prospectCount: prospects.data };
}

const fmt = (n: number | undefined) => (n == null ? "…" : n.toLocaleString());

export function JourneyBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const activePath = location.pathname;

  const { count: candidateCount } = useCandidateCount();
  const { cityCount, prospectCount } = useJourneyCounts();

  const steps: Step[] = [
    { num: 1, label: "City Scoring", path: "/city-scoring", count: `${fmt(cityCount)} cities` },
    { num: 2, label: "Teacher Search", path: "/teacher-prospects", count: `${fmt(prospectCount)} prospects` },
    {
      num: 3,
      label: "Candidate Pipeline",
      path: "/candidate-pipeline",
      count: candidateCount === null ? "…" : `${candidateCount} candidates`,
    },
    { num: 4, label: "Onboarding", path: "/onboarding", count: "Active" },
  ];

  return (
    <nav
      aria-label="Journey progress"
      className="bg-white rounded-xl px-4 py-2.5 md:px-5 mb-3"
      style={{ border: "1px solid #eef2f7", boxShadow: "none" }}
    >
      <ol className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {steps.map((step, idx) => {
          const isActive = step.path === activePath;
          return (
            <li key={step.num} className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => navigate(step.path)}
                className="flex items-center gap-2.5 px-1.5 py-1 rounded-lg transition-colors hover:bg-[#f7faff] min-w-0"
                style={{ minHeight: 28 }}
                aria-current={isActive ? "step" : undefined}
              >
                <span
                  className="flex items-center justify-center rounded-full text-[11px] font-bold flex-shrink-0"
                  style={{
                    width: 22,
                    height: 22,
                    backgroundColor: isActive ? "#eaf1ff" : "#f0f3f7",
                    color: isActive ? "#174be8" : "#526078",
                  }}
                >
                  {step.num}
                </span>
                <span
                  className="text-[13px] whitespace-nowrap"
                  style={{ color: "#18243a", fontWeight: 700 }}
                >
                  {step.label}
                </span>
                <span
                  className="text-[10.5px] font-semibold rounded-full px-2 py-0.5 whitespace-nowrap"
                  style={{
                    backgroundColor: step.label === "Onboarding" && step.count === "Active" ? "#e7f7ed" : "#eef2f6",
                    color: step.label === "Onboarding" && step.count === "Active" ? "#16834a" : "#344256",
                  }}
                >
                  {step.count}
                </span>
              </button>
              {idx < steps.length - 1 && (
                <ChevronRight size={14} style={{ color: "#c3ccd9" }} aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
