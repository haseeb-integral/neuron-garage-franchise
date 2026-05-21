import { Send, ArrowRight } from "lucide-react";

interface Props {
  verifiedCount: number | null;
  onPush: () => void;
}

/**
 * Only visible when scope = master_db. Surfaces the gap between
 * "verified emails in our master pool" and "leads actually in SmartLead".
 * Click → opens PushToSmartLeadModal (Sprint 2).
 */
export function PushToSmartLeadBanner({ verifiedCount, onPush }: Props) {
  const n = verifiedCount ?? 0;
  if (n === 0) return null;
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#c6d6f7] bg-[#eef4ff] p-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#174be8]">
          <Send size={14} />
        </div>
        <div>
          <div className="text-sm font-black text-[#0d3aa8]">
            {n.toLocaleString()} verified email{n === 1 ? "" : "s"} in Master DB ready to push to SmartLead
          </div>
          <div className="text-[11px] text-[#34445f]">
            Teachers must be in SmartLead before we can email them.
          </div>
        </div>
      </div>
      <button
        onClick={onPush}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#174be8] px-3 py-2 text-xs font-black text-white hover:bg-[#0d3aa8]"
      >
        Push verified emails to SmartLead <ArrowRight size={12} />
      </button>
    </div>
  );
}
