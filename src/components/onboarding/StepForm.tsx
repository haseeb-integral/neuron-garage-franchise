import { StepDefinition } from "@/data/onboardingData";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Props {
  step: StepDefinition;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export function StepForm({ step, values, onChange }: Props) {
  return (
    <div>
      <h4 className="text-sm font-semibold mb-3" style={{ color: "#003c7e" }}>
        {step.id === 2 ? "Franchise Lead Sheet" : "Step Details"}
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {step.formFields.map((f) => {
          const isWide = f.type === "textarea";
          return (
            <div key={f.key} className={isWide ? "md:col-span-2" : ""}>
              <Label className="text-xs mb-1 block" style={{ color: "#495057" }}>{f.label}</Label>
              {f.type === "textarea" ? (
                <Textarea
                  value={values[f.key] ?? ""}
                  onChange={(e) => onChange(f.key, e.target.value)}
                  rows={3}
                />
              ) : (
                <Input
                  type={f.type}
                  value={values[f.key] ?? ""}
                  onChange={(e) => onChange(f.key, e.target.value)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
