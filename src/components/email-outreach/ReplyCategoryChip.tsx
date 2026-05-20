import { Sparkles, User, Clock, Pause, CheckCircle2, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CATEGORY_META, type ReplyCategory } from "@/lib/replyCategories";

export interface ReplyChipData {
  category: ReplyCategory | null;
  confidence: number | null;
  reason: string | null;
  overriddenBy: string | null;
  message?: string | null;
  receivedAt?: string | null;
}

/**
 * Chip + rich tooltip explaining who set a reply category and why.
 * Replaces the prior native `title=""` tooltips, which were invisible to most users.
 */
export function ReplyCategoryChip({ data }: { data: ReplyChipData }) {
  const meta = data.category ? CATEGORY_META[data.category] : null;
  if (!meta) return null;
  const conf = data.confidence;
  const isManual = !!data.overriddenBy;
  const setBy = isManual
    ? `Manual · ${data.overriddenBy ?? "user"}`
    : "AI · gemini-2.5-flash-lite";

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex w-fit cursor-help items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${meta.cls}`}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: meta.dot }} />
            {meta.short}
            {conf != null && <span className="opacity-75">· {Math.round(conf * 100)}%</span>}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[320px] space-y-1.5 p-3 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[#8794ab]">Category</span>
            <span className="font-bold text-[#07142f]">{meta.label}</span>
          </div>
          {conf != null && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#8794ab]">Confidence</span>
              <span className="font-bold text-[#07142f]">{Math.round(conf * 100)}%</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[#8794ab]">Set by</span>
            <span className="inline-flex items-center gap-1 font-bold text-[#07142f]">
              {isManual ? <User size={11} className="text-[#174be8]" /> : <Sparkles size={11} className="text-[#7c3aed]" />}
              {setBy}
            </span>
          </div>
          {data.reason && (
            <div className="border-t border-[#eef2f7] pt-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wide text-[#8794ab]">Why</div>
              <div className="mt-0.5 text-[#34445f]">{data.reason}</div>
            </div>
          )}
          {data.message && (
            <div className="border-t border-[#eef2f7] pt-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wide text-[#8794ab]">Reply (excerpt)</div>
              <div className="mt-0.5 italic text-[#526078]">"{data.message.slice(0, 140)}{data.message.length > 140 ? "…" : ""}"</div>
            </div>
          )}
          <div className="border-t border-[#eef2f7] pt-1.5 text-[10px] text-[#8794ab]">{meta.description}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Visible AI vs Manual attribution badge — shown next to the chip. */
export function SourceBadge({ overriddenBy }: { overriddenBy: string | null }) {
  const isManual = !!overriddenBy;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-md border px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
        isManual ? "border-[#bfdbfe] bg-[#eef4ff] text-[#1d4ed8]" : "border-[#e9d5ff] bg-[#f5f0ff] text-[#7c3aed]"
      }`}
      title={isManual ? `Manually set by ${overriddenBy}` : "Classified by AI (gemini-2.5-flash-lite)"}
    >
      {isManual ? <User size={9} /> : <Sparkles size={9} />}
      {isManual ? "Manual" : "AI"}
    </span>
  );
}

/**
 * Pre-reply state chips — make sure every queue row tells a story,
 * even when the classifier hasn't seen a reply yet (the Adra case).
 */
export function QueueStateChip({
  state,
  pushedAt,
  snoozedUntil,
}: {
  state: string;
  pushedAt: string | null;
  snoozedUntil?: string | null;
}) {
  if (state === "promoted") {
    return (
      <span className="inline-flex w-fit items-center gap-1 rounded-md bg-[#dcfce7] px-1.5 py-0.5 text-[10px] font-bold text-[#166534]">
        <CheckCircle2 size={10} /> Promoted to Pipeline
      </span>
    );
  }
  if (state === "snoozed") {
    return (
      <span className="inline-flex w-fit items-center gap-1 rounded-md bg-[#ffedd5] px-1.5 py-0.5 text-[10px] font-bold text-[#9a3412]">
        <Pause size={10} /> Snoozed{snoozedUntil ? ` · until ${new Date(snoozedUntil).toLocaleDateString()}` : ""}
      </span>
    );
  }
  if (state === "suppressed") {
    return (
      <span className="inline-flex w-fit items-center gap-1 rounded-md bg-[#eef2f7] px-1.5 py-0.5 text-[10px] font-bold text-[#475569]">
        Suppressed
      </span>
    );
  }
  if (state === "failed") {
    return (
      <span className="inline-flex w-fit items-center gap-1 rounded-md bg-[#fee2e2] px-1.5 py-0.5 text-[10px] font-bold text-[#b91c1c]">
        <AlertTriangle size={10} /> Push failed
      </span>
    );
  }
  if (state === "sent") {
    const days = pushedAt ? Math.floor((Date.now() - new Date(pushedAt).getTime()) / 86400000) : null;
    const label = days == null
      ? "Awaiting reply"
      : days <= 0
        ? "Awaiting reply · today"
        : days < 3
          ? `Awaiting reply · day ${days + 1}`
          : `No reply yet · day ${days + 1}`;
    const tone = days != null && days >= 3 ? "bg-[#fef3c7] text-[#92400e]" : "bg-[#eef2f7] text-[#475569]";
    return (
      <span className={`inline-flex w-fit items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${tone}`}>
        <Clock size={10} /> {label}
      </span>
    );
  }
  // queued / assigned / sending — handled by the parent state badge already
  return null;
}
