import { useEffect, useState } from "react";
import { Users, Mail, ShieldCheck, MailQuestion, MailX, MailMinus, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SCOPE_COLORS, type PoolScope } from "./ScopeSwitcher";

export interface ScopeFilter {
  state?: string;
  city?: string;
}

interface StatNumbers {
  total_contacts: number;
  total_emails: number;
  verified: number;
  catch_all: number;
  invalid: number;
  no_email: number;
}

interface CardSpec {
  key: keyof StatNumbers;
  label: string;
  Icon: typeof Users;
  formula: string;
}

const CARDS: CardSpec[] = [
  { key: "total_contacts", label: "Total Contacts", Icon: Users, formula: "" },
  { key: "total_emails", label: "Total Emails", Icon: Mail, formula: "" },
  { key: "verified", label: "Verified Emails", Icon: ShieldCheck, formula: "" },
  { key: "catch_all", label: "Catch-All Emails", Icon: MailQuestion, formula: "" },
  { key: "invalid", label: "Invalid Emails", Icon: MailX, formula: "" },
  { key: "no_email", label: "No Email Found", Icon: MailMinus, formula: "" },
];

const FORMULAS: Record<PoolScope, Record<keyof StatNumbers, string>> = {
  master_db: {
    total_contacts: "COUNT(*) FROM teacher_prospects [+ city/state filter]",
    total_emails: "COUNT(*) WHERE email IS NOT NULL AND email <> ''",
    verified: "COUNT(*) WHERE verification_status = 'valid'",
    catch_all: "COUNT(*) WHERE verification_status = 'catch_all'",
    invalid: "COUNT(*) WHERE verification_status = 'invalid'",
    no_email: "COUNT(*) WHERE email IS NULL OR email = '' OR needs_email_enrichment = true",
  },
  smartlead: {
    total_contacts: "COUNT(DISTINCT teacher_prospect_id) FROM outreach_queue WHERE pushed_at IS NOT NULL",
    total_emails: "Same as Total Contacts (only teachers with emails can be pushed)",
    verified: "COUNT(*) joined to teacher_prospects WHERE verification_status = 'valid'",
    catch_all: "COUNT(*) joined to teacher_prospects WHERE verification_status = 'catch_all'",
    invalid: "COUNT(*) joined to teacher_prospects WHERE verification_status = 'invalid'",
    no_email: "Always 0 — teachers without emails cannot be pushed to SmartLead",
  },
};

async function fetchMasterStats(filter: ScopeFilter): Promise<StatNumbers> {
  const base = supabase.from("teacher_prospects").select("*", { count: "exact", head: true });
  const apply = <T extends typeof base>(q: T) => {
    if (filter.state) q.eq("state", filter.state);
    if (filter.city) q.eq("city", filter.city);
    return q;
  };
  const [total, withEmail, valid, catchAll, invalid, noEmail] = await Promise.all([
    apply(supabase.from("teacher_prospects").select("*", { count: "exact", head: true })),
    apply(supabase.from("teacher_prospects").select("*", { count: "exact", head: true })).not("email", "is", null).neq("email", ""),
    apply(supabase.from("teacher_prospects").select("*", { count: "exact", head: true })).eq("verification_status", "valid"),
    apply(supabase.from("teacher_prospects").select("*", { count: "exact", head: true })).eq("verification_status", "catch_all"),
    apply(supabase.from("teacher_prospects").select("*", { count: "exact", head: true })).eq("verification_status", "invalid"),
    apply(supabase.from("teacher_prospects").select("*", { count: "exact", head: true })).or("email.is.null,email.eq.,needs_email_enrichment.eq.true"),
  ]);
  return {
    total_contacts: total.count ?? 0,
    total_emails: withEmail.count ?? 0,
    verified: valid.count ?? 0,
    catch_all: catchAll.count ?? 0,
    invalid: invalid.count ?? 0,
    no_email: noEmail.count ?? 0,
  };
}

async function fetchSmartleadStats(filter: ScopeFilter): Promise<StatNumbers> {
  // Subset of master pool that has been pushed (outreach_queue.pushed_at IS NOT NULL).
  // We pull a flat join via teacher_prospect_id and count client-side because
  // PostgREST joins for aggregates are awkward. Volume is small (only pushed leads).
  const { data, error } = await supabase
    .from("outreach_queue")
    .select("teacher_prospect_id, pushed_at, teacher_prospects!inner(state, city, email, verification_status)")
    .not("pushed_at", "is", null);
  if (error) throw error;
  const rows = (data ?? []) as Array<{
    teacher_prospect_id: string;
    teacher_prospects: { state?: string | null; city?: string | null; email?: string | null; verification_status?: string | null } | null;
  }>;
  const filtered = rows.filter((r) => {
    const t = r.teacher_prospects;
    if (!t) return false;
    if (filter.state && t.state !== filter.state) return false;
    if (filter.city && t.city !== filter.city) return false;
    return true;
  });
  // Dedupe by teacher_prospect_id — same teacher may be in multiple campaigns.
  const unique = new Map<string, typeof filtered[number]>();
  for (const r of filtered) if (!unique.has(r.teacher_prospect_id)) unique.set(r.teacher_prospect_id, r);
  const arr = Array.from(unique.values());
  const has = (v: string | null | undefined, target: string) => (v ?? "").toLowerCase() === target;
  const withEmail = arr.filter((r) => (r.teacher_prospects?.email ?? "").trim().length > 0);
  return {
    total_contacts: arr.length,
    total_emails: withEmail.length,
    verified: arr.filter((r) => has(r.teacher_prospects?.verification_status, "valid")).length,
    catch_all: arr.filter((r) => has(r.teacher_prospects?.verification_status, "catch_all")).length,
    invalid: arr.filter((r) => has(r.teacher_prospects?.verification_status, "invalid")).length,
    no_email: 0,
  };
}

interface Props {
  scope: PoolScope;
  filter?: ScopeFilter;
  onTotalChange?: (n: number) => void;
}

export function StatStripCards({ scope, filter = {}, onTotalChange }: Props) {
  const [stats, setStats] = useState<StatNumbers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const colors = SCOPE_COLORS[scope];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (scope === "master_db" ? fetchMasterStats(filter) : fetchSmartleadStats(filter))
      .then((s) => {
        if (cancelled) return;
        setStats(s);
        onTotalChange?.(s.total_contacts);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, filter.state, filter.city]);

  const total = stats?.total_contacts ?? 0;
  const pct = (n: number) => (total > 0 ? `${Math.round((n / total) * 100)}%` : "0%");

  return (
    <div
      className="mb-3 grid gap-2 rounded-xl border p-3 md:grid-cols-3"
      style={{ borderColor: colors.border, background: colors.bg }}
    >
      {CARDS.map(({ key, label, Icon }) => {
        const value = stats?.[key];
        const isTotal = key === "total_contacts";
        return (
          <div key={key} className="rounded-lg border bg-white p-3" style={{ borderColor: colors.border }}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ background: colors.bg, color: colors.fg }}
                >
                  <Icon size={14} />
                </div>
                <div className="text-[11px] font-bold text-[#34445f]">{label}</div>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Show formula for ${label}`}
                    className="rounded p-1 text-[#8794ab] hover:bg-[#f1f5fb] hover:text-[#526078]"
                  >
                    <Info size={12} />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 text-[11px]">
                  <div className="mb-1 font-black text-[#07142f]">{label} — formula</div>
                  <code className="block whitespace-pre-wrap break-words rounded bg-[#f7faff] p-2 text-[10px] text-[#34445f]">
                    {FORMULAS[scope][key]}
                  </code>
                  {(filter.city || filter.state) && (
                    <div className="mt-2 text-[10px] text-[#526078]">
                      Active filter: {[filter.city, filter.state].filter(Boolean).join(", ")}
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
            {loading ? (
              <div className="mt-2 h-7 w-20 animate-pulse rounded bg-[#edf2f8]" />
            ) : error ? (
              <div className="mt-2 text-xs text-[#ef4444]" title={error}>error</div>
            ) : (
              <div className="mt-1 flex items-baseline gap-2">
                <div className="text-2xl font-black" style={{ color: colors.accent }}>
                  {(value ?? 0).toLocaleString()}
                </div>
                {!isTotal && (
                  <div className="text-[11px] font-bold" style={{ color: colors.fg }}>
                    {pct(value ?? 0)} <span className="font-normal text-[#8794ab]">of total contacts</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
