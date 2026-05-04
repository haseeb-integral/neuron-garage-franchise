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

  // City Scoring & Teacher Prospects still render from local mock data,
  // so the journey bar mirrors that source until they get DB tables.
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
      className="bg-white rounded-2xl px-3 py-2.5 md:px-4 mb-4 overflow-x-auto shadow-sm"
      style={{ border: "1px solid #d8e2ef" }}
    >
      <ol className="flex items-center justify-between gap-2 min-w-max">
        {steps.map((step, idx) => {
          const isActive = step.path === activePath;
          return (
            <li key={step.num} className="flex flex-1 items-center gap-2">
              <button
                onClick={() => navigate(step.path)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-colors hover:bg-[#f3f7ff]"
                style={{ minHeight: 36 }}
                aria-current={isActive ? "step" : undefined}
              >
                <span
                  className="flex items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    width: 24,
                    height: 24,
                    backgroundColor: isActive ? "#eaf1ff" : "#eef2f6",
                    color: isActive ? "#174be8" : "#526078",
                    border: isActive ? "1px solid #bfd3ff" : "1px solid transparent",
                  }}
                >
                  {step.num}
                </span>
                <span
                  className="text-xs md:text-sm whitespace-nowrap"
                  style={{
                    color: isActive ? "#174be8" : "#26364d",
                    fontWeight: isActive ? 800 : 650,
                  }}
                >
                  {step.label}
                </span>
                <span
                  className="text-[11px] font-semibold rounded-full px-2 py-0.5 whitespace-nowrap"
                  style={{
                    backgroundColor: step.label === "Onboarding" && step.count === "Active" ? "#e7f7ed" : "#eef2f6",
                    color: step.label === "Onboarding" && step.count === "Active" ? "#16834a" : "#344256",
                  }}
                >
                  {step.count}
                </span>
              </button>
              {idx < steps.length - 1 && (
                <ChevronRight size={16} style={{ color: "#8e9aab" }} aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
