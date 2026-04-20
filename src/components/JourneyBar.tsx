import { useNavigate, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const STEPS = [
  { num: 1, label: "City Scoring", path: "/city-scoring" },
  { num: 2, label: "Teacher Prospects", path: "/teacher-prospects" },
  { num: 3, label: "Candidate Pipeline", path: "/candidate-pipeline" },
  { num: 4, label: "Onboarding", path: "/onboarding" },
];

export function JourneyBar() {
  const navigate = useNavigate();
  const location = useLocation();

  // On dashboard ("/"), default current step to 1 (City Scoring)
  const activePath =
    location.pathname === "/" ? "/city-scoring" : location.pathname;

  return (
    <nav
      aria-label="Journey progress"
      className="bg-white rounded-lg px-3 py-3 md:px-4 md:py-3 mb-6 overflow-x-auto"
      style={{ border: "1px solid #dee2e6" }}
    >
      <ol className="flex items-center gap-1 md:gap-2 min-w-max">
        {STEPS.map((step, idx) => {
          const isActive = step.path === activePath;
          return (
            <li key={step.num} className="flex items-center gap-1 md:gap-2">
              <button
                onClick={() => navigate(step.path)}
                className="flex items-center gap-2 px-2 py-2 rounded-md transition-colors hover:bg-[#f1f3f5]"
                style={{ minHeight: 44 }}
                aria-current={isActive ? "step" : undefined}
              >
                <span
                  className="flex items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    width: 24,
                    height: 24,
                    backgroundColor: isActive ? "#fd7e14" : "#e9ecef",
                    color: isActive ? "#ffffff" : "#6c757d",
                  }}
                >
                  {step.num}
                </span>
                <span
                  className="text-xs md:text-sm whitespace-nowrap"
                  style={{
                    color: isActive ? "#fd7e14" : "#6c757d",
                    fontWeight: isActive ? 700 : 500,
                  }}
                >
                  {step.label}
                </span>
              </button>
              {idx < STEPS.length - 1 && (
                <ChevronRight
                  size={16}
                  style={{ color: "#adb5bd" }}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
