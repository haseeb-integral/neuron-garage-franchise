import { supabase } from "@/integrations/supabase/client";

/** Read fresh settings for each launch; a failed read must not allow sending. */
export async function loadCompanyMailingAddress(): Promise<string> {
  const { data, error } = await supabase.from("company_settings").select("mailing_address").eq("id", true).maybeSingle();
  if (error) throw new Error("Could not load the company mailing address. Try again before launching.");
  return data?.mailing_address?.trim() ?? "";
}