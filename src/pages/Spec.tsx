import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { SPEC_MARKDOWN } from "@/data/specMarkdown";
import { DocShell } from "@/components/DocShell";

const NAVY = "#003c7e";
const INK = "#0b1a36";

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
    <h2 className="text-[22px] font-black tracking-tight mb-3" style={{ color: NAVY }}>{title}</h2>
    <div className="space-y-3 text-[14.5px] leading-[1.7]" style={{ color: "#3a4a66" }}>
      {children}
    </div>
  </section>
);

const SubHeading = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-[15px] font-bold mt-5 mb-2" style={{ color: INK }}>{children}</h3>
);

const Pill = ({ children, color = NAVY }: { children: React.ReactNode; color?: string }) => (
  <span
    className="inline-block text-[11px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full mr-1.5"
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
    { id: "city-scoring", label: "6. City Search" },
    { id: "teacher-prospects", label: "7. Teacher Search" },
    { id: "email-outreach", label: "8. Email Outreach" },
    { id: "candidate-pipeline", label: "9. Candidate Pipeline" },
    { id: "onboarding", label: "10. Onboarding (Phase 2)" },
    { id: "design", label: "11. Design System" },
    { id: "data", label: "12. Data Model" },
    { id: "tech", label: "13. Tech Stack" },
    { id: "reliability", label: "14. Reliability & Correctness" },
    { id: "future", label: "15. Future Work" },
  ];

  return (
    <DocShell
      eyebrow="Engineering reference"
      eyebrowIcon={FileText}
      title={<>Full Specification</>}
      subtitle="The complete product specification of the Neuron Garage Franchise Acquisition System — every screen, every flow, every data model."
      action={
        <Button
          onClick={handleDownloadSpec}
          className="gap-2 rounded-full px-5 py-5 text-[13px] font-bold"
          style={{ background: "linear-gradient(135deg, #003c7e 0%, #0757ff 100%)", color: "white", boxShadow: "0 12px 28px rgba(7,87,255,0.25)" }}
        >
          <Download size={15} />
          Download .md
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        {/* Sidebar TOC */}
        <aside className="lg:sticky lg:top-4 self-start">
          <div className="rounded-2xl bg-white p-5" style={{ border: "1px solid #eef2f7", boxShadow: "0 4px 14px rgba(15,23,42,0.04)" }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: NAVY }}>
              Contents
            </p>
            <nav className="flex flex-col gap-2">
              {toc.map((t) => (
                <a
                  key={t.id}
                  href={`#${t.id}`}
                  className="text-[13.5px] font-medium hover:translate-x-0.5 transition-transform"
                  style={{ color: INK }}
                >
                  {t.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Body */}
        <article className="rounded-[24px] bg-white p-7 md:p-10 max-w-3xl" style={{ border: "1px solid #eef2f7", boxShadow: "0 10px 30px rgba(11,26,54,0.05)" }}>
          <Section id="overview" title="1. Overview">
            <p>
              <strong>Neuron Garage Franchise Acquisition System</strong> is the internal recruiting console
              used by the Neuron Garage franchise development team to (1) identify the best U.S. markets for new
              franchises, (2) source elementary-school teachers as candidate franchisees, (3) qualify those
              candidates through a structured 7-stage pipeline, and (4) run targeted email outreach via
              SmartLead.
            </p>
            <p>
              The product is a React + TypeScript single-page app running on Lovable Cloud (Supabase) — Postgres
              for data, email/password auth, Edge Functions for vendor API proxies, Realtime for live inbox
              updates. Live data integrations include Census ACS, BLS, BEA, FRED, NCES CCD, Apollo, Apify,
              Firecrawl, and SmartLead. It is an internal tool for three users (Kaylie, Sam, Haseeb).
            </p>
            <SubHeading>Goals</SubHeading>
            <ul className="list-disc pl-5 space-y-1">
              <li>Replace ad-hoc spreadsheets and email threads with a single source of truth.</li>
              <li>Use scoring + AI assists to focus the team on the highest-value cities and prospects.</li>
              <li>Make every stage of the pipeline observable, accountable, and time-bound.</li>
              <li>Give every score, badge, and ranked list a visible "Show Formula" so nothing is a black box.</li>
            </ul>
            <SubHeading>Non-Goals (current scope)</SubHeading>
            <ul className="list-disc pl-5 space-y-1">
              <li>No public-facing surfaces — internal tool, three known users.</li>
              <li>No payment processing or contract execution; e-sign is represented as a status only.</li>
              <li>Phase 2 Onboarding (signed-franchisee launch program) is in the codebase but parked until the first signings.</li>
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
              <li><strong>Five primary nav items:</strong> Dashboard, City Search, Teacher Search, Email Outreach, Candidate Pipeline.</li>
              <li><strong>Docs group:</strong> User's Guide, SmartLead API Spec, Outreach Guide, Demographics Method, CSI Methodology, Full Specification.</li>
              <li><strong>Mobile top bar</strong> with hamburger and brand mark. Touch targets ≥44 px.</li>
            </ul>
            <SubHeading>Routes</SubHeading>
            <ul className="list-disc pl-5 space-y-1">
              <li><code>/</code> — Dashboard</li>
              <li><code>/city-scoring</code> — City Search</li>
              <li><code>/teacher-prospects</code> — Teacher Search</li>
              <li><code>/email-outreach</code> — Email Outreach (SmartLead)</li>
              <li><code>/candidate-pipeline</code> — Candidate Pipeline</li>
              <li><code>/users-guide</code>, <code>/smartlead-spec</code>, <code>/email-outreach-docs</code>, <code>/demographics-methodology</code>, <code>/methodology</code>, <code>/spec</code> — documentation pages</li>
              <li><code>/auth</code> — email/password login</li>
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

          <Section id="city-scoring" title="6. City Search">
            <SubHeading>Purpose</SubHeading>
            <p>Rank U.S. cities by their suitability for a new Neuron Garage franchise across the ~817 cities with population ≥ 50,000.</p>
            <SubHeading>Inputs / Filters</SubHeading>
            <ul className="list-disc pl-5 space-y-1">
              <li>State, tier (A/B/C), registration status, free-text search.</li>
              <li>Adjustable <strong>Scoring Weights</strong> across three categories: Market Size, Pricing Power / Parent Profile, and Competitive Landscape. Master sliders auto-rebalance to 100%; sub-metric weights are relative-importance numbers.</li>
            </ul>
            <SubHeading>Outputs</SubHeading>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Stat cards</strong> showing total cities, A-tier count, average score, and registered states.</li>
              <li><strong>Ranked markets table</strong> — sortable by every numeric column; row click opens a detail drawer with full demographics, competitor list, schools, and notes.</li>
              <li><strong>Compare mode</strong> — select up to 3 cities and open a side-by-side modal.</li>
              <li><strong>Show Formula</strong> affordance on every composite score, exposing inputs, weights, and arithmetic.</li>
            </ul>
            <SubHeading>Live data sources</SubHeading>
            <p>Census ACS, BLS, BEA, FRED, NCES CCD. Composite scores are minted by a single <code>MarketView</code> source — see §14.</p>
            <SubHeading>Key actions</SubHeading>
            <ul className="list-disc pl-5 space-y-1">
              <li>From the detail drawer: <em>"Find Teachers in this City"</em> → navigates to Teacher Search pre-filtered to that city.</li>
            </ul>
          </Section>

          <Section id="teacher-prospects" title="7. Teacher Search">
            <SubHeading>Purpose</SubHeading>
            <p>Discover and shortlist elementary-school teachers who could become franchisees.</p>
            <SubHeading>Data sources</SubHeading>
            <p>Apollo (primary, active teachers with contactable email), Apify scrapes, and CSV imports. Enrichment via Firecrawl.</p>
            <SubHeading>Components</SubHeading>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Filter bar</strong> — city, fit-score range, tag, enrichment status, search.</li>
              <li><strong>Find Prospects modal</strong> — AI search by city + grade band + keywords; returns a ranked list.</li>
              <li><strong>Outreach Intelligence panel</strong> — suggested send-time, recommended channel, and a draft message template per selection.</li>
              <li><strong>Prospect table</strong> — name, school, city, masked email, LinkedIn, Fit Score, tag, enrichment status, Promote action.</li>
              <li><strong>Bulk action bar</strong> — appears when one or more rows are selected: bulk-promote, bulk-tag, export.</li>
              <li><strong>Detail panel</strong> — full profile with bio, contact, school info, signals (years experience, leadership roles, side hustles), activity log.</li>
            </ul>
            <SubHeading>Push correctness — dual ID</SubHeading>
            <p>
              The internal <code>teacher_prospects.id</code> and the SmartLead <code>smartlead_lead_id</code> are kept strictly
              separate. Synthetic <code>campaign_cache</code> rows are filtered out of push targets so we can never push to a
              non-existent SmartLead lead.
            </p>
            <SubHeading>Promote flow</SubHeading>
            <p>
              Clicking <em>Promote</em> on a teacher creates a corresponding entry in the Candidate Pipeline at the
              <strong> New Lead</strong> stage.
            </p>
          </Section>

          <Section id="email-outreach" title="8. Email Outreach">
            <SubHeading>Purpose</SubHeading>
            <p>
              Run the SmartLead-powered outreach engine without leaving the app. Two pools live on one screen: the
              <strong> Master Teacher Database</strong> (every teacher we know about) and the <strong>SmartLead</strong> subset
              currently in a live campaign. A Viewing toggle flips between them.
            </p>
            <SubHeading>Components</SubHeading>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Connection Health panel</strong> — API status, primary sending mailbox, recent webhook events, last successful API call.</li>
              <li><strong>Campaigns panel</strong> — list, create (4-step wizard), activate / pause / stop.</li>
              <li><strong>Import Wizard</strong> — 4 steps: batch info → CSV upload + AI column mapping → QA review → import to SmartLead in 400-lead chunks.</li>
              <li><strong>Live Inbox</strong> — Supabase Realtime feed of replies, opens, bounces; auto-classified into HOT / NOT INTERESTED / OOO / NEUTRAL.</li>
              <li><strong>Analytics</strong> — global KPI tiles + per-campaign performance table with 30-day-window chunking.</li>
              <li><strong>Email Account Health</strong> — warmup status, daily progress, reputation score per mailbox.</li>
            </ul>
            <SubHeading>Current status</SubHeading>
            <p>
              Mailboxes are in <strong>warm-up</strong> — sends go to internal staff and the SmartLead warm-up pool. The
              <em> Live Outreach</em> pill remains disabled until warm-up completes. See <em>Outreach Guide</em> and
              <em> SmartLead API Spec</em> in the sidebar for the full picture.
            </p>
          </Section>

          <Section id="candidate-pipeline" title="9. Candidate Pipeline">
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
              <li><strong>Confirmation gate:</strong> a card cannot drop into Signing until it has passed Confirmation. Enforced by design.</li>
            </ul>
            <SubHeading>Detail panel (sheet)</SubHeading>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Overview</strong> — contact, source, fit score, deal owner.</li>
              <li><strong>Qualification</strong> — six 1–5 star ratings (capital, motivation, market knowledge, time commitment, leadership, culture fit) with auto-calc total.</li>
              <li><strong>Notes & Activity</strong> — chronological log; add a note inline.</li>
              <li><strong>Homework</strong> — trial-close checklist (territory selected, financing in place, family aligned, etc.).</li>
              <li><strong>Selection Committee</strong> (Immersion only) — three named members, each casts an Approve / Decline vote.</li>
            </ul>
          </Section>

          <Section id="onboarding" title="10. Onboarding (Phase 2 — Parked)">
            <p>
              A 7-step signed-franchisee onboarding program (Welcome &amp; Kickoff → Roadmap → Market Plan → FDD Countdown →
              Document Upload → Awarded → Active Franchisee Onboarding) exists in the codebase but is <strong>parked for
              Phase 2</strong> while the team focuses on getting the first signed franchisees through the door. It will be
              re-activated once Signing volume justifies it.
            </p>
          </Section>

          <Section id="design" title="11. Design System">
            <SubHeading>Brand colors</SubHeading>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Primary navy</strong> <code>#003c7e</code> — sidebar, headings, primary text.</li>
              <li><strong>Accent orange</strong> <code>#fd7e14</code> — primary CTAs, progress bars, active states.</li>
              <li><strong>Success teal</strong> <code>#20c997</code> · <strong>Warning amber</strong> <code>#ffc107</code> · <strong>Danger red</strong> <code>#dc3545</code>.</li>
              <li><strong>Neutrals</strong>: backgrounds <code>#f2f4f6</code> / <code>#f8f9fa</code>, borders <code>#dee2e6</code>, body text <code>#343a40</code>, muted <code>#6c757d</code>.</li>
            </ul>
            <SubHeading>Typography &amp; spacing</SubHeading>
            <ul className="list-disc pl-5 space-y-1">
              <li>System sans-serif font stack via Tailwind defaults.</li>
              <li>8-pt spacing grid; rounded-lg (8 px) on cards; subtle <code>shadow-sm</code> elevation.</li>
            </ul>
            <SubHeading>Component library</SubHeading>
            <p>shadcn/ui components on top of Radix primitives — Sheet, Dialog, Tabs, Table, Select, Toast, Tooltip, Progress, etc.</p>
            <SubHeading>Responsiveness</SubHeading>
            <p>Mobile-first; tested at 320, 375, 414, 768, 1024, 1280+. All tables scroll horizontally on narrow viewports; drawers go full-width below the <code>sm</code> breakpoint.</p>
          </Section>

          <Section id="data" title="12. Data Model">
            <p>
              Primary source of truth is <strong>Lovable Cloud Postgres</strong>. Reads go through TanStack Query;
              writes go through Supabase Edge Functions or the Supabase client. The legacy in-memory{" "}
              <code>pageCache</code> layer has been removed — TanStack Query is the single cache.
            </p>
            <SubHeading>Core tables</SubHeading>
            <ul className="list-disc pl-5 space-y-1">
              <li><code>us_cities_scored</code> — ~817 cities with composite + sub-category scores and live demographic signals.</li>
              <li><code>teacher_prospects</code> — Master Teacher DB rows with Fit Score inputs, verification status, and SmartLead pipeline state.</li>
              <li><code>candidates</code> — pipeline rows with stage, qualification scores, votes, activity.</li>
              <li><code>smartlead_events</code> — Realtime-published webhook events (replies, opens, bounces) with intent classification.</li>
              <li><code>prospect_batches</code>, <code>prospects_staging</code> — Import Wizard history and per-row QA state.</li>
              <li><code>campaign_cache</code> — local mirror of SmartLead campaign data (10-minute TTL).</li>
            </ul>
            <SubHeading>Auth</SubHeading>
            <p>Email/password via Supabase Auth. No social providers. RLS policies scope every table to the three authenticated users.</p>
          </Section>

          <Section id="tech" title="13. Tech Stack">
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>React 18</strong> + <strong>TypeScript 5</strong> + <strong>Vite 5</strong></li>
              <li><strong>Tailwind CSS v3</strong> + <strong>shadcn/ui</strong> + <strong>Radix UI</strong></li>
              <li><strong>React Router v6</strong> for routing</li>
              <li><strong>TanStack Query</strong> — single source of cache truth for backend reads (replaces the deleted <code>pageCache</code> layer)</li>
              <li><strong>Lovable Cloud (Supabase)</strong> — Postgres, Auth, Edge Functions (Deno), Realtime, Storage, Secrets</li>
              <li><strong>Edge Functions</strong> — <code>smartlead-proxy</code>, <code>smartlead-webhook</code>, vendor enrichment proxies (Apollo, Firecrawl, etc.)</li>
              <li><strong>Sonner</strong> + shadcn Toaster for notifications</li>
              <li><strong>Lucide</strong> icon set</li>
              <li><strong>Vitest</strong> — 57 unit tests covering scoring + utility logic</li>
              <li><strong>Playwright</strong> — end-to-end smoke tests for City Search, Teacher Prospects, and Candidate Pipeline search flows</li>
              <li><strong>GitHub Actions CI</strong> — lint, typecheck, unit tests, and production build run in parallel on every pull request</li>
            </ul>
          </Section>

          <Section id="reliability" title="14. Reliability & Correctness Guarantees">
            <SubHeading>One composite per city per render</SubHeading>
            <p>
              Every composite score, tier badge, and formatted score string rendered to the user is minted by a single
              <code> MarketView</code> source (<code>src/lib/marketView.ts</code>). Components never compute, never re-derive,
              and never round composites inside JSX. A dev-mode drift detector throws a red console error if the same
              <code> (cityId, weightsHash)</code> ever mints two different composites in one render pass. This rule exists
              because we previously shipped a bug where a table cell showed <code>88</code> while the gauge above it showed
              <code> 23</code> for the same city.
            </p>
            <SubHeading>Friendly error states with retry</SubHeading>
            <p>
              Data-heavy surfaces (City Search ranked markets, Teacher Prospects, Candidate Pipeline) use a shared
              <code> QueryErrorState</code> component that renders an alert card with a Retry button on backend failure.
              A failed fetch never silently degrades to an empty list.
            </p>
            <SubHeading>Teacher push dual-ID separation</SubHeading>
            <p>
              The internal <code>teacher_prospects.id</code> and the SmartLead <code>smartlead_lead_id</code> are tracked as
              distinct fields end-to-end. Synthetic <code>campaign_cache</code> rows are excluded from push targets so we
              cannot push to a non-existent SmartLead lead.
            </p>
            <SubHeading>Smoke coverage and CI gate</SubHeading>
            <p>
              Playwright covers sidebar navigation and core search flows for the three data-heavy pages. Every pull
              request runs lint, typecheck, unit tests, and a production build in parallel before it can merge.
            </p>
            <SubHeading>Show Formula contract</SubHeading>
            <p>
              Every score, sub-score, and ranked list surfaces a "Show Formula" affordance listing inputs, weights, and
              arithmetic. No black boxes.
            </p>
          </Section>

          <Section id="future" title="15. Future Work">
            <ul className="list-disc pl-5 space-y-1">
              <li>Wire the GreatSchools API once the key arrives (currently blocked on Brett).</li>
              <li>Move SmartLead from warm-up to live teacher outreach once mailbox reputation clears the threshold.</li>
              <li>Re-activate Phase 2 Onboarding (signed-franchisee 7-step launch) once Signing volume justifies it.</li>
              <li>AI assists: auto-draft outreach replies, summarize candidate notes, recommend next-best stage moves.</li>
              <li>Calendar integration (Google Calendar) for activity log and interview scheduling.</li>
              <li>E-signature integration (DocuSign or Dropbox Sign) for FDD and franchise agreement.</li>
            </ul>
          </Section>

          <p className="text-[11px] mt-8 pt-4" style={{ color: "#6c757d", borderTop: "1px solid #dee2e6" }}>
            Document version 2.0 · Live build on Lovable Cloud · Internal reference.
          </p>
        </article>
      </div>
    </DocShell>
  );
};

export default Spec;
