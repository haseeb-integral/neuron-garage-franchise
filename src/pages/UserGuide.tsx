import { PageHeader } from "@/components/PageHeader";
import { Map, Users, Kanban, ClipboardCheck, Lightbulb, Target, Sparkles, ArrowRight, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

const Section = ({ id, children }: { id: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-8 mb-10">
    {children}
  </section>
);

const FeatureCard = ({
  icon: Icon,
  step,
  title,
  purpose,
  benefits,
  how,
  link,
  linkLabel,
}: {
  icon: LucideIcon;
  step: string;
  title: string;
  purpose: string;
  benefits: string[];
  how: { label: string; text: string }[];
  link: string;
  linkLabel: string;
}) => (
  <div className="bg-white rounded-lg p-6 md:p-7 mb-6" style={{ border: "1px solid #dee2e6" }}>
    <div className="flex items-start gap-4 mb-4">
      <div className="p-3 rounded-lg shrink-0" style={{ backgroundColor: "#fff4ec" }}>
        <Icon size={26} color="#fd7e14" />
      </div>
      <div className="min-w-0">
        <span
          className="inline-block text-xs font-bold uppercase tracking-wider mb-1 px-2 py-0.5 rounded-full"
          style={{ backgroundColor: "#003c7e15", color: "#003c7e" }}
        >
          {step}
        </span>
        <h2 className="text-xl md:text-2xl font-bold" style={{ color: "#003c7e" }}>{title}</h2>
      </div>
    </div>

    <div className="space-y-4 text-sm leading-relaxed" style={{ color: "#343a40" }}>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Target size={14} color="#fd7e14" />
          <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "#1a1a2e" }}>
            What it's for
          </h3>
        </div>
        <p>{purpose}</p>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={14} color="#fd7e14" />
          <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "#1a1a2e" }}>
            Why it matters
          </h3>
        </div>
        <ul className="list-disc pl-5 space-y-1">
          {benefits.map((b) => <li key={b}>{b}</li>)}
        </ul>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <Lightbulb size={14} color="#fd7e14" />
          <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "#1a1a2e" }}>
            How to use it
          </h3>
        </div>
        <ol className="list-decimal pl-5 space-y-1.5">
          {how.map((h) => (
            <li key={h.label}>
              <strong>{h.label}.</strong> {h.text}
            </li>
          ))}
        </ol>
      </div>

      <Link
        to={link}
        className="inline-flex items-center gap-2 text-white font-semibold px-4 py-2 rounded-md mt-2 hover:opacity-90 transition-opacity"
        style={{ backgroundColor: "#fd7e14" }}
      >
        {linkLabel} <ArrowRight size={16} />
      </Link>
    </div>
  </div>
);

const UserGuide = () => {
  const toc = [
    { id: "welcome", label: "Welcome" },
    { id: "dashboard", label: "Your Dashboard" },
    { id: "city-scoring", label: "1. City Scoring" },
    { id: "teacher-prospects", label: "2. Teacher Prospects" },
    { id: "candidate-pipeline", label: "3. Candidate Pipeline" },
    { id: "onboarding", label: "4. Onboarding" },
    { id: "tips", label: "Tips & Best Practices" },
    { id: "faq", label: "FAQ" },
  ];

  return (
    <div>
      <PageHeader
        title="User's Guide"
        subtitle="A friendly walkthrough of the Neuron Garage Franchise Acquisition System for the team."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
        {/* Sidebar TOC */}
        <aside className="lg:sticky lg:top-4 self-start">
          <div className="bg-white rounded-lg p-4" style={{ border: "1px solid #dee2e6" }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#6c757d" }}>
              On this page
            </p>
            <nav className="flex flex-col gap-1.5">
              {toc.map((t) => (
                <a key={t.id} href={`#${t.id}`} className="text-sm hover:underline" style={{ color: "#003c7e" }}>
                  {t.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <article className="max-w-3xl">
          <Section id="welcome">
            <div className="bg-white rounded-lg p-6 md:p-7 mb-6" style={{ border: "1px solid #dee2e6", borderLeft: "3px solid #fd7e14" }}>
              <h2 className="text-2xl font-bold mb-2" style={{ color: "#003c7e" }}>Welcome to the Franchise Acquisition System</h2>
              <p className="text-sm leading-relaxed" style={{ color: "#343a40" }}>
                This platform is your day-to-day workspace for finding the right cities, the right people,
                and turning them into happy, successful Neuron Garage franchisees. It replaces scattered
                spreadsheets and email threads with a single, guided workflow that takes you from a blank
                map of the U.S. all the way to a franchisee opening their doors.
              </p>
              <p className="text-sm leading-relaxed mt-3" style={{ color: "#343a40" }}>
                You don't need to be technical to use it. If you can read a map and have a phone
                conversation with a teacher, you can run this system end to end.
              </p>
            </div>
          </Section>

          <Section id="dashboard">
            <div className="bg-white rounded-lg p-6 md:p-7 mb-6" style={{ border: "1px solid #dee2e6" }}>
              <h2 className="text-2xl font-bold mb-3" style={{ color: "#003c7e" }}>Your Dashboard — the home base</h2>
              <p className="text-sm leading-relaxed mb-4" style={{ color: "#343a40" }}>
                The Dashboard is the first thing you see when you log in. It answers one question:
                <strong> "What should I do next?"</strong>
              </p>
              <h3 className="text-base font-semibold mb-2" style={{ color: "#1a1a2e" }}>What's on it</h3>
              <ul className="list-disc pl-5 space-y-1.5 text-sm" style={{ color: "#343a40" }}>
                <li><strong>Next Action card</strong> (orange banner) — a personalized recommendation, like "Find Teachers in Frisco, TX." Click the button and the system jumps you straight to the right place.</li>
                <li><strong>Four stat cards</strong> — at-a-glance counts of cities scored, prospects found, candidates in your pipeline, and active onboardings.</li>
                <li><strong>Pipeline Snapshot</strong> — a quick bar chart that shows how many candidates are sitting in each stage, so you can spot bottlenecks.</li>
                <li><strong>Recent Activity</strong> — the latest events across the system so you never feel out of the loop after a day off.</li>
              </ul>
              <p className="text-sm leading-relaxed mt-4" style={{ color: "#343a40" }}>
                Think of the Dashboard as your morning coffee read. From there, you'll move into one of
                the four main features below, in roughly this order: <strong>City Scoring → Teacher
                Prospects → Candidate Pipeline → Onboarding</strong>.
              </p>
            </div>
          </Section>

          <Section id="city-scoring">
            <FeatureCard
              icon={Map}
              step="Step 1 of 4"
              title="City Scoring"
              purpose="Decide which U.S. cities are the strongest markets for a new Neuron Garage franchise — before you spend any time prospecting in them."
              benefits={[
                "Stops you from chasing prospects in cities that can't support a franchise.",
                "Gives every recommendation an objective, defensible score you can share with leadership.",
                "Lets you tune the formula to match Neuron Garage's current strategy (e.g. weight income higher this quarter).",
                "Surfaces non-registration states so legal-friendly markets bubble to the top.",
              ]}
              how={[
                { label: "Browse the city table", text: "Sort by Composite Score, Population, or any column. A green check means the state doesn't require franchise registration; a lock means it does." },
                { label: "Adjust Scoring Weights", text: "Open the Weights panel to dial up the factors that matter most right now (population, % children 5–12, median income, school density, competitor count, growth)." },
                { label: "Open a city's detail drawer", text: "Click any row to see full demographics, top elementary schools, local competitors, and your team's notes." },
                { label: "Compare cities side-by-side", text: "Turn on Compare mode, pick up to 3 cities, and open the comparison modal to make a confident pick." },
                { label: "Hand off to prospecting", text: "From a city's detail drawer, click \"Find Teachers in this City\" — you'll land on Teacher Prospects already filtered to that city." },
              ]}
              link="/city-scoring"
              linkLabel="Open City Scoring"
            />
          </Section>

          <Section id="teacher-prospects">
            <FeatureCard
              icon={Users}
              step="Step 2 of 4"
              title="Teacher Prospects"
              purpose="Find specific elementary-school teachers in your top cities who fit the profile of a great franchisee, and start a smart outreach conversation."
              benefits={[
                "Replaces hours of LinkedIn digging with a ranked, filterable list.",
                "Every prospect gets a Fit Score so you can call the best leads first.",
                "Built-in outreach intelligence tells you the best time to reach out and drafts the message for you.",
                "Tags and enrichment status keep the team aligned on who's been worked and who hasn't.",
              ]}
              how={[
                { label: "Filter to your target city", text: "Use the filter bar at the top to narrow by city, fit-score range, tag, or enrichment status." },
                { label: "Run \"Find Prospects\"", text: "Click Find Prospects to simulate an AI search by city + grade band + keywords. New teachers show up in the table." },
                { label: "Click a teacher to learn more", text: "The detail panel shows their school, experience, leadership signals, and a full activity log of any outreach you've done." },
                { label: "Use Outreach Intelligence", text: "Select one or more prospects and the panel suggests the best send-time, channel, and a ready-to-edit message template." },
                { label: "Promote to the pipeline", text: "When you've had a real conversation and they're interested, click Promote. They become a candidate at the New Lead stage." },
              ]}
              link="/teacher-prospects"
              linkLabel="Open Teacher Prospects"
            />
          </Section>

          <Section id="candidate-pipeline">
            <FeatureCard
              icon={Kanban}
              step="Step 3 of 4"
              title="Candidate Pipeline"
              purpose="Move every interested teacher through a structured 7-stage qualification process so nothing falls through the cracks."
              benefits={[
                "Everyone on the team can see every candidate's stage at a glance.",
                "Built-in qualification scoring removes guesswork and gut-call decisions.",
                "Selection Committee voting is captured in the system, not in side channels.",
                "Time-in-stage data shows you who's stalling and needs a nudge.",
              ]}
              how={[
                { label: "Read the board left to right", text: "Cards move through New Lead → Initial Qualification → Business Overview → FDD Review → Immersion → Confirmation → Signing. There's also a Disqualified column for clean closeout." },
                { label: "Open a candidate card", text: "Click any card to open the detail sheet with four tabs: Overview, Qualification, Notes & Activity, and Homework." },
                { label: "Score them", text: "Under Qualification, give 1–5 stars on capital, motivation, market knowledge, time commitment, leadership, and culture fit. The total updates automatically." },
                { label: "Run the Selection Committee", text: "When a candidate is in Immersion, the three committee members each cast an Approve or Decline vote right inside the panel." },
                { label: "Hand off to Onboarding", text: "Cards in the Signing column show an orange \"Start Onboarding →\" button. Click it, confirm, and the candidate appears at the top of the Onboarding list." },
              ]}
              link="/candidate-pipeline"
              linkLabel="Open Candidate Pipeline"
            />
          </Section>

          <Section id="onboarding">
            <FeatureCard
              icon={ClipboardCheck}
              step="Step 4 of 4"
              title="Onboarding"
              purpose="Run every signed franchisee through the same standardized 7-step launch program so their first 90 days are smooth, repeatable, and on-brand."
              benefits={[
                "Every new franchisee gets the exact same world-class welcome — no one is forgotten.",
                "Status badges (On Track / At Risk / Overdue) flag who needs your attention this week.",
                "The mandatory 14-day FDD waiting period is tracked automatically with a visible countdown.",
                "Pre-canned communications fire as steps complete, so you stop drafting the same email twice.",
              ]}
              how={[
                { label: "Open the Onboarding table", text: "See every active franchisee with their current step, % progress, days elapsed, and overall status." },
                { label: "Open a franchisee's wizard", text: "Click any row to open the step-by-step wizard. The progress bar at the top shows where they are in the 7-step flow." },
                { label: "Work the current step", text: "Each step has its own form: a task checklist, a document upload box, the FDD countdown, etc. Fill it in as you go." },
                { label: "Mark a step complete", text: "When you click Complete Step, the system advances the franchisee, logs the activity, and auto-sends the matching email (welcome, roadmap, market plan, FDD, awarded, donut)." },
                { label: "Watch the activity log", text: "Every step completion, document upload, and email send is captured in the activity log so the whole team has a paper trail." },
              ]}
              link="/onboarding"
              linkLabel="Open Onboarding"
            />
          </Section>

          <Section id="tips">
            <div className="bg-white rounded-lg p-6 md:p-7 mb-6" style={{ border: "1px solid #dee2e6" }}>
              <h2 className="text-2xl font-bold mb-3" style={{ color: "#003c7e" }}>Tips & Best Practices</h2>
              <ul className="list-disc pl-5 space-y-2 text-sm" style={{ color: "#343a40" }}>
                <li><strong>Start your day on the Dashboard.</strong> The Next Action card almost always points at the highest-leverage thing you can do.</li>
                <li><strong>Trust the Fit Score, but verify with a call.</strong> Scores are a great filter, not a replacement for human judgement.</li>
                <li><strong>Keep notes in the system, not in your inbox.</strong> Anything you put in the Notes & Activity tab becomes searchable history for the whole team.</li>
                <li><strong>Don't skip stages in the pipeline.</strong> The 7 stages exist to protect both Neuron Garage and the franchisee — moving too fast is the #1 cause of failed launches.</li>
                <li><strong>Use the orange Help (?) icon</strong> in the top-right corner anytime you want to replay the guided tour.</li>
              </ul>
            </div>
          </Section>

          <Section id="faq">
            <div className="bg-white rounded-lg p-6 md:p-7 mb-6" style={{ border: "1px solid #dee2e6" }}>
              <h2 className="text-2xl font-bold mb-4" style={{ color: "#003c7e" }}>Frequently Asked Questions</h2>

              <div className="space-y-4 text-sm" style={{ color: "#343a40" }}>
                <div>
                  <p className="font-semibold mb-1" style={{ color: "#1a1a2e" }}>Do I have to do the steps in order?</p>
                  <p>No. The funnel (Cities → Teachers → Pipeline → Onboarding) is the typical flow, but you can jump into any feature from the sidebar at any time.</p>
                </div>
                <div>
                  <p className="font-semibold mb-1" style={{ color: "#1a1a2e" }}>What if a city I want isn't in the list?</p>
                  <p>The team can request new cities be added to the scoring data set. Reach out to your manager — eventually this will be a self-serve "Add City" button.</p>
                </div>
                <div>
                  <p className="font-semibold mb-1" style={{ color: "#1a1a2e" }}>Where do the Fit Scores come from?</p>
                  <p>They're calculated from public signals about each teacher (years of experience, grade level, leadership roles, side-business indicators) compared against the profile of past successful franchisees.</p>
                </div>
                <div>
                  <p className="font-semibold mb-1" style={{ color: "#1a1a2e" }}>Is my work auto-saved?</p>
                  <p>In this prototype, changes live for the session but reset on a hard refresh. The production version will save everything to the cloud automatically.</p>
                </div>
                <div>
                  <p className="font-semibold mb-1" style={{ color: "#1a1a2e" }}>Who do I ask if I'm stuck?</p>
                  <p>Hit the <strong>?</strong> icon top-right to replay the tour, or reach out to your franchise development manager.</p>
                </div>
              </div>
            </div>
          </Section>

          <p className="text-xs mt-8" style={{ color: "#6c757d" }}>
            User's Guide v1.0 · For Neuron Garage internal use.
          </p>
        </article>
      </div>
    </div>
  );
};

export default UserGuide;
