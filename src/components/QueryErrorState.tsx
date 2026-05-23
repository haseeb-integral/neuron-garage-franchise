import { AlertTriangle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  /** Headline shown to the user. Defaults to "Couldn't load data". */
  title?: string;
  /** Optional detail line (e.g. error.message). Keep short and friendly. */
  message?: string;
  /** Called when the user clicks Retry. May return a Promise to show a spinner. */
  onRetry?: () => void | Promise<unknown>;
  /** Visual size — banner is inline above content, card is a centered empty-state. */
  variant?: "banner" | "card";
  className?: string;
}

/**
 * Friendly error state for failed data fetches. Use above (or in place of)
 * a list/table when a query errors and there's no usable data to show.
 *
 *   <QueryErrorState
 *     message={query.error?.message}
 *     onRetry={() => query.refetch()}
 *   />
 */
export function QueryErrorState({
  title = "Couldn't load data",
  message,
  onRetry,
  variant = "card",
  className = "",
}: Props) {
  const [busy, setBusy] = useState(false);

  const handleRetry = async () => {
    if (!onRetry) return;
    setBusy(true);
    try {
      await onRetry();
    } finally {
      setBusy(false);
    }
  };

  if (variant === "banner") {
    return (
      <div
        role="alert"
        className={`flex items-start gap-3 rounded-lg border border-[#fde0de] bg-[#fef5f4] px-4 py-3 ${className}`}
      >
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#c0392b]" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#7a1a10]">{title}</p>
          {message && (
            <p className="mt-0.5 truncate text-xs text-[#7a1a10]/80" title={message}>
              {message}
            </p>
          )}
        </div>
        {onRetry && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRetry}
            disabled={busy}
            className="h-8 shrink-0 gap-1.5 border-[#f4b5af] bg-white text-xs font-semibold text-[#7a1a10] hover:bg-[#fdeae8]"
          >
            <RefreshCw size={13} className={busy ? "animate-spin" : ""} />
            {busy ? "Retrying…" : "Retry"}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#fde0de] bg-[#fef5f4] px-6 py-10 text-center ${className}`}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fde0de] text-[#c0392b]">
        <AlertTriangle size={20} />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-bold text-[#7a1a10]">{title}</p>
        {message ? (
          <p className="max-w-md text-xs text-[#7a1a10]/80">{message}</p>
        ) : (
          <p className="max-w-md text-xs text-[#7a1a10]/80">
            We hit a snag talking to the server. Check your connection and try again.
          </p>
        )}
      </div>
      {onRetry && (
        <Button
          size="sm"
          onClick={handleRetry}
          disabled={busy}
          className="mt-1 h-9 gap-1.5 bg-[#c0392b] text-xs font-semibold text-white hover:bg-[#a83224]"
        >
          <RefreshCw size={13} className={busy ? "animate-spin" : ""} />
          {busy ? "Retrying…" : "Try again"}
        </Button>
      )}
    </div>
  );
}
