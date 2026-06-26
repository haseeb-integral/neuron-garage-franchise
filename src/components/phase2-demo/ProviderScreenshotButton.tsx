import { useState } from "react";
import { Camera, ExternalLink, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getProviderScreenshotUrl,
  type ProviderScreenshotInfo,
} from "@/lib/mvs/screenshot-helper";

const NAVY = "#07142f";
const MUTED = "#526078";
const BORDER = "#eef2f7";
const SOFT = "#f7faff";
const BLUE = "#174be8";

type Props = {
  providerId: string;
  providerName?: string | null;
  variant?: "icon" | "link";
};

/**
 * Small "📷 View source" button. Clicking opens a dialog with the
 * listing-page screenshot saved when this provider was discovered.
 */
export function ProviderScreenshotButton({ providerId, providerName, variant = "icon" }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<ProviderScreenshotInfo | null>(null);

  const handleOpen = async (next: boolean) => {
    setOpen(next);
    if (!next) return;
    setLoading(true);
    setInfo(null);
    try {
      const result = await getProviderScreenshotUrl(providerId);
      setInfo(result);
    } finally {
      setLoading(false);
    }
  };

  const trigger =
    variant === "link" ? (
      <button
        type="button"
        onClick={() => handleOpen(true)}
        className="inline-flex items-center gap-1 text-[11px] font-semibold underline decoration-dotted underline-offset-2"
        style={{ color: BLUE }}
        title="View saved listing-page screenshot"
      >
        <Camera className="h-3 w-3" /> View source
      </button>
    ) : (
      <button
        type="button"
        onClick={() => handleOpen(true)}
        className="inline-flex h-5 w-5 items-center justify-center rounded hover:bg-[#eef2f7]"
        style={{ color: BLUE }}
        title="View saved listing-page screenshot"
        aria-label="View source screenshot"
      >
        <Camera className="h-3 w-3" />
      </button>
    );

  const captured = info?.capturedAt
    ? new Date(info.capturedAt).toLocaleString()
    : null;
  const name = info?.providerName ?? providerName ?? "this provider";

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle style={{ color: NAVY }}>Source proof — {name}</DialogTitle>
            <DialogDescription>
              This is the listing page where we discovered this provider. It is{" "}
              <strong>not</strong> a screenshot of the provider's own website, and we do
              not save the raw HTML.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div
              className="flex items-center gap-2 rounded-md border p-6 text-[12px]"
              style={{ borderColor: BORDER, color: MUTED, backgroundColor: SOFT }}
            >
              <Loader2 className="h-4 w-4 animate-spin" /> Loading screenshot…
            </div>
          ) : !info ? null : info.signedUrl ? (
            <div className="space-y-3">
              <div
                className="overflow-auto rounded-md border bg-white"
                style={{ borderColor: BORDER, maxHeight: "60vh" }}
              >
                <img
                  src={info.signedUrl}
                  alt={`Listing page where ${name} was discovered`}
                  loading="lazy"
                  className="block w-full"
                />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]" style={{ color: MUTED }}>
                {info.sourceName && (
                  <span>
                    Captured from <strong style={{ color: NAVY }}>{info.sourceName}</strong>
                  </span>
                )}
                {captured && (
                  <span>
                    on <strong style={{ color: NAVY }}>{captured}</strong>
                  </span>
                )}
                {info.sourceUrl && (
                  <a
                    href={info.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold"
                    style={{ color: BLUE }}
                  >
                    Open original listing <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div
              className="rounded-md border p-4 text-[12px]"
              style={{ borderColor: BORDER, color: MUTED, backgroundColor: SOFT }}
            >
              {info.reason === "no_screenshot"
                ? "No screenshot was saved for this provider."
                : info.reason === "sign_failed"
                  ? "We could not load the saved screenshot right now. Try again in a moment."
                  : "Provider not found."}
              {info.sourceUrl && (
                <div className="mt-2">
                  <a
                    href={info.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold"
                    style={{ color: BLUE }}
                  >
                    Open original listing <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
