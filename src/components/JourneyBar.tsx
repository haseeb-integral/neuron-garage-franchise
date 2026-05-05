import { useNavigate, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { sampleCities } from "@/data/cityData";
import { sampleTeachers } from "@/data/teacherData";
import { useCandidateCount } from "@/hooks/useCandidateCount";

interface Step {
  num: number;
  label: string;
  path: string;
  count: string;
}

export function JourneyBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const activePath = location.pathname;

  const { count: candidateCount } = useCandidateCount();
  const cityCount = sampleCities?.length ?? 10;
  const prospectCount = sampleTeachers?.length ?? 42;

  const steps: Step[] = [
    { num: 1, label: "City Scoring", path: "/city-scoring", count: `${cityCount} cities` },
    { num: 2, label: "Teacher Prospects", path: "/teacher-prospects", count: `${prospectCount} prospects` },
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
      className="bg-white rounded-xl px-3 py-2 md:px-4 mb-3 overflow-x-auto"
      style={{ border: "1px solid #edf2f8", boxShadow: "0 6px 18px rgba(15, 23, 42, 0.025)" }}
    >
      <ol className="flex items-center justify-between gap-2 min-w-max">
        {steps.map((step, idx) => {
          const isActive = step.path === activePath;
          return (
            <li key={step.num} className="flex flex-1 items-center gap-2">
              <button
                onClick={() => navigate(step.path)}
                className="flex items-center gap-2.5 px-2 py-1 rounded-lg transition-colors hover:bg-[#f7faff]"
                style={{ minHeight: 28 }}
                aria-current={isActive ? "step" : undefined}
              >
                <span
                  className="flex items-center justify-center rounded-full text-[11px] font-bold"
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
                  className="text-xs whitespace-nowrap"
                  style={{ color: "#18243a", fontWeight: 700 }}
                >
                  {step.label}
                </span>
                <span
                  className="text-[10px] font-semibold rounded-full px-2 py-0.5 whitespace-nowrap"
                  style={{
                    backgroundColor: step.label === "Onboarding" && step.count === "Active" ? "#e7f7ed" : "#eef2f6",
                    color: step.label === "Onboarding" && step.count === "Active" ? "#16834a" : "#344256",
                  }}
                >
                  {step.count}
                </span>
              </button>
              {idx < steps.length - 1 && (
                <ChevronRight size={14} style={{ color: "#7f8ba1" }} aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
