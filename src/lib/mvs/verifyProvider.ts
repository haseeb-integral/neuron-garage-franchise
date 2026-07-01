import { supabase } from "@/integrations/supabase/client";

export type VerifyAction = "verified" | "rejected" | "edited";

export async function setProviderVerification(opts: {
  providerId: string;
  action: VerifyAction;
  notes?: string | null;
  // For edit: new price range. Original snapshot captured server-side via SELECT.
  newPriceMin?: number | null;
  newPriceMax?: number | null;
  currentPriceMin?: number | null;
  currentPriceMax?: number | null;
}): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData?.user?.id ?? null;

  const patch: Record<string, unknown> = {
    verification_status: opts.action,
    verified_by: uid,
    verified_at: new Date().toISOString(),
    verification_notes: opts.notes ?? null,
    // Once a human touches it, it no longer "needs review".
    price_needs_review: false,
  };

  if (opts.action === "rejected") {
    // Snapshot old price then clear it so it stops counting in scoring.
    if (opts.currentPriceMin != null) patch.price_original_min = opts.currentPriceMin;
    if (opts.currentPriceMax != null) patch.price_original_max = opts.currentPriceMax;
    patch.price_min = null;
    patch.price_max = null;
  }

  if (opts.action === "edited") {
    if (opts.currentPriceMin != null) patch.price_original_min = opts.currentPriceMin;
    if (opts.currentPriceMax != null) patch.price_original_max = opts.currentPriceMax;
    patch.price_min = opts.newPriceMin ?? null;
    patch.price_max = opts.newPriceMax ?? opts.newPriceMin ?? null;
  }

  const { error } = await supabase
    .from("mvs_providers")
    .update(patch)
    .eq("id", opts.providerId);
  if (error) throw error;
}
