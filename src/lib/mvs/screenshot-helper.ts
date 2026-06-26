import { supabase } from "@/integrations/supabase/client";

export type ProviderScreenshotInfo = {
  signedUrl: string | null;
  capturedAt: string | null;
  sourceUrl: string | null;
  sourceName: string | null;
  providerName: string | null;
  reason?: "no_screenshot" | "sign_failed" | "not_found";
};

/**
 * Look up a provider row and mint a short-lived signed URL for its
 * listing-page screenshot from the private `mvs-screenshots` bucket.
 *
 * Important: this is the *listing page* the provider was discovered on
 * (e.g. a Sawyer search-results page), not a screenshot of the provider's
 * own website. The same file is shared by every provider discovered on
 * that listing page.
 */
export async function getProviderScreenshotUrl(
  providerId: string,
): Promise<ProviderScreenshotInfo> {
  const empty: ProviderScreenshotInfo = {
    signedUrl: null,
    capturedAt: null,
    sourceUrl: null,
    sourceName: null,
    providerName: null,
  };

  const { data, error } = await supabase
    .from("mvs_providers")
    .select(
      "name, platform, url, source_listing_url, screenshot_url, scraped_at, updated_at, created_at",
    )
    .eq("id", providerId)
    .maybeSingle();

  if (error || !data) {
    return { ...empty, reason: "not_found" };
  }

  const path = (data as any).screenshot_url as string | null;
  const sourceUrl =
    ((data as any).source_listing_url as string | null) ??
    ((data as any).url as string | null) ??
    null;
  const sourceName = ((data as any).platform as string | null) ?? null;
  const capturedAt =
    ((data as any).scraped_at as string | null) ??
    ((data as any).updated_at as string | null) ??
    ((data as any).created_at as string | null) ??
    null;
  const providerName = ((data as any).name as string | null) ?? null;

  if (!path) {
    return {
      signedUrl: null,
      capturedAt,
      sourceUrl,
      sourceName,
      providerName,
      reason: "no_screenshot",
    };
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from("mvs-screenshots")
    .createSignedUrl(path, 300);

  if (signErr || !signed?.signedUrl) {
    return {
      signedUrl: null,
      capturedAt,
      sourceUrl,
      sourceName,
      providerName,
      reason: "sign_failed",
    };
  }

  return {
    signedUrl: signed.signedUrl,
    capturedAt,
    sourceUrl,
    sourceName,
    providerName,
  };
}
