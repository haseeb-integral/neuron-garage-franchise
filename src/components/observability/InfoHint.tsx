// ============================================================================
// Small "(i)" icon with a hover/tap tooltip. Used on every widget header in
// /observability so non-technical users always have plain-English help nearby.
// ============================================================================

import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function InfoHint({
  title,
  children,
  size = 13,
}: {
  title?: string;
  children: React.ReactNode;
  size?: number;
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={title ?? "What is this?"}
            className="inline-flex items-center justify-center rounded-full text-[#94a3b8] hover:text-[#0757ff] focus:outline-none focus-visible:text-[#0757ff]"
          >
            <HelpCircle size={size} strokeWidth={1.75} />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="max-w-xs rounded-lg border border-[#eef2f7] bg-white p-3 text-[12px] leading-relaxed text-[#07142f] shadow-lg"
        >
          {title && <div className="mb-1 font-bold text-[#0b1a36]">{title}</div>}
          <div className="text-[#526078]">{children}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Friendly inline panel — shows when a widget hits an error. Soft warning tone. */
export function FriendlyErrorPanel({
  message,
  hint,
  variant = "soft",
  onRetry,
}: {
  message: string;
  hint?: string;
  variant?: "soft" | "inline";
  onRetry?: () => void;
}) {
  if (variant === "inline") {
    return (
      <div className="mt-1 text-[11px] leading-relaxed text-[#92400e]">
        <span className="font-bold">{message}</span>
        {hint && <span className="text-[#a16207]"> {hint}</span>}
      </div>
    );
  }
  return (
    <div className="mt-2 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-[12px] leading-relaxed text-[#7c4a03]">
      <div className="font-bold">{message}</div>
      {hint && <div className="mt-0.5 text-[#92611a]">{hint}</div>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1.5 text-[11px] font-bold text-[#7c4a03] underline-offset-2 hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}
