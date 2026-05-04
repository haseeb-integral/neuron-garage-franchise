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
      className="bg-white rounded-xl px-2.5 py-1.5 md:px-3 mb-3 overflow-x-auto shadow-sm"
      style={{ border: "1px solid #d8e2ef" }}
    >
      <ol className="flex items-center justify-between gap-1.5 min-w-max">
        {steps.map((step, idx) => {
          const isActive = step.path === activePath;
          return (
            <li key={step.num} className="flex flex-1 items-center gap-1.5">
              <button
                onClick={() => navigate(step.path)}
                className="flex items-center gap-2 px-2 py-1 rounded-lg transition-colors hover:bg-[#f3f7ff]"
                style={{ minHeight: 30 }}
                aria-current={isActive ? "step" : undefined}
              >
                <span
                  className="flex items-center justify-center rounded-full text-[11px] font-bold"
                  style={{
                    width: 21,
                    height: 21,
                    backgroundColor: isActive ? "#eaf1ff" : "#eef2f6",
                    color: isActive ? "#0b4f9f" : "#526078",
                    border: isActive ? "1px solid #bfd3ff" : "1px solid transparent",
                  }}
                >
                  {step.num}
                </span>
                <span
                  className="text-xs whitespace-nowrap"
                  style={{
                    color: isActive ? "#0b4f9f" : "#26364d",
                    fontWeight: isActive ? 800 : 650,
                  }}
                >
                  {step.label}
                </span>
                <span
                  className="text-[10px] font-semibold rounded-full px-1.5 py-0.5 whitespace-nowrap"
                  style={{
                    backgroundColor: step.label === "Onboarding" && step.count === "Active" ? "#e7f7ed" : "#eef2f6",
                    color: step.label === "Onboarding" && step.count === "Active" ? "#16834a" : "#344256",
                  }}
                >
                  {step.count}
                </span>
              </button>
              {idx < steps.length - 1 && (
                <ChevronRight size={14} style={{ color: "#8e9aab" }} aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
