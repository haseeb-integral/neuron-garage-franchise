import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { AiAssistant, type AssistantContext } from "@/components/AiAssistant";
import {
  Map,
  Users,
  Mail,
  Kanban,
  Sparkles,
  Compass,
  Lightbulb,
  HelpCircle,
  ArrowRight,
  CheckCircle2,
  Cog,
} from "lucide-react";

/**
 * User's Guide — beginner-friendly walkthrough of Neuron Garage Franchise
 * for the founder, senior execs, and recruiting staff. Draws on the
 * Neuron Garage brand: yellow + navy + red, playful but premium.
 */

const NAVY = "#003c7e";
const BLUE = "#0757ff";
const YELLOW = "#FFD400";
const CORAL = "#ff5a3c";
const INK = "#0b1a36";
const SOFT = "#f6f8ff";

const features = [
  {
    id: "city-search",
    number: "1",
    icon: Map,
    title: "City Search",
    tag: "Where should we open next?",
    blurb:
      "Type a city, get a score out of 100. We look at 46 things — kids, schools, incomes, growth, competitors — and rank every U.S. metro so you spend your time on the right places.",
    youCan: [
      "Filter by state, tier (A / B / C), or registration status.",
      "Open any city to see the full breakdown — every number, every source.",
      "Compare up to 3 cities side-by-side before you commit.",
      "Adjust the weighting sliders if you care more about, say, school density than population.",
    ],
    pro: "Click 'Show Formula' on any score. You'll see exactly which inputs drove the number — no black boxes.",
    next: "Found a winner? Hit 'Find Teachers in this City' to jump straight to Teacher Search, pre-filtered.",
  },
  {
    id: "teacher-search",
    number: "2",
    icon: Users,
    title: "Teacher Search",
    tag: "Who in that city should we talk to?",
    blurb:
      "We pull elementary teachers in your chosen city and score each one for fit. Years of experience, leadership roles, side hustles, school quality — all rolled into a single number you can sort by.",
    youCan: [
      "Filter by city, fit score, tag, or enrichment status.",
      "Open a teacher card to see bio, school info, signals, and contact details.",
      "Bulk-tag, bulk-promote, or export a shortlist.",
      "Click 'Promote' on a great fit and they land in the Candidate Pipeline as a New Lead.",
    ],
    pro: "The Outreach Intelligence panel suggests the best time of day and channel to reach each teacher.",
    next: "Promote your favorites — then move them into Email Outreach to start the conversation.",
  },
  {
    id: "email-outreach",
    number: "3",
    icon: Mail,
    title: "Email Outreach",
    tag: "How do we start the conversation?",
    blurb:
      "Two pools, one screen. The Master Teacher DB is every teacher we know about — our owned recruiting asset, growing every time you import a CSV. SmartLead is the subset we've pushed into a live campaign. Flip between them with the Viewing toggle at the top of the page.",
    youCan: [
      "Import any CSV into the Master Pool — Lovable AI figures out the column mapping for you, no manual matching required.",
      "Preview duplicates and verification quality before a single row hits the database.",
      "Push verified leads to a SmartLead campaign with a live filter preview that tells you exactly how many will go.",
      "Triage replies in seven colored buckets (Interested, Meeting, Info, Soft No, Wrong Person, Not Interested, OOO) — green replies promote straight into the Candidate Pipeline.",
    ],
    pro: "Heads up — SmartLead is in mailbox WARM-UP right now. The small numbers you see in the SmartLead/Warm-Up pill are internal staff + warm-up pool sends. We are NOT emailing teachers yet. The third pill, Live Outreach, stays disabled until warm-up completes.",
    next: "Got an interested reply? It promotes into the Candidate Pipeline automatically — just open the new card to start qualifying.",
  },
  {
    id: "candidate-pipeline",
    number: "4",
    icon: Kanban,
    title: "Candidate Pipeline",
    tag: "Who's getting close to signing?",
    blurb:
      "A Kanban board with 7 stages — from New Lead all the way to Signing. Drag a card to move someone forward, open it to see their qualification scorecard, notes, homework, and Selection Committee votes.",
    youCan: [
      "See every candidate, every stage, every owner — at a glance.",
      "Open a card for a six-criteria 1–5 qualification score (capital, motivation, market knowledge, time commitment, leadership, culture fit).",
      "Track 'days in stage' so nothing goes stale.",
      "Cast Selection Committee votes during the Immersion stage.",
    ],
    pro: "A card cannot drop into 'Signing' until it has passed 'Confirmation'. The gate is enforced — by design.",
    next: "Once a card lands in Signing, the deal is closed. Time to celebrate.",
  },
];

const principles = [
  {
    icon: Compass,
    title: "Always one screen ahead",
    body: "The Dashboard answers 'what should I do next?' before you have to ask. Every page has a clear next step.",
  },
  {
    icon: Lightbulb,
    title: "Show the math",
    body: "Any score, any number — click 'Show Formula' and see the inputs, weights, and calculation. No black boxes.",
  },
  {
    icon: Sparkles,
    title: "AI helps, you decide",
    body: "We suggest who to contact, when to send, and what to write — but every decision stays in your hands.",
  },
  {
    icon: CheckCircle2,
    title: "Built for three people",
    body: "Kaylie, Sam, and Haseeb. Clunky-but-clear beats pretty-but-mysterious every time.",
  },
];

const faqs = [
  {
    q: "Where do I start?",
    a: "Open the Dashboard. The orange Next Action card tells you exactly what to do — usually 'Find Teachers in {city}' or 'Reply to {candidate}'.",
  },
  {
    q: "Can I trust the scores?",
    a: "Yes — and you can verify them. Every score has a 'Show Formula' button revealing the raw inputs and weighting. If something looks off, tell Haseeb and we'll tune it.",
  },
  {
    q: "Why do I see two numbers — 'Total Score' and 'Weighted Composite Index'?",
    a: "Same truth, two scales. The Weighted Composite Index (raw) is the math the engine uses to sort cities and assign Tiers A–D. The Total Score is the same number on a school-grade scale so a strong city reads like 91 instead of 63. Order and tiers are identical — only the displayed number shifts up. Both are shown side-by-side in the 'Why this tier?' popover, the city drawer, and the XLSX export.",
  },

  {
    q: "What if I promote the wrong teacher?",
    a: "No harm done. Move the card to the Disqualified column in the Candidate Pipeline. They stay in Teacher Search for future review.",
  },
  {
    q: "Who can see what I do?",
    a: "All three of us — Kaylie, Sam, Haseeb — see the same data. There's no private view. That's intentional.",
  },
  {
    q: "Are we emailing teachers yet?",
    a: "Not yet. SmartLead is in mailbox WARM-UP — we're sending to internal staff and a warm-up pool to season our domains so real teacher emails land in the inbox, not spam. You'll see that called out in amber on the Email Outreach page. Live teacher outreach is days to weeks away.",
  },
  {
    q: "What happens after Signing?",
    a: "Phase 2. The onboarding program is in the codebase but parked while we focus on getting the first signed franchisees through the door.",
  },
];

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2
    className="text-[28px] md:text-[34px] font-black leading-tight tracking-tight"
    style={{ color: INK }}
  >
    {children}
  </h2>
);

const UserGuide = () => {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantContext, setAssistantContext] = useState<AssistantContext>("general");

  const openAssistant = (ctx: AssistantContext) => {
    setAssistantContext(ctx);
    setAssistantOpen(true);
  };

  return (
    <div className="max-w-[1100px]">
      <PageHeader
        title="User's Guide"
        subtitle="A friendly walkthrough of Neuron Garage Franchise for the team — no jargon, no surprises."
      />

      {/* HERO */}
      <section
        className="relative overflow-hidden rounded-[28px] p-8 md:p-12 mb-10"
        style={{
          background: `radial-gradient(120% 140% at 0% 0%, ${YELLOW}33 0%, transparent 55%), radial-gradient(120% 140% at 100% 100%, ${BLUE}1a 0%, transparent 55%), #ffffff`,
          border: "1px solid #eef2f7",
        }}
      >
        <div
          aria-hidden
          className="absolute -top-10 -right-10 h-56 w-56 opacity-[0.08]"
          style={{
            background: `radial-gradient(closest-side, ${NAVY}, transparent)`,
          }}
        />
        <div className="absolute -bottom-12 -left-10 opacity-[0.06]">
          <Cog size={220} color={NAVY} strokeWidth={1.2} />
        </div>

        <div className="relative max-w-[720px]">
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{ background: YELLOW, color: INK }}
          >
            <Sparkles size={13} /> Welcome to the toolkit
          </span>
          <h1
            className="mt-5 text-[42px] md:text-[56px] font-black leading-[1.02] tracking-tight"
            style={{ color: INK }}
          >
            Find the right city. <br />
            Find the right teacher. <br />
            <span style={{ color: BLUE }}>Help them say yes.</span>
          </h1>
          <p
            className="mt-5 text-[16px] md:text-[17px] leading-relaxed max-w-[600px]"
            style={{ color: "#3a4a66" }}
          >
            Neuron Garage Franchise is your end-to-end recruiting console.
            Four screens, one job: find brilliant elementary teachers in the
            right cities and walk them all the way to signing. This guide
            shows you how to use every part of it — in plain English.
          </p>

          <div className="mt-7 flex flex-wrap gap-2.5">
            {features.map((f) => (
              <a
                key={f.id}
                href={`#${f.id}`}
                className="group inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-semibold transition-all hover:-translate-y-0.5"
                style={{ color: NAVY, border: `1.5px solid ${NAVY}22`, boxShadow: "0 6px 16px rgba(7,87,255,0.06)" }}
              >
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-black"
                  style={{ background: YELLOW, color: INK }}
                >
                  {f.number}
                </span>
                {f.title}
                <ArrowRight size={13} className="opacity-0 transition-opacity group-hover:opacity-100" />
              </a>
            ))}
          </div>

          <button
            onClick={() => openAssistant("general")}
            className="group mt-6 inline-flex items-center gap-2.5 rounded-full px-5 py-3 text-[14px] font-bold transition-all hover:-translate-y-0.5"
            style={{
              background: `linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 100%)`,
              color: "white",
              boxShadow: `0 12px 28px ${BLUE}33`,
            }}
          >
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full"
              style={{ background: YELLOW, color: INK }}
            >
              <Sparkles size={13} />
            </span>
            Ask AI Assistant
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </section>

      {/* PRINCIPLES */}
      <section className="mb-14">
        <SectionTitle>How we built it (and why)</SectionTitle>
        <p className="mt-2 text-[15px]" style={{ color: "#5a6a85" }}>
          Four principles that show up on every screen.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {principles.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl p-5 transition-all hover:-translate-y-0.5"
              style={{ background: "white", border: "1px solid #eef2f7", boxShadow: "0 4px 14px rgba(15,23,42,0.04)" }}
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: `${YELLOW}33`, color: NAVY }}
              >
                <p.icon size={20} strokeWidth={2.1} />
              </div>
              <h3 className="mt-3 text-[15px] font-bold" style={{ color: INK }}>
                {p.title}
              </h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed" style={{ color: "#5a6a85" }}>
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* THE FOUR FEATURES */}
      <section className="mb-14">
        <SectionTitle>The four features, in order</SectionTitle>
        <p className="mt-2 text-[15px]" style={{ color: "#5a6a85" }}>
          The sidebar mirrors the funnel. Work top to bottom and you'll never wonder what's next.
        </p>

        <div className="mt-8 space-y-8">
          {features.map((f, idx) => {
            const reverse = idx % 2 === 1;
            return (
              <article
                key={f.id}
                id={f.id}
                className="scroll-mt-8 grid gap-0 overflow-hidden rounded-[24px] md:grid-cols-[1.05fr_0.95fr]"
                style={{ background: "white", border: "1px solid #eef2f7", boxShadow: "0 10px 30px rgba(11,26,54,0.05)" }}
              >
                {/* Text column */}
                <div className={`p-7 md:p-9 ${reverse ? "md:order-2" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-2xl text-[18px] font-black"
                      style={{ background: YELLOW, color: INK }}
                    >
                      {f.number}
                    </span>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: BLUE }}>
                        Feature {f.number}
                      </div>
                      <h3 className="text-[26px] font-black leading-tight" style={{ color: INK }}>
                        {f.title}
                      </h3>
                    </div>
                  </div>

                  <p className="mt-4 text-[15px] italic" style={{ color: CORAL }}>
                    “{f.tag}”
                  </p>
                  <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "#3a4a66" }}>
                    {f.blurb}
                  </p>

                  <h4 className="mt-6 text-[12px] font-bold uppercase tracking-[0.16em]" style={{ color: NAVY }}>
                    What you can do
                  </h4>
                  <ul className="mt-3 space-y-2">
                    {f.youCan.map((line) => (
                      <li key={line} className="flex gap-2.5 text-[14px] leading-relaxed" style={{ color: "#3a4a66" }}>
                        <CheckCircle2 size={17} className="mt-0.5 flex-shrink-0" style={{ color: BLUE }} />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>

                  <div
                    className="mt-6 rounded-xl p-4"
                    style={{ background: `${YELLOW}22`, border: `1px dashed ${YELLOW}` }}
                  >
                    <div className="flex items-start gap-2.5">
                      <Lightbulb size={18} className="mt-0.5 flex-shrink-0" style={{ color: "#b88a00" }} />
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "#7a5c00" }}>
                          Pro tip
                        </div>
                        <p className="mt-0.5 text-[13.5px] leading-relaxed" style={{ color: "#3a4a66" }}>
                          {f.pro}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="mt-5 flex items-center gap-2 text-[13.5px] font-semibold" style={{ color: NAVY }}>
                    <ArrowRight size={15} /> {f.next}
                  </p>

                  <button
                    onClick={() => openAssistant(f.id as AssistantContext)}
                    className="group mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-bold transition-all hover:-translate-y-0.5"
                    style={{
                      background: "white",
                      color: NAVY,
                      border: `1.5px solid ${BLUE}33`,
                      boxShadow: `0 6px 18px ${BLUE}14`,
                    }}
                  >
                    <Sparkles size={13} style={{ color: BLUE }} />
                    Ask AI about {f.title}
                    <ArrowRight size={12} className="opacity-60 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>

                {/* Visual column */}
                <div
                  className={`relative flex items-center justify-center overflow-hidden p-8 ${reverse ? "md:order-1" : ""}`}
                  style={{
                    background: reverse
                      ? `linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 100%)`
                      : `linear-gradient(135deg, ${YELLOW} 0%, #ffe97a 100%)`,
                  }}
                >
                  <Cog
                    size={260}
                    strokeWidth={1.1}
                    className="absolute -right-12 -bottom-12 opacity-[0.18]"
                    color={reverse ? YELLOW : NAVY}
                  />
                  <Cog
                    size={120}
                    strokeWidth={1.1}
                    className="absolute -left-6 -top-6 opacity-[0.14]"
                    color={reverse ? YELLOW : NAVY}
                  />
                  <div
                    className="relative flex h-32 w-32 items-center justify-center rounded-[28px]"
                    style={{
                      background: reverse ? "rgba(255,255,255,0.12)" : "rgba(0,60,126,0.08)",
                      border: reverse ? "1px solid rgba(255,255,255,0.25)" : `1px solid ${NAVY}22`,
                      backdropFilter: "blur(6px)",
                    }}
                  >
                    <f.icon size={56} strokeWidth={1.6} color={reverse ? "white" : NAVY} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ANATOMY OF A CANDIDATE CARD */}
      <section className="mb-14">
        <SectionTitle>Anatomy of a candidate card</SectionTitle>
        <p className="mt-2 text-[15px]" style={{ color: "#5a6a85" }}>
          Each Kanban card on the Candidate Pipeline packs four independent
          signals. Here's what every element means — so the numbers, colors,
          and letters never feel like a mystery.
        </p>

        <div
          className="mt-6 rounded-2xl bg-white p-6 md:p-8"
          style={{ border: "1px solid #eef2f7" }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                swatch: (
                  <span
                    className="inline-block w-1.5 h-8 rounded-sm"
                    style={{ backgroundColor: "#dc3545" }}
                  />
                ),
                title: "Left stripe — Days in stage",
                body: "Green ≤3 days (fresh), amber 4–7 (watch), red 8+ (stalled). Tells you at a glance which cards are going cold.",
              },
              {
                swatch: (
                  <span
                    className="inline-flex w-9 h-9 rounded-full items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: BLUE }}
                  >
                    AV
                  </span>
                ),
                title: "Initials circle — Candidate avatar",
                body: "The candidate's initials. Pure identity — no score, no signal.",
              },


              {
                swatch: (
                  <span
                    className="inline-flex px-2 h-6 rounded-full items-center text-xs font-bold text-white"
                    style={{ backgroundColor: "#198754" }}
                  >
                    Qual 100
                  </span>
                ),
                title: '"Qual" pill — Qualification composite',
                body: "Composite of the 5 star-pillar ratings you set in the detail panel: Teaching, Leadership, Financial, Market Fit, Culture Fit. Hidden until at least one pillar is rated.",
              },
              {
                swatch: (
                  <span
                    className="inline-flex px-2.5 h-6 rounded-md items-center text-xs font-medium"
                    style={{ backgroundColor: "#e7f1ff", color: BLUE }}
                  >
                    High Potential
                  </span>
                ),
                title: "Blue tag — Qualitative label",
                body: 'Short status label like "Interested", "High Potential", or "Follow-Up". Set from the detail panel.',
              },
              {
                swatch: (
                  <span className="text-xs font-medium" style={{ color: "#6c757d" }}>
                    Day 8
                  </span>
                ),
                title: '"Day N" — Time in current stage',
                body: "How many days the candidate has been sitting in this pipeline stage. Resets when they're moved to a new stage.",
              },
              {
                swatch: (
                  <span
                    className="inline-flex w-7 h-7 rounded-full items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: "#198754" }}
                  >
                    h
                  </span>
                ),
                title: "Small letter circle — Owner",
                body: "First initial of the teammate assigned to the candidate. Color is deterministic from their name. Hover for the full name.",
              },
            ].map((row) => (
              <div
                key={row.title}
                className="flex gap-4 items-start rounded-xl p-3"
                style={{ background: SOFT }}
              >
                <div className="flex-shrink-0 w-16 flex items-center justify-center">
                  {row.swatch}
                </div>
                <div className="flex-1">
                  <div className="text-[14px] font-bold" style={{ color: INK }}>
                    {row.title}
                  </div>
                  <div
                    className="mt-1 text-[13px] leading-snug"
                    style={{ color: "#5a6a85" }}
                  >
                    {row.body}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div
            className="mt-5 rounded-xl px-4 py-3 text-[13px]"
            style={{ background: `${YELLOW}22`, color: INK }}
          >
            <strong>Tip:</strong> the same legend is available right on the
            Candidate Pipeline — click the <em>Card legend</em> button in the
            toolbar above the board.
          </div>
        </div>
      </section>

      {/* JOURNEY STRIP */}
      <section

        className="mb-14 rounded-[24px] p-7 md:p-9"
        style={{ background: SOFT, border: "1px solid #eaeefb" }}
      >
        <SectionTitle>The journey, end to end</SectionTitle>
        <p className="mt-2 text-[15px]" style={{ color: "#5a6a85" }}>
          From "we don't know that city" to "welcome to the family" — usually in a few weeks.
        </p>

        <ol className="mt-6 grid gap-3 md:grid-cols-4">
          {[
            { n: "1", t: "Score a city", d: "Pick the right metro." },
            { n: "2", t: "Find a teacher", d: "Rank by fit score." },
            { n: "3", t: "Start a conversation", d: "Send a personal email." },
            { n: "4", t: "Walk them to signing", d: "Move through the pipeline." },
          ].map((s) => (
            <li
              key={s.n}
              className="rounded-2xl bg-white p-5"
              style={{ border: "1px solid #eef2f7" }}
            >
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-[14px] font-black"
                style={{ background: NAVY, color: YELLOW }}
              >
                {s.n}
              </div>
              <div className="mt-3 text-[15px] font-bold" style={{ color: INK }}>
                {s.t}
              </div>
              <div className="mt-1 text-[13px]" style={{ color: "#5a6a85" }}>
                {s.d}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* FAQ */}
      <section className="mb-14">
        <SectionTitle>Quick answers</SectionTitle>
        <p className="mt-2 text-[15px]" style={{ color: "#5a6a85" }}>
          The things people ask in the first week.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {faqs.map((f) => (
            <div
              key={f.q}
              className="rounded-2xl p-5"
              style={{ background: "white", border: "1px solid #eef2f7" }}
            >
              <div className="flex items-start gap-3">
                <span
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                  style={{ background: `${BLUE}12`, color: BLUE }}
                >
                  <HelpCircle size={17} />
                </span>
                <div>
                  <h4 className="text-[14.5px] font-bold" style={{ color: INK }}>
                    {f.q}
                  </h4>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed" style={{ color: "#5a6a85" }}>
                    {f.a}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CLOSING */}
      <section
        className="mb-6 overflow-hidden rounded-[24px] p-8 md:p-10 text-center"
        style={{
          background: `linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 100%)`,
          color: "white",
        }}
      >
        <Sparkles size={26} className="mx-auto" style={{ color: YELLOW }} />
        <h3 className="mt-3 text-[26px] md:text-[30px] font-black tracking-tight">
          Stuck? Just ask.
        </h3>
        <p className="mx-auto mt-2 max-w-[520px] text-[15px] leading-relaxed" style={{ color: "#cfd9ef" }}>
          This tool is built for the three of us — Kaylie, Sam and Team. If
          something feels clunky, slow, or wrong, tell Brett or Haseeb. We fix
          it forward, one change at a time.
        </p>
        <button
          onClick={() => openAssistant("general")}
          className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13.5px] font-bold transition-all hover:-translate-y-0.5"
          style={{ background: YELLOW, color: INK, boxShadow: "0 8px 22px rgba(0,0,0,0.18)" }}
        >
          <Sparkles size={14} /> Ask the AI Assistant
        </button>
      </section>

      {/* Floating AI Assistant launcher */}
      <button
        onClick={() => openAssistant("general")}
        className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 rounded-full px-5 py-3 text-[13.5px] font-bold transition-all hover:-translate-y-0.5"
        style={{
          background: `linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 100%)`,
          color: "white",
          boxShadow: `0 14px 32px ${NAVY}55`,
        }}
        aria-label="Open AI Assistant"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: YELLOW, color: INK }}>
          <Sparkles size={13} />
        </span>
        Ask AI
      </button>

      <AiAssistant open={assistantOpen} onOpenChange={setAssistantOpen} context={assistantContext} />
    </div>
  );
};

export default UserGuide;
