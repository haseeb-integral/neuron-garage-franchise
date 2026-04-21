import { Check } from "lucide-react";
import { STEPS } from "@/data/onboardingData";

interface Props {
  currentStep: number;
  selectedStep: number;
  onSelect: (step: number) => void;
}

export function StepProgressBar({ currentStep, selectedStep, onSelect }: Props) {
  return (
    <div className="w-full py-4">
      <div className="flex items-start justify-between relative min-w-[560px]">
        {STEPS.map((s, idx) => {
          const isCompleted = s.id < currentStep;
          const isCurrent = s.id === currentStep;
          const isSelected = s.id === selectedStep;
          const bg = isCompleted ? "#20c997" : isCurrent ? "#fd7e14" : "#ffffff";
          const border = isCompleted ? "#20c997" : isCurrent ? "#fd7e14" : "#adb5bd";
          const fg = isCompleted || isCurrent ? "#ffffff" : "#6c757d";

          return (
            <div key={s.id} className="flex-1 flex flex-col items-center relative">
              {idx < STEPS.length - 1 && (
                <div
                  className="absolute top-4 left-1/2 w-full h-0.5"
                  style={{ backgroundColor: s.id < currentStep ? "#20c997" : "#dee2e6" }}
                />
              )}
              <button
                onClick={() => onSelect(s.id)}
                className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{
                  backgroundColor: bg,
                  border: `2px solid ${border}`,
                  color: fg,
                  boxShadow: isSelected ? "0 0 0 4px rgba(253, 126, 20, 0.2)" : "none",
                }}
              >
                {isCompleted ? <Check size={14} /> : s.id}
              </button>
              <span
                className="text-[10px] mt-1.5 text-center px-1 leading-tight max-w-[80px]"
                style={{ color: isSelected ? "#003c7e" : "#6c757d", fontWeight: isSelected ? 600 : 400 }}
              >
                {s.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
