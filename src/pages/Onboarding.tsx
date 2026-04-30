import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Users, TrendingUp, AlertTriangle, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { NewOnboardingModal } from "@/components/onboarding/NewOnboardingModal";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { Franchisee, STEPS } from "@/data/onboardingData";

type DbStatus = "on_track" | "stalled" | "overdue" | "completed";

interface OnboardingRow {
  id: string;
  candidate_id: string | null;
  franchisee_name: string;
  city: string;
  state: string;
  status: DbStatus;
  current_step_index: number;
  total_steps: number;
  created_at: string;
}

const statusConfig: Record<DbStatus, { label: string; bg: string; color: string }> = {
  on_track:  { label: "On Track",        bg: "#d1f5e7", color: "#0d6e4f" },
  stalled:   { label: "Needs Attention", bg: "#ffe9d4", color: "#a85b00" },
  overdue:   { label: "Overdue",         bg: "#fde0de", color: "#a3251a" },
  completed: { label: "Completed",       bg: "#e9ecef", color: "#495057" },
};

const daysSince = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
};

const Onboarding = () => {
  const [rows, setRows] = useState<OnboardingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const [flashId, setFlashId] = useState<string | null>(null);
  const [activeFranchisee, setActiveFranchisee] = useState<Franchisee | null>(null);

  const buildFranchiseeFromRow = (r: OnboardingRow): Franchisee => {
    const stepData: Franchisee["stepData"] = {} as Franchisee["stepData"];
    STEPS.forEach((s) => {
      stepData[s.id] = {
        tasks: s.defaultTasks.map((t, i) => ({ id: `t-${r.id}-${s.id}-${i}`, label: t, done: s.id < (r.current_step_index + 1) })),
        form: {},
        files: [],
        notes: "",
      };
    });
    return {
      id: r.id,
      name: r.franchisee_name,
      city: r.city,
      state: r.state,
      email: "",
      phone: "",
      currentStep: Math.min(7, Math.max(1, r.current_step_index + 1)),
      daysElapsed: daysSince(r.created_at),
      status: (r.status === "completed" ? "on_track" : r.status) as Franchisee["status"],
      startDate: r.created_at.slice(0, 10),
      stepData,
      activity: [],
      comms: [
        { key: "welcome", name: "Welcome Email", triggerLabel: "After Step 1", sent: false },
        { key: "roadmap", name: "Process Roadmap", triggerLabel: "After Step 2", sent: false },
        { key: "market", name: "Market Analysis", triggerLabel: "After Step 3", sent: false },
        { key: "fdd", name: "FDD Document", triggerLabel: "After Step 4", sent: false },
        { key: "awarded", name: "Congratulations / Franchise Awarded", triggerLabel: "After Step 6", sent: false },
        { key: "donut", name: "Donut Delivery Note + Onboarding Access", triggerLabel: "After Step 7", sent: false },
      ],
    };
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("onboarding_records")
      .select("id, candidate_id, franchisee_name, city, state, status, current_step_index, total_steps, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
    } else {
      setRows((data ?? []) as OnboardingRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Highlight a row when arriving via ?highlight=<id>
  useEffect(() => {
    if (!highlightId || rows.length === 0) return;
    const exists = rows.some((r) => r.id === highlightId);
    if (!exists) return;
    setFlashId(highlightId);
    // scroll into view
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-onboarding-id="${highlightId}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    const t = setTimeout(() => {
      setFlashId(null);
      // clear param so it doesn't re-flash on revisit
      const next = new URLSearchParams(searchParams);
      next.delete("highlight");
      setSearchParams(next, { replace: true });
    }, 2400);
    return () => clearTimeout(t);
  }, [highlightId, rows, searchParams, setSearchParams]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.status !== "completed").length;
    const onTrack = rows.filter((r) => r.status === "on_track").length;
    const needsAttention = rows.filter((r) => r.status === "stalled" || r.status === "overdue").length;
    return { active, onTrack, needsAttention };
  }, [rows]);

  const handleCreated = (id: string) => {
    load().then(() => {
      const next = new URLSearchParams(searchParams);
      next.set("highlight", id);
      setSearchParams(next, { replace: true });
    });
  };

  return (
    <div className="-mx-4 md:-mx-8 -my-4 md:-my-8 px-4 md:px-8 py-4 md:py-8 min-h-screen" style={{ backgroundColor: "#f2f4f6" }}>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Onboarding"
          subtitle="Guide new franchisees through the 7-step qualification & onboarding journey."
          action={
            <Button
              size="sm"
              onClick={() => setNewOpen(true)}
              className="text-white w-full sm:w-auto"
              style={{ backgroundColor: "#fd7e14" }}
            >
              <Plus size={14} /> New Onboarding
            </Button>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard icon={Users} label="Active Onboardings" value={stats.active} color="#003c7e" />
          <StatCard icon={TrendingUp} label="On Track" value={stats.onTrack} color="#20c997" />
          <StatCard icon={AlertTriangle} label="Needs Attention" value={stats.needsAttention} color="#ff4438" />
        </div>

        <div className="bg-white rounded-lg" style={{ border: "1px solid #dee2e6" }}>
          <div className="overflow-x-auto rounded-lg">
            <Table>
              <TableHeader>
                <TableRow style={{ backgroundColor: "#f8f9fa" }}>
                  <TableHead style={{ color: "#003c7e" }}>Name</TableHead>
                  <TableHead style={{ color: "#003c7e" }}>City</TableHead>
                  <TableHead style={{ color: "#003c7e" }}>Current Step</TableHead>
                  <TableHead style={{ color: "#003c7e" }} className="w-[200px]">Progress</TableHead>
                  <TableHead style={{ color: "#003c7e" }}>Days Elapsed</TableHead>
                  <TableHead style={{ color: "#003c7e" }}>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const denom = Math.max(1, r.total_steps - 1);
                  const pct = Math.round((r.current_step_index / denom) * 100);
                  const status = statusConfig[r.status] ?? statusConfig.on_track;
                  const isFlash = flashId === r.id;
                  return (
                    <TableRow
                      key={r.id}
                      data-onboarding-id={r.id}
                      style={isFlash ? { backgroundColor: "#fff3cd", transition: "background-color 0.6s ease" } : undefined}
                    >
                      <TableCell className="font-semibold" style={{ color: "#003c7e" }}>{r.franchisee_name}</TableCell>
                      <TableCell>{r.city}{r.state ? `, ${r.state}` : ""}</TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">Step {r.current_step_index + 1} / {r.total_steps}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="h-2" />
                          <span className="text-xs font-medium w-10" style={{ color: "#6c757d" }}>{pct}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{daysSince(r.created_at)} days</TableCell>
                      <TableCell>
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: status.bg, color: status.color }}
                        >
                          {status.label}
                        </span>
                      </TableCell>
                      <TableCell><ChevronRight size={16} style={{ color: "#adb5bd" }} /></TableCell>
                    </TableRow>
                  );
                })}
                {!loading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8" style={{ color: "#adb5bd" }}>
                      No franchisees in onboarding yet. Start one from the Candidate Pipeline.
                    </TableCell>
                  </TableRow>
                )}
                {loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8" style={{ color: "#adb5bd" }}>
                      Loading...
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <NewOnboardingModal
          open={newOpen}
          onOpenChange={setNewOpen}
          onCreated={handleCreated}
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
