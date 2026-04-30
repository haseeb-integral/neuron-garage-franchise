import { Franchisee, STEPS, StepData } from "@/data/onboardingData";
import { TaskChecklist } from "./TaskChecklist";
import { StepForm } from "./StepForm";
import { FddCountdown } from "./FddCountdown";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles, ExternalLink, Lock } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  franchisee: Franchisee;
  stepId: number;
  data: StepData;
  onUpdate: (patch: Partial<StepData>) => void;
  onUpdateFranchisee: (patch: Partial<Franchisee>) => void;
  onCompleteStep: () => void;
  onBeginActiveOnboarding: () => void;
}

export function StepCard({ franchisee, stepId, data, onUpdate, onUpdateFranchisee, onCompleteStep, onBeginActiveOnboarding }: Props) {
  const step = STEPS.find((s) => s.id === stepId)!;
  const isCurrent = stepId === franchisee.currentStep;
  const isCompleted = stepId < franchisee.currentStep;
  const isLinked = !!franchisee.isLinked;

  const toggleTask = (id: string) => {
    onUpdate({ tasks: data.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) });
  };

  const setForm = (key: string, value: string) => {
    onUpdate({ form: { ...data.form, [key]: value } });
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

      {/* Step 1: Contact details — linked = read-only contact + editable Lead Source; manual = editable everything except name */}
      {stepId === 1 && (
        <div>
          <h4 className="text-sm font-semibold mb-3" style={{ color: "#003c7e" }}>Step Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ContactField
              label="Full Name"
              value={franchisee.name}
              readOnly
            />
            <ContactField
              label="Email"
              type="email"
              value={franchisee.email}
              readOnly={isLinked}
              onChange={(v) => onUpdateFranchisee({ email: v })}
            />
            <ContactField
              label="Phone"
              type="tel"
              value={franchisee.phone}
              readOnly={isLinked}
              onChange={(v) => onUpdateFranchisee({ phone: v })}
            />
            <ContactField
              label="Lead Source"
              placeholder="e.g. Franchise Expo, Referral, Inbound web…"
              value={franchisee.leadSource ?? ""}
              onChange={(v) => onUpdateFranchisee({ leadSource: v })}
            />
          </div>
          {isLinked && (
            <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "#6c757d" }}>
              <Lock size={11} /> Contact info is synced from the linked candidate record.
            </p>
          )}
        </div>
      )}

      {/* Step 2: link to Candidate Lead Sheet (linked only). No duplicate form. */}
      {stepId === 2 && isLinked && franchisee.candidateDbId && (
        <Link
          to={`/candidate-pipeline?candidate=${franchisee.candidateDbId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
          style={{ color: "#003c7e" }}
        >
          View Candidate Lead Sheet <ExternalLink size={13} />
        </Link>
      )}

      {/* Other steps with formFields */}
      {stepId !== 1 && stepId !== 2 && step.formFields.length > 0 && (
        <StepForm step={step} values={data.form} onChange={setForm} />
      )}

      <div>
        <h4 className="text-sm font-semibold mb-2" style={{ color: "#003c7e" }}>Step Notes</h4>
        <Textarea
          value={data.notes}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          rows={3}
          placeholder="Brief notes about this step…"
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

function ContactField({
  label, value, onChange, readOnly, type = "text", placeholder,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <Label className="text-xs mb-1 block" style={{ color: "#495057" }}>{label}</Label>
      {readOnly ? (
        <div
          className="h-10 px-3 py-2 rounded-md text-sm flex items-center"
          style={{ backgroundColor: "#f8f9fa", border: "1px solid #e9ecef", color: value ? "#212529" : "#adb5bd" }}
        >
          {value || "—"}
        </div>
      ) : (
        <Input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange?.(e.target.value)}
        />
      )}
    </div>
  );
}
