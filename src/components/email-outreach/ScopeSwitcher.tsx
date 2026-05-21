import { Database, FlaskConical, Send } from "lucide-react";

export type PoolScope = "master_db" | "smartlead";

const SCOPE_STORAGE_KEY = "neuron_garage_email_outreach_scope";

/**
 * SmartLead phase flag — flip to "live" once mailbox warm-up is complete and
 * we start emailing actual teachers. Until then, every "SmartLead" pushed
 * lead is plumbing/testing, NOT real outreach. This drives all phase-aware
 * labels and descriptions in the Email Outreach UI so Kaylie / Sam never
 * mistake test traffic for live teacher outreach.
 */
export const SMARTLEAD_PHASE: "warmup" | "live" = "warmup";

export function readStoredScope(): PoolScope {
  if (typeof window === "undefined") return "master_db";
  const v = window.localStorage.getItem(SCOPE_STORAGE_KEY);
  return v === "smartlead" ? "smartlead" : "master_db";
}

export function writeStoredScope(scope: PoolScope) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SCOPE_STORAGE_KEY, scope);
}

interface Props {
  scope: PoolScope;
  onChange: (s: PoolScope) => void;
  masterCount?: number | null;
  smartleadCount?: number | null;
}

/**
 * Primary scope toggle for Email Outreach. Three pills:
 *  - Master Teacher DB: every teacher we know about. Most have no email.
 *  - Warm-Up (SmartLead, warmup phase): plumbing + mailbox warming. Counts
 *    here are test prospects + internal/warmup-pool sends — NOT teacher
 *    outreach. Rendered in amber so nobody mistakes it for live activity.
 *  - Live Outreach: disabled until SMARTLEAD_PHASE flips to "live".
 */
export function ScopeSwitcher({ scope, onChange, masterCount, smartleadCount }: Props) {
  const isMaster = scope === "master_db";
  const isWarmup = !isMaster && SMARTLEAD_PHASE === "warmup";

  const desc = isMaster
    ? "You are viewing the Master Teacher Database. These teachers have NOT been emailed. To email them, push them to SmartLead."
    : isWarmup
    ? "Mailbox WARM-UP in progress — SmartLead is emailing internal staff and the warm-up pool to season our domains. No teachers are receiving outreach yet. The count below reflects test pushes for plumbing only."
    : "You are viewing SmartLead — teachers we are actively emailing. Stats below come from SmartLead.";

  const fmt = (n: number | null | undefined) =>
    typeof n === "number" ? n.toLocaleString() : "—";

  // Phase-aware styling for the SmartLead pill. In warm-up we go amber so the
  // count never reads as "live outreach to teachers".
  const smartleadActive = !isMaster;
  const smartleadActiveBg = isWarmup ? "bg-[#b45309]" : "bg-[#174be8]";
  const smartleadInactiveFg = isWarmup ? "text-[#b45309]" : "text-[#174be8]";
  const smartleadInactiveBadge = isWarmup ? "bg-[#fef3c7] text-[#b45309]" : "bg-[#eef4ff] text-[#174be8]";
  const smartleadLabel = isWarmup ? "Warm-Up" : "SmartLead";
  const SmartleadIcon = isWarmup ? FlaskConical : Send;

  return (
    <div className="mb-3 rounded-xl border border-[#e7edf5] bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-[#8794ab]">Viewing</span>
        <div className="inline-flex rounded-lg border border-[#dbe4f2] bg-[#f7faff] p-0.5">
          <button
            onClick={() => onChange("master_db")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-black transition-colors ${
              isMaster ? "bg-[#526078] text-white shadow-sm" : "text-[#526078] hover:bg-white"
            }`}
          >
            <Database size={12} /> Master Teacher DB
            <span className={`ml-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${isMaster ? "bg-white/20" : "bg-[#eef2f7] text-[#526078]"}`}>
              {fmt(masterCount)}
            </span>
          </button>
          <button
            onClick={() => onChange("smartlead")}
            title={isWarmup ? "SmartLead is in mailbox warm-up — emailing staff + warm-up pool, NOT teachers." : undefined}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-black transition-colors ${
              smartleadActive ? `${smartleadActiveBg} text-white shadow-sm` : `${smartleadInactiveFg} hover:bg-white`
            }`}
          >
            <SmartleadIcon size={12} /> {smartleadLabel}
            <span className={`ml-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${smartleadActive ? "bg-white/20" : smartleadInactiveBadge}`}>
              {fmt(smartleadCount)}
            </span>
          </button>
          {/* Phase-2 placeholder: Live Outreach (disabled until warm-up completes). */}
          <button
            disabled
            title="Live teacher outreach starts after mailbox warm-up completes (days to weeks away)."
            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-black text-[#8794ab] opacity-70"
          >
            <Send size={12} /> Live Outreach
            <span className="ml-1 rounded bg-[#eef2f7] px-1.5 py-0.5 text-[10px] font-bold text-[#8794ab]">
              Not started
            </span>
          </button>
        </div>
        {isWarmup && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-[#fcd34d] bg-[#fffbeb] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#b45309]">
            <FlaskConical size={10} /> Warm-Up Phase · no teacher outreach yet
          </span>
        )}
      </div>
      <p className="mt-2 text-[11px] text-[#526078]">{desc}</p>
    </div>
  );
}

export const SCOPE_COLORS = {
  master_db: { fg: "#526078", bg: "#f4f6fa", border: "#dbe2ec", accent: "#374151" },
  smartlead:
    SMARTLEAD_PHASE === "warmup"
      ? { fg: "#b45309", bg: "#fffbeb", border: "#fcd34d", accent: "#92400e" }
      : { fg: "#174be8", bg: "#eef4ff", border: "#c6d6f7", accent: "#0d3aa8" },
} as const;
