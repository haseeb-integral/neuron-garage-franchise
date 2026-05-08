import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { SPEC_MARKDOWN } from "@/data/specMarkdown";

const handleDownloadSpec = () => {
  const blob = new Blob([SPEC_MARKDOWN], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "neuron-garage-franchise-spec.md";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-8 mb-10">
    <h2 className="text-2xl font-bold mb-3" style={{ color: "#003c7e" }}>{title}</h2>
    <div className="space-y-3 text-sm leading-relaxed" style={{ color: "#343a40" }}>
      {children}
    </div>
  </section>
);

const SubHeading = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-base font-semibold mt-5 mb-2" style={{ color: "#1a1a2e" }}>{children}</h3>
);

const Pill = ({ children, color = "#003c7e" }: { children: React.ReactNode; color?: string }) => (
  <span
    className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mr-1.5"
    style={{ backgroundColor: `${color}15`, color }}
  >
    {children}
  </span>
);

const Spec = () => {
  const toc = [
    { id: "overview", label: "1. Overview" },
    { id: "users", label: "2. Users & Roles" },
    { id: "journey", label: "3. End-to-End Journey" },
    { id: "navigation", label: "4. Navigation & Layout" },
    { id: "dashboard", label: "5. Dashboard" },
    { id: "city-scoring", label: "6. City Scoring" },
    { id: "teacher-prospects", label: "7. Teacher Prospects" },
    { id: "candidate-pipeline", label: "8. Candidate Pipeline" },
    { id: "onboarding", label: "9. Onboarding" },
    { id: "tour", label: "10. Guided Tour" },
    { id: "design", label: "11. Design System" },
    { id: "data", label: "12. Data Model" },
    { id: "tech", label: "13. Tech Stack" },
    { id: "future", label: "14. Future Work" },
  ];

  return (
    <div>
      <PageHeader
        title="Product Specification"
        subtitle="Detailed specification of the Neuron Garage Franchise Acquisition System prototype."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
        {/* Sidebar TOC */}
        <aside className="lg:sticky lg:top-4 self-start">
          <div className="bg-white rounded-lg p-4" style={{ border: "1px solid #dee2e6" }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#6c757d" }}>
              Contents
            </p>
            <nav className="flex flex-col gap-1.5">
              {toc.map((t) => (
                <a
                  key={t.id}
                  href={`#${t.id}`}
                  className="text-sm hover:underline"
                  style={{ color: "#003c7e" }}
                >
                  {t.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Body */}
        <article className="bg-white rounded-lg p-6 md:p-8 max-w-3xl" style={{ border: "1px solid #dee2e6" }}>
          <Section id="overview" title="1. Overview">
            <p>
              <strong>Neuron Garage Franchise Acquisition System</strong> is an internal tool that helps the
              Neuron Garage franchise development team identify the best U.S. markets for new franchises,
              source elementary-school teachers as candidate franchisees, qualify those candidates through a
              structured 7-step pipeline, and onboard signed franchisees through a standardized 7-step
              launch program.
            </p>
            <p>
              The product is a single-page React web application optimized for desktop, tablet, and mobile.
              The current build is a high-fidelity, fully clickable prototype using mock data — no backend
              writes are persisted across sessions.
            </p>
            <SubHeading>Goals</SubHeading>
            <ul className="list-disc pl-5 space-y-1">
              <li>Replace ad-hoc spreadsheets and email threads with a single source of truth.</li>
              <li>Use scoring + AI assists to focus the team on the highest-value cities and prospects.</li>
              <li>Make every stage of the pipeline observable, accountable, and time-bound.</li>
              <li>Give new franchise development reps a guided "what do I do next?" experience.</li>
            </ul>
            <SubHeading>Non-Goals (this prototype)</SubHeading>
            <ul className="list-disc pl-5 space-y-1">
              <li>No real authentication, persistence, or multi-user collaboration.</li>
              <li>No live data feeds (Census, Yelp, LinkedIn, ZoomInfo, etc.) — all data is mocked.</li>
              <li>No payment processing or contract execution; e-sign is represented as a status only.</li>
            </ul>
          </Section>

          <Section id="users" title="2. Users & Roles">
            <p>
              The prototype assumes a single role: <strong>Franchise Development Rep</strong> (e.g. "Sam"
              shown on the dashboard). Future roles to consider:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>FD Manager</strong> — sees all reps' pipelines, assigns leads, approves Selection Committee votes.</li>
              <li><strong>Selection Committee Member</strong> — votes on candidates in the Immersion stage.</li>
              <li><strong>Onboarding Specialist</strong> — owns the 7-step franchisee onboarding program.</li>
              <li><strong>Franchisee</strong> (external) — read-only view of their own onboarding progress.</li>
            </ul>
          </Section>

          <Section id="journey" title="3. End-to-End Journey">
            <p>The product follows a left-to-right funnel reflected in the sidebar order:</p>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>
                <Pill>Step 1</Pill>
                <strong>Score a city</strong> — pick a U.S. metro with the right demographics, school density,
                and competitive landscape.
              </li>
              <li>
                <Pill>Step 2</Pill>
                <strong>Find prospects</strong> — surface elementary teachers in that city, ranked by Fit Score.
              </li>
              <li>
                <Pill>Step 3</Pill>
                <strong>Qualify candidates</strong> — move a prospect through the 7-stage Kanban pipeline.
              </li>
              <li>
                <Pill>Step 4</Pill>
                <strong>Onboard the franchisee</strong> — execute the standardized 7-step launch program.
              </li>
            </ol>
          </Section>

          <Section id="navigation" title="4. Navigation & Layout">
            <SubHeading>App Shell</SubHeading>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Persistent left sidebar</strong> on desktop (≥768 px), drawer on mobile. Brand color <code>#003c7e</code>.</li>
              <li><strong>Help icon (?)</strong> top-right — restarts the guided tour.</li>
              <li><strong>Mobile top bar</strong> with hamburger, brand mark, and help icon. Touch targets ≥44 px.</li>
            </ul>
            <SubHeading>Routes</SubHeading>
            <ul className="list-disc pl-5 space-y-1">
              <li><code>/</code> — Dashboard</li>
              <li><code>/city-scoring</code> — City Scoring</li>
              <li><code>/teacher-prospects</code> — Teacher Prospects</li>
              <li><code>/candidate-pipeline</code> — Candidate Pipeline</li>
              <li><code>/onboarding</code> — Onboarding</li>
              <li><code>/spec</code> — This document</li>
            </ul>
          </Section>

          <Section id="dashboard" title="5. Dashboard">
            <SubHeading>Purpose</SubHeading>
            <p>Give the rep a one-screen answer to "what should I do next?"</p>
            <SubHeading>Components</SubHeading>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Next Action card</strong> — orange-accented banner with a personalized recommendation
                and a CTA (e.g. "Find Teachers in Frisco, TX") that deep-links to the right city.
              </li>
              <li>
                <strong>Stat cards (4)</strong> — Total Cities Scored, Total Prospects Found, Candidates in
                Pipeline, Active Onboardings. Display 0 in the prototype.
              </li>
              <li><strong>Pipeline Snapshot</strong> — horizontal bar chart of candidate count by stage.</li>
              <li><strong>Recent Activity</strong> — last 6 system events with relative timestamps.</li>
            </ul>
          </Section>

          <Section id="city-scoring" title="6. City Scoring">
            <SubHeading>Purpose</SubHeading>
            <p>Rank U.S. cities by their suitability for a new Neuron Garage franchise.</p>
            <SubHeading>Inputs / Filters</SubHeading>
            <ul className="list-disc pl-5 space-y-1">
              <li>State, tier (A/B/C), registration status, free-text search.</li>
              <li>Adjustable <strong>Scoring Weights</strong> for: population, % children 5–12, median income, school density, competitor count, growth rate.</li>
            </ul>
            <SubHeading>Outputs</SubHeading>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Stat cards</strong> showing total cities, A-tier count, average score, and registered
                states.
              </li>
              <li>
                <strong>City table</strong> — sortable by every numeric column; row click opens a detail
                drawer with full demographics, competitor list, schools, and notes.
              </li>
              <li>
                <strong>Compare mode</strong> — select up to 3 cities and open a side-by-side modal.
              </li>
            </ul>
            <SubHeading>Key actions</SubHeading>
            <ul className="list-disc pl-5 space-y-1">
              <li>From the detail drawer: <em>"Find Teachers in this City"</em> button → navigates to
                Teacher Prospects pre-filtered to that city.</li>
            </ul>
          </Section>

          <Section id="teacher-prospects" title="7. Teacher Prospects">
            <SubHeading>Purpose</SubHeading>
            <p>Discover and shortlist elementary-school teachers who could become franchisees.</p>
            <SubHeading>Components</SubHeading>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Filter bar</strong> — city, fit-score range, tag, enrichment status, search.</li>
              <li>
                <strong>Find Prospects modal</strong> — simulated AI search by city + grade band + keywords;
                returns a ranked list of new teachers.
              </li>
              <li>
                <strong>Outreach Intelligence panel</strong> — shows best send-time, recommended channel,
                and a draft message template per selection.
              </li>
              <li>
                <strong>Prospect table</strong> — name, school, city, masked email, LinkedIn, Fit Score,
                tag, enrichment status, Promote action.
              </li>
              <li>
                <strong>Bulk action bar</strong> — appears when one or more rows are selected: bulk-promote,
                bulk-tag, export.
              </li>
              <li>
                <strong>Detail panel</strong> — full profile with bio, contact, school info, signals
                (years of experience, leadership roles, side hustles), activity log.
              </li>
            </ul>
            <SubHeading>Promote flow</SubHeading>
            <p>
              Clicking <em>Promote</em> on a teacher creates a corresponding entry in the Candidate Pipeline at the
              <strong> New Lead</strong> stage.
            </p>
          </Section>

          <Section id="candidate-pipeline" title="8. Candidate Pipeline">
            <SubHeading>Purpose</SubHeading>
            <p>Move candidates through a structured 7-stage qualification flow.</p>
            <SubHeading>Stages</SubHeading>
            <ol className="list-decimal pl-5 space-y-1">
              <li>New Lead</li>
              <li>Initial Qualification</li>
              <li>Business Overview</li>
              <li>FDD Review</li>
              <li>Immersion (Selection Committee votes)</li>
              <li>Confirmation</li>
              <li>Signing</li>
              <li><em>Plus a parallel</em> Disqualified <em>column</em></li>
            </ol>
            <SubHeading>Board behavior</SubHeading>
            <ul className="list-disc pl-5 space-y-1">
              <li>Kanban with horizontal scroll on small screens; "Jump to" pill nav above the board.</li>
              <li>Pipeline Analytics bar above the board (count per stage, conversion rates).</li>
              <li>Each card shows name, fit score, days in stage, last activity, owner.</li>
            </ul>
            <SubHeading>Detail panel (sheet)</SubHeading>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Overview</strong> — contact, source, fit score, deal owner.</li>
              <li><strong>Qualification</strong> — six 1–5 star ratings (capital, motivation, market knowledge, time commitment, leadership, culture fit) with auto-calc total.</li>
              <li><strong>Notes & Activity</strong> — chronological log; add a note inline.</li>
              <li><strong>Homework</strong> — trial-close checklist (territory selected, financing in place, family aligned, etc.).</li>
              <li><strong>Selection Committee</strong> (Immersion only) — three named members, each casts an Approve / Decline vote.</li>
            </ul>
            <SubHeading>Signing → Onboarding handoff</SubHeading>
            <p>
              Cards in the <strong>Signing</strong> column display a <Pill color="#fd7e14">Start Onboarding →</Pill>
              button. Clicking opens a confirmation modal; on confirm, a new Onboarding record is created at
              Step 1/7, status <strong>On Track</strong>, days elapsed = 0, the user is navigated to
              <code>/onboarding</code>, and a success toast confirms the action.
            </p>
          </Section>

          <Section id="onboarding" title="9. Onboarding">
            <SubHeading>Purpose</SubHeading>
            <p>Run a signed franchisee through the standardized 7-step launch program.</p>
            <SubHeading>The 7 steps</SubHeading>
            <ol className="list-decimal pl-5 space-y-1">
              <li><strong>Welcome & Kickoff</strong> — welcome email, intro call, account setup.</li>
              <li><strong>Roadmap Review</strong> — walk through the 90-day launch roadmap.</li>
              <li><strong>Market Plan</strong> — finalize territory, schools targeted, year-1 revenue model.</li>
              <li><strong>FDD Countdown</strong> — 14-day mandatory FDD waiting period (visualized via countdown).</li>
              <li><strong>Document Upload</strong> — signed FDD, COI, LLC docs, void check.</li>
              <li><strong>Awarded</strong> — final signature; ceremonial "Welcome to Neuron Garage" moment.</li>
              <li><strong>Active Franchisee Onboarding</strong> — handoff to the operations team; "Send the donut" trigger.</li>
            </ol>
            <SubHeading>Components</SubHeading>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Onboarding table</strong> — current step, % progress bar, days elapsed, status (On Track / At Risk / Overdue).
              </li>
              <li>
                <strong>Onboarding Wizard</strong> (sheet) — step progress bar, per-step form (TaskChecklist, DocumentUpload, FddCountdown, StepForm), Activity Log, Communication Triggers.
              </li>
              <li>
                <strong>Communication Triggers</strong> — pre-canned emails (welcome, roadmap, market, FDD, awarded, donut) auto-marked sent when the corresponding step is completed.
              </li>
            </ul>
          </Section>

          <Section id="tour" title="10. Guided Tour">
            <p>
              First-time visitors see a 4-step Driver.js tour that highlights each main sidebar item:
              City Scoring → Teacher Prospects → Candidate Pipeline → Onboarding. The tour ends with a
              "You're all set" panel that deep-links to City Scoring.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Auto-runs on first visit; persists completion in <code>localStorage</code> under <code>ng:tour-completed-v1</code>.</li>
              <li>Restartable any time via the <strong>?</strong> icon in the top-right header.</li>
              <li>Each step has an orange <em>Next</em> button and a muted <em>Skip tour</em> link.</li>
            </ul>
          </Section>

          <Section id="design" title="11. Design System">
            <SubHeading>Brand colors</SubHeading>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Primary navy</strong> <code>#003c7e</code> — sidebar, headings, primary text.</li>
              <li><strong>Accent orange</strong> <code>#fd7e14</code> — primary CTAs, progress bars, active states.</li>
              <li><strong>Success teal</strong> <code>#20c997</code> · <strong>Warning amber</strong> <code>#ffc107</code> · <strong>Danger red</strong> <code>#dc3545</code>.</li>
              <li><strong>Neutrals</strong>: backgrounds <code>#f2f4f6</code> / <code>#f8f9fa</code>, borders <code>#dee2e6</code>, body text <code>#343a40</code>, muted <code>#6c757d</code>.</li>
            </ul>
            <SubHeading>Typography & spacing</SubHeading>
            <ul className="list-disc pl-5 space-y-1">
              <li>System sans-serif font stack via Tailwind defaults.</li>
              <li>8-pt spacing grid; rounded-lg (8 px) on cards; subtle <code>shadow-sm</code> elevation.</li>
            </ul>
            <SubHeading>Component library</SubHeading>
            <p>shadcn/ui components on top of Radix primitives — Sheet, Dialog, Tabs, Table, Select, Toast, Tooltip, Progress, etc.</p>
            <SubHeading>Responsiveness</SubHeading>
            <p>Mobile-first; tested at 320, 375, 414, 768, 1024, 1280+. All tables scroll horizontally on narrow viewports; drawers go full-width below the <code>sm</code> breakpoint.</p>
          </Section>

          <Section id="data" title="12. Data Model (mock)">
            <SubHeading>City</SubHeading>
            <p><code>id, city, state, tier, compositeScore, population, childrenPct, medianIncome, elementarySchools, competitorCount, growthRate, isNonRegistration, schools[], competitors[], notes</code></p>
            <SubHeading>TeacherProspect</SubHeading>
            <p><code>id, name, school, city, state, email, linkedin, fitScore, tag, enrichmentStatus, signals, activity[]</code></p>
            <SubHeading>Candidate</SubHeading>
            <p><code>id, name, city, state, email, stage, fitScore, qualificationScores, trialClose, votes, activity[]</code></p>
            <SubHeading>Franchisee</SubHeading>
            <p><code>id, name, city, state, email, currentStep (1–7), status, daysElapsed, stepData[1..7], activity[], comms[]</code></p>
            <p className="italic" style={{ color: "#6c757d" }}>
              All data lives in <code>src/data/*.ts</code>. State changes are kept in React component state and
              do not survive a page reload.
            </p>
          </Section>

          <Section id="tech" title="13. Tech Stack">
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>React 18</strong> + <strong>TypeScript 5</strong> + <strong>Vite 5</strong></li>
              <li><strong>Tailwind CSS v3</strong> + <strong>shadcn/ui</strong> + <strong>Radix UI</strong></li>
              <li><strong>React Router v6</strong> for routing</li>
              <li><strong>TanStack Query</strong> wired for future API integration</li>
              <li><strong>Driver.js</strong> for the guided tour</li>
              <li><strong>Sonner</strong> + shadcn Toaster for notifications</li>
              <li><strong>Lucide</strong> icon set</li>
              <li><strong>Vitest</strong> for unit tests</li>
            </ul>
          </Section>

          <Section id="future" title="14. Future Work">
            <ul className="list-disc pl-5 space-y-1">
              <li>Wire up Lovable Cloud (auth, Postgres, storage, edge functions) for real persistence and multi-user support.</li>
              <li>Real data integrations: U.S. Census + ACS, GreatSchools, Yelp/Google Places (competitors), LinkedIn Sales Navigator / Apollo / ZoomInfo (teacher enrichment).</li>
              <li>AI assists: auto-draft outreach emails, summarize candidate notes, recommend next-best stage moves.</li>
              <li>Email & calendar integration (Gmail / Google Calendar) for the activity log and outreach send.</li>
              <li>E-signature via DocuSign or Dropbox Sign for FDD and franchise agreement.</li>
              <li>Manager dashboards, role-based access, and assignment rules.</li>
              <li>Public franchisee portal — read-only view of their own onboarding journey.</li>
            </ul>
          </Section>

          <p className="text-xs mt-8 pt-4" style={{ color: "#6c757d", borderTop: "1px solid #dee2e6" }}>
            Document version 1.0 · Prototype build · For internal review.
          </p>
        </article>
      </div>
    </div>
  );
};

export default Spec;
