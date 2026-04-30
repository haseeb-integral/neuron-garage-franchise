import { supabase } from "@/integrations/supabase/client";
import { ONBOARDING_STEP_TEMPLATE, TOTAL_ONBOARDING_STEPS } from "./onboardingTemplate";

export interface StartOnboardingArgs {
  candidateId: string;
  franchiseeName: string;
  city: string;
  state: string;
}

export interface StartOnboardingResult {
  id: string;
  alreadyExisted: boolean;
}

async function seedSteps(onboardingId: string) {
  const rows = ONBOARDING_STEP_TEMPLATE.map((s) => ({
    onboarding_id: onboardingId,
    step_index: s.step_index,
    title: s.title,
    description: s.description,
  }));
  const { error } = await supabase.from("onboarding_steps").insert(rows);
  if (error) throw error;
}

export async function startOnboardingForCandidate(
  args: StartOnboardingArgs,
): Promise<StartOnboardingResult> {
  // Check for existing record
  const { data: existing, error: existingErr } = await supabase
    .from("onboarding_records")
    .select("id")
    .eq("candidate_id", args.candidateId)
    .maybeSingle();
  if (existingErr) throw existingErr;
  if (existing?.id) {
    return { id: existing.id, alreadyExisted: true };
  }

  const { data: inserted, error: insErr } = await supabase
    .from("onboarding_records")
    .insert({
      candidate_id: args.candidateId,
      franchisee_name: args.franchiseeName,
      city: args.city,
      state: args.state,
      status: "on_track",
      current_step_index: 0,
      total_steps: TOTAL_ONBOARDING_STEPS,
    })
    .select("id")
    .single();
  if (insErr) throw insErr;

  await seedSteps(inserted.id);

  return { id: inserted.id, alreadyExisted: false };
}

export interface ManualOnboardingArgs {
  franchiseeName: string;
  city: string;
  state: string;
  status?: "on_track" | "stalled" | "overdue" | "completed";
}

export async function createManualOnboarding(
  args: ManualOnboardingArgs,
): Promise<{ id: string }> {
  const { data: inserted, error } = await supabase
    .from("onboarding_records")
    .insert({
      candidate_id: null,
      franchisee_name: args.franchiseeName,
      city: args.city,
      state: args.state,
      status: args.status ?? "on_track",
      current_step_index: 0,
      total_steps: TOTAL_ONBOARDING_STEPS,
    })
    .select("id")
    .single();
  if (error) throw error;

  await seedSteps(inserted.id);
  return { id: inserted.id };
}
