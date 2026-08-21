import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TeacherProspect } from "@/data/teacherData";
import { Loader2, Sparkles, Store, ExternalLink } from "lucide-react";

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

const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center rounded-full bg-[#eef4ff] px-2 py-0.5 text-[11px] font-bold text-[#174be8]">{children}</span>
);

function EvidenceList({ rows }: { rows: EvidenceRow[] }) {
  return (
    <ul className="mt-2 space-y-2">
      {rows.map((r) => (
        <li key={r.id} className="rounded-lg border border-[#eef2f7] bg-[#fafbfe] p-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {r.signal_type && <Chip>{r.signal_type}</Chip>}
            {r.source_label && <span className="text-[11px] font-semibold text-[#34445f]">{r.source_label}</span>}
            {r.confidence && <span className="text-[11px] text-[#8794ab]">confidence: {r.confidence}</span>}
          </div>
          {r.summary && <p className="mt-1 text-[12px] leading-5 text-[#34445f]">{r.summary}</p>}
          {r.source_url && (
            <a
              href={/^https?:\/\//i.test(r.source_url) ? r.source_url : `https://${r.source_url}`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 truncate text-[11px] font-medium text-[#174be8] hover:underline"
            >
              <ExternalLink size={11} /> {r.source_url}
            </a>
          )}
        </li>
      ))}
    </ul>
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

  const creator = rows.filter((r) => r.evidence_class === "creator");
  const secondary = rows.filter((r) => r.evidence_class !== "creator");

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

      <div className="flex flex-wrap gap-1.5">
        <Chip>{prospect.verifiedFactCount ?? 0} verified facts</Chip>
        <Chip>{prospect.creatorSignalCount ?? 0} creator signals</Chip>
        <Chip>{prospect.secondarySignalCount ?? 0} side-business signals</Chip>
        {prospect.secondarySignalConfidence && <Chip>confidence: {prospect.secondarySignalConfidence}</Chip>}
      </div>

      {(prospect.verifiedSignalTypes?.length ?? 0) > 0 && (
        <p className="mt-2 text-[12px] text-[#526078]">
          <span className="font-semibold text-[#07142f]">Verified types:</span> {prospect.verifiedSignalTypes!.join(", ")}
        </p>
      )}
      {prospect.secondarySignalMatchBasis && (
        <p className="mt-1 text-[12px] text-[#526078]">
          <span className="font-semibold text-[#07142f]">Match basis:</span> {prospect.secondarySignalMatchBasis}
        </p>
      )}
      {prospect.recordAddedAt && (
        <p className="mt-1 text-[11px] text-[#8794ab]">Record added {new Date(prospect.recordAddedAt).toLocaleDateString()}</p>
      )}

      {loading ? (
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-[#8794ab]"><Loader2 size={12} className="animate-spin" /> Loading evidence…</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-[12px] italic text-[#b0bbd0]">No evidence links saved yet.</p>
      ) : (
        <>
          {creator.length > 0 && (
            <div className="mt-3">
              <h5 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-[#526078]"><Sparkles size={11} /> Creator evidence</h5>
              <EvidenceList rows={creator} />
            </div>
          )}
          {secondary.length > 0 && (
            <div className="mt-3">
              <h5 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-[#526078]"><Store size={11} /> Side-business evidence</h5>
              <EvidenceList rows={secondary} />
            </div>
          )}
        </>
      )}
    </section>
  );
}
