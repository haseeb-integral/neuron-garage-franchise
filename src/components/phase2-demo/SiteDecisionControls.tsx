import { useState, useEffect } from "react";
import { Star, Pencil } from "lucide-react";

import { useSiteDecisions, type SiteVerdict } from "@/hooks/useSiteDecisions";

const NAVY = "#07142f";
const MUTED = "#526078";
const BORDER = "#eef2f7";
const SOFT = "#f7faff";

const OPTS: { v: SiteVerdict; label: string; bg: string; fg: string }[] = [
  { v: "recommend", label: "Recommend", bg: "#e3f3e7", fg: "#1d6b32" },
  { v: "worth_a_look", label: "Worth a look", bg: "#fff8d9", fg: "#7a5800" },
  { v: "dont_recommend", label: "Don't recommend", bg: "#fce7ec", fg: "#a3142b" },
];

interface Props {
  address: string;
  schoolName: string;
  /** Optional score-derived suggestion shown as a hint; never auto-selects a verdict. */
  suggestedTier?: SiteVerdict;
}

export function SiteDecisionControls({ address, schoolName, suggestedTier }: Props) {
  const { byAddress, setVerdict, setWinner, setNotes, isAuthed } = useSiteDecisions();
  const row = byAddress.get(address);
  // No auto-default — only show a selected verdict if the user actually chose one.
  const v: SiteVerdict = row?.verdict ?? "undecided";
  const winner = row?.is_winner ?? false;

  const [notesOpen, setNotesOpen] = useState(false);
  const [draft, setDraft] = useState(row?.notes ?? "");
  useEffect(() => { setDraft(row?.notes ?? ""); }, [row?.notes]);

  return (
    <div className="mt-3 rounded-md border p-2" style={{ borderColor: BORDER, backgroundColor: SOFT }}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
          Decision
        </span>
        <button
          type="button"
          onClick={() => setWinner(address, schoolName, !winner)}
          disabled={!isAuthed}
          className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold disabled:opacity-50"
          style={{
            borderColor: winner ? "#1d6b32" : BORDER,
            backgroundColor: winner ? "#1d6b32" : "#fff",
            color: winner ? "#fff" : MUTED,
          }}
          title="Mark this site as the winner across the compared set"
        >
          <Star size={10} fill={winner ? "#fff" : "none"} />
          {winner ? "Winner" : "Mark winner"}
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {OPTS.map((o) => {
          const selected = v === o.v;
          const suggested = !row?.verdict && suggestedTier === o.v;
          return (
            <button
              key={o.v}
              type="button"
              onClick={() => setVerdict(address, schoolName, o.v)}
              disabled={!isAuthed}
              className="rounded-md border px-1.5 py-0.5 text-[10px] font-semibold disabled:opacity-50"
              style={{
                borderColor: selected ? o.fg : suggested ? o.fg : BORDER,
                borderStyle: suggested && !selected ? "dashed" : "solid",
                backgroundColor: selected ? o.bg : "#fff",
                color: selected ? o.fg : suggested ? o.fg : MUTED,
              }}
              title={suggested && !selected ? `Suggested by score — click to confirm` : undefined}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {!row?.verdict && (
        <p className="mt-1 text-[10px]" style={{ color: MUTED }}>
          {suggestedTier ? "Score suggests a tier (dashed). Confirm or override above." : "No decision yet."}
        </p>
      )}
      <div className="mt-1.5">
        {notesOpen ? (
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              setNotes(address, schoolName, draft);
              setNotesOpen(false);
            }}
            rows={2}
            placeholder="Why this verdict?"
            className="w-full rounded-md border px-1.5 py-1 text-[11px]"
            style={{ borderColor: BORDER, color: NAVY }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setNotesOpen(true)}
            disabled={!isAuthed}
            className="inline-flex items-center gap-1 text-[10px] disabled:opacity-50"
            style={{ color: row?.notes ? NAVY : MUTED }}
          >
            <Pencil size={9} />
            <span className="truncate">{row?.notes || "Add note"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
