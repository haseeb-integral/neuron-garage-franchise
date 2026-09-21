import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TeacherProspect } from "@/data/teacherData";
import { Loader2, Sparkles, Store, ExternalLink, BadgeCheck, Info } from "lucide-react";
import { prospectTier, signalLabel, confidenceBlurb } from "@/lib/teacherSignals";

interface EvidenceRow {
  id: string;
  evidence_class: string;
  signal_type: string | null;
  source_label: string | null;
  source_url: string | null;
  summary: string | null;
  confidence: string | null;
  match_basis: string | null;
  created_at: string;
}

const ConfidencePill = ({ conf }: { conf: string | null }) => {
  if (!conf) return null;
  const up = conf.toUpperCase();
  const tone =
    up === "HIGH" ? "bg-[#dcfce7] text-[#0a8f5a]" :
    up === "MEDIUM" ? "bg-[#dbeafe] text-[#1e6fb8]" :
    "bg-[#fee2e2] text-[#b91c1c]";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black ${tone}`}>{up} confidence</span>;
};

function EvidenceCard({ r }: { r: EvidenceRow }) {
  const blurb = confidenceBlurb(r.confidence);
  return (
    <li className="rounded-lg border border-[#eef2f7] bg-[#fafbfe] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-bold text-[#07142f]">{signalLabel(r.signal_type)}</span>
        <ConfidencePill conf={r.confidence} />
      </div>
      {r.summary && <p className="mt-1 text-[12px] leading-5 text-[#34445f]">{r.summary}</p>}
      {r.source_label && <p className="mt-1 text-[11px] text-[#66728a]">Source: {r.source_label}</p>}
      {blurb && (
        <p className="mt-1 flex items-start gap-1 text-[11px] text-[#8794ab]">
          <Info size={11} className="mt-[2px] shrink-0" /> {blurb}
        </p>
      )}
      {r.match_basis && <p className="mt-1 text-[11px] italic text-[#8794ab]">{r.match_basis}</p>}
      {r.source_url && (
        <a
          href={/^https?:\/\//i.test(r.source_url) ? r.source_url : `https://${r.source_url}`}
          target="_blank"
          rel="noreferrer"
          className="mt-1.5 inline-flex max-w-full items-center gap-1 truncate text-[11px] font-semibold text-[#174be8] hover:underline"
        >
          <ExternalLink size={11} /> View source
        </a>
      )}
    </li>
  );
}

export function TeacherEvidenceSection({ prospect }: { prospect: TeacherProspect }) {
  const [rows, setRows] = useState<EvidenceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("teacher_evidence")
        .select("id, evidence_class, signal_type, source_label, source_url, summary, confidence, match_basis, created_at")
        .eq("teacher_id", prospect.uuid)
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setRows((data ?? []) as EvidenceRow[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [prospect.uuid]);

  const creator = rows.filter((r) => r.evidence_class === "verified_creator");
  const secondary = rows.filter((r) => r.evidence_class === "secondary");
  const verified = rows.filter((r) => r.evidence_class === "verified_fact");

  const tier = prospectTier(prospect);

  const hasCounts =
    (prospect.verifiedFactCount ?? 0) > 0 ||
    (prospect.creatorSignalCount ?? 0) > 0 ||
    (prospect.secondarySignalCount ?? 0) > 0;

  if (!hasCounts && rows.length === 0 && !loading) return null;

  return (
    <section className="rounded-xl border border-[#e7edf5] bg-white p-4">
      <h4 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[#8794ab]">
        <Sparkles size={14} className="text-[#174be8]" /> Enrichment &amp; Signals
      </h4>

      <div className="rounded-lg p-3" style={{ background: tier.bg }}>
        <p className="text-[13px] font-black" style={{ color: tier.fg }}>{tier.label}</p>
        <p className="mt-0.5 text-[12px] leading-5" style={{ color: tier.fg }}>{tier.blurb}</p>
      </div>

      {loading ? (
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-[#8794ab]"><Loader2 size={12} className="animate-spin" /> Loading evidence…</p>
      ) : (
        <>
          {(secondary.length > 0 || creator.length > 0) && (
            <div className="mt-4">
              <h5 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-[#92400e]">
                <Store size={11} /> Entrepreneurial signals ({secondary.length + creator.length})
              </h5>
              <ul className="mt-2 space-y-2">
                {[...creator, ...secondary].map((r) => <EvidenceCard key={r.id} r={r} />)}
              </ul>
            </div>
          )}

          {verified.length > 0 && (
            <div className="mt-4">
              <h5 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-[#0a8f5a]">
                <BadgeCheck size={11} /> Verified facts ({verified.length})
              </h5>
              <ul className="mt-2 space-y-1.5">
                {verified.map((r) => (
                  <li key={r.id} className="flex items-start gap-2 rounded-lg border border-[#eef2f7] bg-[#fafbfe] px-3 py-2 text-[12px] text-[#34445f]">
                    <BadgeCheck size={13} className="mt-[1px] shrink-0 text-[#0a8f5a]" />
                    <span>{signalLabel(r.signal_type)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[11px] text-[#8794ab]">
                Source-cited facts from district directories, DonorsChoose, grant lists and award pages.
              </p>
            </div>
          )}

          {rows.length === 0 && (
            <p className="mt-3 text-[12px] italic text-[#b0bbd0]">
              No signal detail saved for this teacher yet.
            </p>
          )}
        </>
      )}

      {prospect.recordAddedAt && (
        <p className="mt-3 text-[11px] text-[#8794ab]">Record added {new Date(prospect.recordAddedAt).toLocaleDateString()}</p>
      )}
    </section>
  );
}
