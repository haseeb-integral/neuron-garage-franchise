import { Franchisee, STEPS, StepData } from "@/data/onboardingData";
import { TaskChecklist } from "./TaskChecklist";
import { StepForm } from "./StepForm";
import { DocumentUpload } from "./DocumentUpload";
import { FddCountdown } from "./FddCountdown";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Props {
  franchisee: Franchisee;
  stepId: number;
  data: StepData;
  onUpdate: (patch: Partial<StepData>) => void;
  onCompleteStep: () => void;
  onBeginActiveOnboarding: () => void;
}

export function StepCard({ franchisee, stepId, data, onUpdate, onCompleteStep, onBeginActiveOnboarding }: Props) {
  const step = STEPS.find((s) => s.id === stepId)!;
  const isCurrent = stepId === franchisee.currentStep;
  const isCompleted = stepId < franchisee.currentStep;

  const toggleTask = (id: string) => {
    onUpdate({ tasks: data.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) });
  };

  const setForm = (key: string, value: string) => {
    onUpdate({ form: { ...data.form, [key]: value } });
  };

  const addFile = (name: string, size: string) => {
    onUpdate({ files: [...data.files, { id: `${Date.now()}-${name}`, name, size }] });
    toast.success(`Uploaded ${name}`);
  };

  const removeFile = (id: string) => {
    onUpdate({ files: data.files.filter((f) => f.id !== id) });
  };

  return (
    <div className="bg-white rounded-lg p-6 space-y-5" style={{ border: "1px solid #dee2e6" }}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded"
              style={{
                backgroundColor: isCompleted ? "#e6f9f1" : isCurrent ? "#fff3e6" : "#f1f3f5",
                color: isCompleted ? "#0f7a5a" : isCurrent ? "#c2410c" : "#6c757d",
              }}
            >
              STEP {stepId} / 7
            </span>
            {isCompleted && (
              <span className="inline-flex items-center gap-1 text-xs" style={{ color: "#0f7a5a" }}>
                <CheckCircle2 size={12} /> Completed
              </span>
            )}
          </div>
          <h3 className="text-xl font-bold" style={{ color: "#003c7e" }}>{step.title}</h3>
          <p className="text-sm mt-1" style={{ color: "#6c757d" }}>{step.goal}</p>
        </div>
      </div>

      {stepId === 4 && <FddCountdown fddSentDate={franchisee.fddSentDate ?? data.form.fddSentDate} />}

      <TaskChecklist tasks={data.tasks} onToggle={toggleTask} />

      <StepForm step={step} values={data.form} onChange={setForm} />

      <DocumentUpload files={data.files} onAdd={addFile} onRemove={removeFile} />

      <div>
        <h4 className="text-sm font-semibold mb-2" style={{ color: "#003c7e" }}>Internal Notes</h4>
        <Textarea
          value={data.notes}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          rows={3}
          placeholder="Notes visible only to internal team..."
        />
      </div>

      <div>
        <Label className="text-xs mb-1 block" style={{ color: "#495057" }}>Completion Date</Label>
        <Input
          type="date"
          value={data.completionDate ?? ""}
          onChange={(e) => onUpdate({ completionDate: e.target.value })}
          className="max-w-xs"
        />
      </div>

      {isCurrent && stepId < 7 && (
        <div className="pt-3" style={{ borderTop: "1px solid #f1f3f5" }}>
          <Button
            onClick={onCompleteStep}
            className="text-white"
            style={{ backgroundColor: "#fd7e14" }}
          >
            <CheckCircle2 size={16} /> Mark Step {stepId} Complete
          </Button>
        </div>
      )}

      {stepId === 7 && isCurrent && (
        <div className="pt-3" style={{ borderTop: "1px solid #f1f3f5" }}>
          <Button
            onClick={onBeginActiveOnboarding}
            size="lg"
            className="text-white w-full"
            style={{ backgroundColor: "#fd7e14" }}
          >
            <Sparkles size={16} /> Begin Active Franchisee Onboarding
          </Button>
        </div>
      )}
    </div>
  );
}
