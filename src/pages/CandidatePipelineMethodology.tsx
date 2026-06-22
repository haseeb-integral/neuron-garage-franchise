import { Kanban, CheckCircle2 } from "lucide-react";
import { DocShell, DocCard } from "@/components/DocShell";

type Section = {
  title: string;
  items: { name: string; detail: string }[];
};

const SECTIONS: Section[] = [
  {
    title: "Audit & Lead Sheet",
    items: [
      {
        name: "Full audit against the Google Form",
        detail:
          "We checked every field in your Google Form against the app to find what was missing and what was already working.",
      },
      {
        name: "Lead Sheet tab completed",
        detail:
          "Added 6 fields that were missing from Step 1 of the form: Role, Married, City, Discovery source, Investment ability, Sweat equity, and Other opportunities. The database now stores all of these.",
      },
      {
        name: "Registration state warning",
        detail:
          "Under the City field, a yellow banner now warns the user if a candidate lives in a state where recruitment is not yet registered.",
      },
    ],
  },
  {
    title: "Real Activity Log",
    items: [
      {
        name: "Every action is now saved",
        detail:
          "A new database table (candidate_activities) records Lead Sheet saves, Process checkbox toggles, stage moves, and committee votes. Nothing is fake or in-memory anymore.",
      },
      {
        name: "Lead Sheet shows what changed",
        detail:
          'Instead of a vague "updated" message, the log now says things like "Lead sheet updated — Motivation and Timeline changed" and shows the old value next to the new value.',
      },
      {
        name: "Process tab shows what was toggled",
        detail:
          'Instead of "Step 1 updated", the log now says things like "Step 1 — Trial Close: Answered all relevant questions unchecked".',
      },
    ],
  },
  {
    title: "Notes & Activity Tab Redesign",
    items: [
      {
        name: "Notes get their own panel",
        detail:
          "Notes now show in a yellow card panel right under the Add Note box. System events (saves, toggles, stage moves, votes) live below in a separate Activity Timeline.",
      },
      {
        name: "Add Note box improved",
        detail:
          "Bigger text area, a character counter, and a keyboard shortcut (Ctrl+Enter) to save the note quickly.",
      },
      {
        name: "Filter chips",
        detail:
          "You can click All, Changes, Stage, or Votes to filter the Activity Timeline.",
      },
      {
        name: "Dual timestamps",
        detail:
          'Every row shows both relative time ("2m ago") and exact time ("Jun 22, 10:04 PM"), so you always know when something happened.',
      },
    ],
  },
  {
    title: "Cleanup & Verification",
    items: [
      {
        name: "Homework tab removed",
        detail:
          "The Process tab is now the single place for all checklists, trial closes, and homework. No more confusion about where to look.",
      },
      {
        name: "Smoke tests passed",
        detail:
          "Every save, toggle, stage move, vote, and note add was tested end-to-end and confirmed to show up correctly in the activity log.",
      },
    ],
  },
];

export default function CandidatePipelineMethodology() {
  return (
    <DocShell
      eyebrow="Status: Done"
      eyebrowIcon={CheckCircle2}
      title="Candidate Pipeline — Status: Done"
      subtitle="A plain-English summary of every change made to the Candidate Pipeline after the Google Form audit, so anyone on the team can see what shipped without reading code."
    >
      <DocCard>
        <div className="space-y-10">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-[#FFD400]">
                <Kanban size={18} className="text-[#003c7e]" />
                <h2 className="text-[20px] font-bold text-[#003c7e]">
                  {section.title}
                </h2>
              </div>
              <ul className="space-y-4">
                {section.items.map((item) => (
                  <li
                    key={item.name}
                    className="flex gap-3 items-start"
                  >
                    <CheckCircle2
                      size={18}
                      className="text-[#0757ff] mt-0.5 shrink-0"
                    />
                    <div>
                      <div className="text-[15px] font-semibold text-[#0b1a36]">
                        {item.name}
                      </div>
                      <div className="text-[14px] leading-[1.7] text-[#3a4a66] mt-0.5">
                        {item.detail}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DocCard>
    </DocShell>
  );
}
