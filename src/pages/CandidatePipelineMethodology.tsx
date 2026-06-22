import { Kanban, Info, ArrowRight, Users, MessageSquare, FileEdit, CheckCircle2 } from "lucide-react";
import { DocShell, DocCard } from "@/components/DocShell";

function SectionTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 mb-3">
      <span className="text-[11px] font-bold uppercase tracking-wider text-[#174be8]">
        Section {n}
      </span>
      <h2 className="text-base font-bold text-[#07142f]">{children}</h2>
    </div>
  );
}

export default function CandidatePipelineMethodology() {
  return (
    <DocShell
      eyebrow="How It Works"
      eyebrowIcon={Kanban}
      title={<>Candidate Pipeline</>}
      subtitle="A plain-English guide to the Candidate Pipeline page — what it shows, what each tab does, and how your team uses it to move franchisee candidates from first contact to signing."
    >
      <DocCard>
        <div className="text-[#07142f]">

          {/* Section 1 */}
          <section className="mb-10">
            <SectionTitle n={1}>What the pipeline page is</SectionTitle>
            <div className="space-y-3 text-[13.5px] leading-relaxed text-[#1a2540]">
              <p>
                The Candidate Pipeline is a digital whiteboard that tracks every person who is interested in opening a Neuron Garage franchise. Candidates are shown as cards inside columns that represent stages — from the very first contact all the way to signing the agreement.
              </p>
              <p>
                At the top of the page you will see four numbers: total candidates currently in the pipeline, how many are "hot" (fit score 80 or above), the conversion rate, and how many new candidates arrived this week. These numbers update automatically as cards move.
              </p>
              <p>
                You can shrink the cards to fit more on screen, or expand them to see full details. You can also collapse any stage column if it gets too full.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="mb-10">
            <SectionTitle n={2}>The Kanban columns (stages)</SectionTitle>
            <div className="space-y-3 text-[13.5px] leading-relaxed text-[#1a2540]">
              <p>
                Each column is a stage in the journey. A candidate can only be in one stage at a time. Here is what each column means:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>New Lead</strong> — someone just entered the system, usually from outreach or a web form.</li>
                <li><strong>Discovery Call</strong> — the first real conversation happened.</li>
                <li><strong>FDD Review</strong> — the candidate received the Franchise Disclosure Document and is reviewing it.</li>
                <li><strong>Confirmation</strong> — the selection committee approved the candidate and final alignment is happening.</li>
                <li><strong>Signing</strong> — the candidate signs the franchise agreement.</li>
                <li><strong>Onboarding</strong> — paperwork is complete and the new franchisee is getting set up.</li>
                <li><strong>Disqualified</strong> — the candidate is no longer in the running. A reason is required before a card can be moved here.</li>
              </ul>
              <p>
                You can drag a card from one column to another to change the candidate's stage. The app will ask you to confirm big moves — for example, moving someone into Signing requires that they have already been through Confirmation. Moving someone out of FDD Review is blocked until 16 days have passed since the FDD was sent, unless a compliance override is used.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="mb-10">
            <SectionTitle n={3}>Filters at the top</SectionTitle>
            <div className="space-y-3 text-[13.5px] leading-relaxed text-[#1a2540]">
              <p>
                Above the Kanban board there are dropdown filters so you can focus on a specific group of candidates:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Owner</strong> — show only candidates assigned to a specific team member.</li>
                <li><strong>Tag</strong> — filter by fit tag such as Strong Fit, Needs Work, or Untagged.</li>
                <li><strong>Fit Score</strong> — show only candidates above a certain score (90, 80, 70, 60, or below 60).</li>
                <li><strong>Days in Stage</strong> — find candidates who are fresh (0–3 days), on watch (4–7 days), or stalled (8+ days).</li>
              </ul>
              <p>
                When filters are active, a "Clear" button appears so you can reset everything in one click.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="mb-10">
            <SectionTitle n={4}>The detail panel and its tabs</SectionTitle>
            <div className="space-y-3 text-[13.5px] leading-relaxed text-[#1a2540]">
              <p>
                When you click a candidate card, a side panel opens. This panel has several tabs. Each tab holds a different kind of information about that candidate.
              </p>

              <div className="space-y-4 mt-3">
                <div className="rounded-md border border-[#eef2f7] bg-[#fafbfd] p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Info size={14} className="text-[#003c7e]" />
                    <h3 className="text-sm font-bold text-[#07142f]">Overview tab</h3>
                  </div>
                  <p className="text-[13px] leading-relaxed text-[#3a4a66]">
                    This tab shows the candidate's photo, name, contact info, location, assigned owner, source, and how long they have been in their current stage. You can click any field to edit it inline. If the candidate's state requires franchise registration, a yellow warning banner appears to remind you to check compliance before sending the FDD. There are also cards for Other Opportunities, Mailing Address, Partner Info, and Compliance Audit.
                  </p>
                </div>

                <div className="rounded-md border border-[#eef2f7] bg-[#fafbfd] p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <FileEdit size={14} className="text-[#003c7e]" />
                    <h3 className="text-sm font-bold text-[#07142f]">Lead Sheet tab</h3>
                  </div>
                  <p className="text-[13px] leading-relaxed text-[#3a4a66]">
                    This is the first-step intake form. It collects role (Operator, Investor, or Other), marital status, city, how they discovered Neuron Garage, investment ability, sweat-equity willingness, liquid capital, net worth, desired market, timeline, motivation, background notes, and other opportunities they are considering. A yellow warning banner reminds you of registration states. When you save, the app records exactly which fields changed and logs that to the activity timeline.
                  </p>
                </div>

                <div className="rounded-md border border-[#eef2f7] bg-[#fafbfd] p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 size={14} className="text-[#003c7e]" />
                    <h3 className="text-sm font-bold text-[#07142f]">Process tab</h3>
                  </div>
                  <p className="text-[13px] leading-relaxed text-[#3a4a66]">
                    This tab holds the full 7-step franchisee qualification workflow. Each step is an expandable card with checkboxes for Trial Close items, Post-Call Actions, and Homework. Some steps also have extra fields — for example, Step 3 asks for a credit score and background check summary, and Step 4 asks for the FDD sent date. The app auto-saves checkbox changes after a short delay. A progress bar shows how many items are done inside each step. If the candidate is in a registration state, a warning appears here too.
                  </p>
                </div>

                <div className="rounded-md border border-[#eef2f7] bg-[#fafbfd] p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare size={14} className="text-[#003c7e]" />
                    <h3 className="text-sm font-bold text-[#07142f]">Notes & Activity tab</h3>
                  </div>
                  <p className="text-[13px] leading-relaxed text-[#3a4a66]">
                    This tab is split into three parts. At the top is a Process Roadmap — a checklist of steps for the candidate's current stage that any staff member can check off. Below that is an "Add a note" box with a bigger text area, a character counter, and a Ctrl+Enter shortcut to post quickly. Under the note box is the Notes panel, where every human-written note appears in yellow cards with the author's name and time. At the bottom is the Activity Timeline — a feed of everything the system recorded automatically: lead sheet saves, process checkbox toggles, stage moves, and committee votes. You can filter the timeline by All, Changes, Stage moves, or Votes. Every row shows both relative time (like "2m ago") and exact time.
                  </p>
                </div>

                <div className="rounded-md border border-[#eef2f7] bg-[#fafbfd] p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Users size={14} className="text-[#003c7e]" />
                    <h3 className="text-sm font-bold text-[#07142f]">Committee Votes tab</h3>
                  </div>
                  <p className="text-[13px] leading-relaxed text-[#3a4a66]">
                    This tab shows how the selection committee voted on the candidate. The summary at the top counts Approve, Needs Info, and Reject votes. Below that, any logged-in team member can cast their own vote or record a proxy vote on behalf of another committee member. There is also a manual-vote form for committee members who do not have logins (for example, Kaylie, Sam, or Skylar). Every vote is timestamped and shown with any comment the voter left.
                  </p>
                </div>

                <div className="rounded-md border border-[#eef2f7] bg-[#fafbfd] p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowRight size={14} className="text-[#003c7e]" />
                    <h3 className="text-sm font-bold text-[#07142f]">Stage History tab</h3>
                  </div>
                  <p className="text-[13px] leading-relaxed text-[#3a4a66]">
                    This tab shows every stage the candidate has ever been in, with the date they entered and how many days they stayed there. It is useful for understanding how fast (or slow) a candidate is moving through the pipeline.
                  </p>
                </div>

                <div className="rounded-md border border-[#eef2f7] bg-[#fafbfd] p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <FileEdit size={14} className="text-[#003c7e]" />
                    <h3 className="text-sm font-bold text-[#07142f]">Documents tab</h3>
                  </div>
                  <p className="text-[13px] leading-relaxed text-[#3a4a66]">
                    This tab is where you upload and manage files related to the candidate — background checks, credit checks, FDD receipts, facility forms, and any other paperwork. Files are tied to the candidate record so the whole team can find them.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="mb-10">
            <SectionTitle n={5}>How activity is tracked</SectionTitle>
            <div className="space-y-3 text-[13.5px] leading-relaxed text-[#1a2540]">
              <p>
                Every time someone saves the Lead Sheet, toggles a checkbox in the Process tab, moves a candidate to a new stage, casts a committee vote, or adds a note, the app writes a permanent record. This means the activity timeline is always accurate and nobody has to remember what happened last week.
              </p>
              <p>
                For Lead Sheet saves, the log tells you exactly which fields changed and shows the old value next to the new value. For Process tab changes, the log tells you which step, which checklist group, and which item was checked or unchecked. For stage moves, the log records who moved the candidate and from which stage to which stage.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="mb-10">
            <SectionTitle n={6}>Adding a new candidate</SectionTitle>
            <div className="space-y-3 text-[13.5px] leading-relaxed text-[#1a2540]">
              <p>
                There is a blue "Add Candidate" button at the top right of the pipeline page. Clicking it opens a form where you enter the candidate's name, email, phone, city, state, and source. Once saved, the new card appears instantly in the New Lead column.
              </p>
              <p>
                If the email came from an outreach campaign (SmartLead), it is marked as "verified" and locked so nobody accidentally edits it and causes a duplicate send. Manually added emails remain editable.
              </p>
            </div>
          </section>

        </div>
      </DocCard>
    </DocShell>
  );
}
