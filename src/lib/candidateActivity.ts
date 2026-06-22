import { supabase } from "@/integrations/supabase/client";

export type ActivityType =
  | "note"
  | "lead_sheet_saved"
  | "process_step_updated"
  | "stage_changed"
  | "vote_cast";

/**
 * Append a row to candidate_activities. Never throws — failures are
 * console.warned so the parent save flow is never blocked.
 */
export async function logActivity(
  candidateId: string,
  type: ActivityType,
  content: string,
  metadata: Record<string, any> = {},
): Promise<void> {
  if (!candidateId) return;
  try {
    const { data: sess } = await supabase.auth.getUser();
    const actor_email = sess?.user?.email ?? null;
    const { error } = await supabase.from("candidate_activities").insert({
      candidate_id: candidateId,
      type,
      content,
      metadata,
      actor_email,
    } as any);
    if (error) console.warn("logActivity failed:", error.message);
  } catch (e: any) {
    console.warn("logActivity threw:", e?.message ?? e);
  }
}
