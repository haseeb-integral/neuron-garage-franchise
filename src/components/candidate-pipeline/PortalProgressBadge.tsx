import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Candidate } from "@/data/pipelineData";
import { stageToStep, stepProgress } from "@/lib/portalPath";

interface PortalData { linked: Set<string>; ticks: Map<string, { step: number; key: string }[]> }

/** One shared fetch for every card (cached), staff-only data. */
function usePortalData() {
  return useQuery({
    queryKey: ["portal-progress-all"],
    staleTime: 60_000,
    queryFn: async (): Promise<PortalData> => {
      const [{ data: links }, { data: rows }] = await Promise.all([
        supabase.from("candidate_portal_users").select("candidate_id"),
        supabase.from("candidate_portal_checklist").select("candidate_id, step_num, item_key"),
      ]);
      const ticks = new Map<string, { step: number; key: string }[]>();
      for (const r of rows ?? []) {
        const list = ticks.get(r.candidate_id) ?? [];
        list.push({ step: r.step_num, key: r.item_key });
        ticks.set(r.candidate_id, list);
      }
      return { linked: new Set((links ?? []).map((l) => l.candidate_id)), ticks };
    },
  });
}

/** "3 of 4 done" — prospect's ticked tasks for their current step. Only for portal prospects. */
export function PortalProgressBadge({ candidate }: { candidate: Candidate }) {
  const { data } = usePortalData();
  const dbId = (candidate as any).dbId as string | undefined;
  const step = stageToStep(candidate.stage);
  if (!data || !dbId || !step || !data.linked.has(dbId)) return null;
  const keys = (data.ticks.get(dbId) ?? []).filter((t) => t.step === step).map((t) => t.key);
  const { done, total } = stepProgress(step, keys);
  const complete = done === total;
  return (
    <span
      title={`Prospect portal: ${done} of ${total} tasks done for step ${step}`}
      className={`px-1.5 py-0 text-[10px] font-semibold rounded border ${
        complete ? "bg-portal-yellow text-portal-yellow-foreground border-portal-yellow" : "text-muted-foreground"
      }`}
    >
      {done} of {total} done
    </span>
  );
}
