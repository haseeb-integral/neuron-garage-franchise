import { useState, useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Franchisee, StepData } from "@/data/onboardingData";
import { StepProgressBar } from "./StepProgressBar";
import { StepCard } from "./StepCard";
import { ActivityLog } from "./ActivityLog";
import { CommunicationTriggers } from "./CommunicationTriggers";
import { DocumentUpload } from "./DocumentUpload";
import { StatusBadge } from "./StatusBadge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  franchisee: Franchisee | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (f: Franchisee) => void;
}

export function OnboardingWizard({ franchisee, open, onClose, onUpdate }: Props) {
  const [selectedStep, setSelectedStep] = useState<number>(franchisee?.currentStep ?? 1);

  useEffect(() => {
    if (franchisee) setSelectedStep(franchisee.currentStep);
  }, [franchisee?.id]);

  if (!franchisee) return null;

  const data = franchisee.stepData[selectedStep];

  const updateStepData = (patch: Partial<StepData>) => {
    onUpdate({
      ...franchisee,
      stepData: { ...franchisee.stepData, [selectedStep]: { ...data, ...patch } },
    });
  };

  const updateFranchisee = (patch: Partial<Franchisee>) => {
    onUpdate({ ...franchisee, ...patch });
  };

  const completeStep = () => {
    if (franchisee.currentStep >= 7) return;
    const nextStep = franchisee.currentStep + 1;
    const newActivity = [
      {
        id: `a-${Date.now()}`,
        type: "step_complete" as const,
        author: "Current User",
        timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
        content: `Step ${franchisee.currentStep} marked complete.`,
      },
      ...franchisee.activity,
    ];
    const commsMap: Record<number, string> = { 1: "welcome", 2: "roadmap", 3: "market", 4: "fdd", 6: "awarded" };
    const commKey = commsMap[franchisee.currentStep];
    const updatedComms = commKey
      ? franchisee.comms.map((c) =>
          c.key === commKey ? { ...c, sent: true, sentDate: new Date().toISOString().slice(0, 10) } : c,
        )
      : franchisee.comms;

    onUpdate({
      ...franchisee,
      currentStep: nextStep,
      stepData: {
        ...franchisee.stepData,
        [franchisee.currentStep]: { ...data, completionDate: data.completionDate ?? new Date().toISOString().slice(0, 10) },
      },
      activity: newActivity,
      comms: updatedComms,
    });
    setSelectedStep(nextStep);
  };

  const beginActiveOnboarding = () => {
    const newActivity = [
      {
        id: `a-${Date.now()}`,
        type: "step_complete" as const,
        author: "Current User",
        timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
        content: "Active Franchisee Onboarding initiated 🎉",
      },
      ...franchisee.activity,
    ];
    const updatedComms = franchisee.comms.map((c) =>
      c.key === "donut" ? { ...c, sent: true, sentDate: new Date().toISOString().slice(0, 10) } : c,
    );
    onUpdate({ ...franchisee, activity: newActivity, comms: updatedComms });
  };

  const addGlobalFile = (name: string, size: string) => {
    const files = [...(franchisee.globalFiles ?? []), { id: `${Date.now()}-${name}`, name, size }];
    onUpdate({ ...franchisee, globalFiles: files });
    toast.success(`Uploaded ${name}`);
  };
  const removeGlobalFile = (id: string) => {
    onUpdate({ ...franchisee, globalFiles: (franchisee.globalFiles ?? []).filter((f) => f.id !== id) });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-4xl p-0 overflow-y-auto"
        style={{ backgroundColor: "#f2f4f6" }}
      >
        <div className="sticky top-0 z-10 bg-white px-6 py-4" style={{ borderBottom: "1px solid #dee2e6" }}>
          <Button variant="ghost" size="sm" onClick={onClose} className="mb-2 -ml-2">
            <ArrowLeft size={14} /> Back to dashboard
          </Button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold" style={{ color: "#003c7e" }}>{franchisee.name}</h2>
              <p className="text-xs sm:text-sm break-words" style={{ color: "#6c757d" }}>
                {franchisee.city}{franchisee.state ? `, ${franchisee.state}` : ""}
                {franchisee.email ? ` · ${franchisee.email}` : ""}
                {" · "}{franchisee.daysElapsed} days in pipeline
                {franchisee.isLinked ? " · Linked to candidate" : " · Manual entry"}
              </p>
            </div>
            <div className="shrink-0"><StatusBadge status={franchisee.status} /></div>
          </div>
          <div className="overflow-x-auto -mx-2 px-2">
            <StepProgressBar
              currentStep={franchisee.currentStep}
              selectedStep={selectedStep}
              onSelect={setSelectedStep}
            />
          </div>
        </div>

        <div className="p-6 space-y-5">
          <StepCard
            franchisee={franchisee}
            stepId={selectedStep}
            data={data}
            onUpdate={updateStepData}
            onUpdateFranchisee={updateFranchisee}
            onCompleteStep={completeStep}
            onBeginActiveOnboarding={beginActiveOnboarding}
          />

          {/* Global onboarding-wide blocks */}
          <div className="bg-white rounded-lg p-4" style={{ border: "1px solid #dee2e6" }}>
            <DocumentUpload
              files={franchisee.globalFiles ?? []}
              onAdd={addGlobalFile}
              onRemove={removeGlobalFile}
            />
          </div>

          <div className="bg-white rounded-lg p-4" style={{ border: "1px solid #dee2e6" }}>
            <h4 className="text-sm font-semibold mb-2" style={{ color: "#003c7e" }}>Internal Notes</h4>
            <p className="text-xs mb-2" style={{ color: "#6c757d" }}>
              Visible only to internal team — applies to the whole onboarding.
            </p>
            <Textarea
              value={franchisee.globalNotes ?? ""}
              onChange={(e) => updateFranchisee({ globalNotes: e.target.value })}
              rows={4}
              placeholder="Notes about this franchisee's overall onboarding…"
            />
          </div>

          {franchisee.activity.length > 0 && <ActivityLog activity={franchisee.activity} />}

          <CommunicationTriggers comms={franchisee.comms} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
