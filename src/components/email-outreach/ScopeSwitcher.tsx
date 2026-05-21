import { Database, Send } from "lucide-react";

export type PoolScope = "master_db" | "smartlead";

const SCOPE_STORAGE_KEY = "neuron_garage_email_outreach_scope";

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
 * Primary scope toggle for Email Outreach. Two pools:
 *  - Master Teacher DB: every teacher we know about. Most have no email.
 *  - SmartLead: subset that has been pushed for active outreach.
 *
 * Color-coded so other widgets on the page can read the scope from prop drilling
 * and theme themselves accordingly:
 *   master_db -> slate (#526078)
 *   smartlead -> brand blue (#174be8)
 */
export function ScopeSwitcher({ scope, onChange, masterCount, smartleadCount }: Props) {
  const isMaster = scope === "master_db";
  const desc = isMaster
    ? "You are viewing the Master Teacher Database. These teachers have NOT been emailed. To email them, push them to SmartLead."
    : "You are viewing SmartLead — teachers we are actively emailing. Stats below come from SmartLead.";

  const fmt = (n: number | null | undefined) =>
    typeof n === "number" ? n.toLocaleString() : "—";

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
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-black transition-colors ${
              !isMaster ? "bg-[#174be8] text-white shadow-sm" : "text-[#174be8] hover:bg-white"
            }`}
          >
            <Send size={12} /> SmartLead
            <span className={`ml-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${!isMaster ? "bg-white/20" : "bg-[#eef4ff] text-[#174be8]"}`}>
              {fmt(smartleadCount)}
            </span>
          </button>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-[#526078]">{desc}</p>
    </div>
  );
}

export const SCOPE_COLORS = {
  master_db: { fg: "#526078", bg: "#f4f6fa", border: "#dbe2ec", accent: "#374151" },
  smartlead: { fg: "#174be8", bg: "#eef4ff", border: "#c6d6f7", accent: "#0d3aa8" },
} as const;
