import { useEffect, useState } from "react";
import { Franchisee, SAMPLE_FRANCHISEES, STEPS } from "@/data/onboardingData";
import { OnboardingTable } from "@/components/onboarding/OnboardingTable";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { Button } from "@/components/ui/button";
import { Plus, Users, TrendingUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { consumePendingOnboardings, onOnboardingAdded } from "@/data/onboardingStore";

const buildEmptyStepData = () => {
  const out: Record<number, Franchisee["stepData"][number]> = {} as Franchisee["stepData"];
  STEPS.forEach((s) => {
    out[s.id] = {
      tasks: s.defaultTasks.map((t, i) => ({ id: `t-${s.id}-${i}-${Date.now()}`, label: t, done: false })),
      form: {},
      files: [],
      notes: "",
    };
  });
  return out;
};

const Onboarding = () => {
  const [franchisees, setFranchisees] = useState<Franchisee[]>(SAMPLE_FRANCHISEES);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Pick up any onboardings queued from other pages (e.g. Candidate Pipeline)
  useEffect(() => {
    const drain = () => {
      const pending = consumePendingOnboardings();
      if (pending.length > 0) {
        setFranchisees((prev) => [...pending, ...prev]);
      }
    };
    drain();
    return onOnboardingAdded(drain);
  }, []);

  const selected = franchisees.find((f) => f.id === selectedId) ?? null;

  const updateFranchisee = (updated: Franchisee) => {
    setFranchisees((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  };

  const addNew = () => {
    const id = `f-${Date.now()}`;
    const today = new Date().toISOString().slice(0, 10);
    const newF: Franchisee = {
      id,
      name: "New Prospect",
      city: "—",
      state: "—",
      email: "",
      phone: "",
      currentStep: 1,
      daysElapsed: 0,
      status: "on_track",
      startDate: today,
      stepData: buildEmptyStepData(),
      activity: [
        {
          id: `a-${Date.now()}`,
          type: "note",
          author: "System",
          timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
          content: "Onboarding started.",
        },
      ],
      comms: [
        { key: "welcome", name: "Welcome Email", triggerLabel: "After Step 1", sent: false },
        { key: "roadmap", name: "Process Roadmap", triggerLabel: "After Step 2", sent: false },
        { key: "market", name: "Market Analysis", triggerLabel: "After Step 3", sent: false },
        { key: "fdd", name: "FDD Document", triggerLabel: "After Step 4", sent: false },
        { key: "awarded", name: "Congratulations / Franchise Awarded", triggerLabel: "After Step 6", sent: false },
        { key: "donut", name: "Donut Delivery Note + Onboarding Access", triggerLabel: "After Step 7", sent: false },
      ],
    };
    setFranchisees((prev) => [newF, ...prev]);
    setSelectedId(id);
    toast.success("New onboarding started");
  };

  const total = franchisees.length;
  const onTrack = franchisees.filter((f) => f.status === "on_track").length;
  const stalled = franchisees.filter((f) => f.status !== "on_track").length;

  return (
    <div className="-mx-4 md:-mx-8 -my-4 md:-my-8 px-4 md:px-8 py-4 md:py-8 min-h-screen" style={{ backgroundColor: "#f2f4f6" }}>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Onboarding"
          subtitle="Guide new franchisees through the 7-step qualification & onboarding journey."
          action={
            <Button
              onClick={addNew}
              className="text-white w-full sm:w-auto"
              style={{ backgroundColor: "#fd7e14", minHeight: 44 }}
            >
              <Plus size={16} /> New Onboarding
            </Button>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard icon={Users} label="Active Onboardings" value={total} color="#003c7e" />
          <StatCard icon={TrendingUp} label="On Track" value={onTrack} color="#20c997" />
          <StatCard icon={AlertTriangle} label="Needs Attention" value={stalled} color="#ff4438" />
        </div>

        <OnboardingTable franchisees={franchisees} onSelect={setSelectedId} />

        <OnboardingWizard
          franchisee={selected}
          open={!!selected}
          onClose={() => setSelectedId(null)}
          onUpdate={updateFranchisee}
        />
      </div>
    </div>
  );
};

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Users; label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-lg p-4 flex items-center gap-3" style={{ border: "1px solid #dee2e6" }}>
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <div className="text-2xl font-bold" style={{ color: "#003c7e" }}>{value}</div>
        <div className="text-xs" style={{ color: "#6c757d" }}>{label}</div>
      </div>
    </div>
  );
}

export default Onboarding;
