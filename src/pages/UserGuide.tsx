import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { AiAssistant, type AssistantContext } from "@/components/AiAssistant";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { USER_GUIDE_MARKDOWN } from "@/data/userGuideMarkdown";
import {
  Map,
  Users,
  Mail,
  Kanban,
  Sparkles,
  Compass,
  Lightbulb,
  ArrowRight,
  CheckCircle2,
  Cog,
  Download,
  FileText,
} from "lucide-react";

/**
 * User's Guide — beginner-friendly walkthrough of Neuron Garage Franchise Development.
 *
 * The branded sections at the top (hero, principles, journey, card anatomy,
 * closing CTA) live as JSX for visual identity. The bulk of the content —
 * the four features, Neuron AI, Notifications, Observability, Phase 2,
 * FAQ — is rendered from `USER_GUIDE_MARKDOWN`. The same markdown is what
 * the "Download Markdown" button writes to disk, so page and file can
 * never drift. Mirrors the Spec page pattern.
 */

const NAVY = "#003c7e";
const BLUE = "#0757ff";
const YELLOW = "#FFD400";
const CORAL = "#ff5a3c";
const INK = "#0b1a36";
const SOFT = "#f6f8ff";

const navChips = [
  { id: "feature-1--city-search", number: "1", title: "City Search", icon: Map },
  { id: "feature-2--teacher-search", number: "2", title: "Teacher Search", icon: Users },
  { id: "feature-3--email-outreach", number: "3", title: "Email Outreach", icon: Mail },
  { id: "feature-4--candidate-pipeline", number: "4", title: "Candidate Pipeline", icon: Kanban },
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
    title: "Built for the team",
    body: "Kaylie, Sam, and the recruiting staff. Clunky-but-clear beats pretty-but-mysterious every time.",
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

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

const handleDownloadGuide = () => {
  const blob = new Blob([USER_GUIDE_MARKDOWN], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "neuron-garage-franchise-users-guide.md";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Render the guide markdown into a clean, isolated print window. Printing the
// live page caused Chrome's Save-as-PDF dialog to hang on "Saving..." because
// of the app's fixed/sticky chrome, AI launcher, and heavy gradients. A blank
// popup with simple HTML + Arial prints reliably across browsers.
const handlePrintGuide = () => {
  // Minimal markdown -> HTML (headings, lists, bold, italic, code, hr, paragraphs).
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s: string) =>
    esc(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  const lines = USER_GUIDE_MARKDOWN.split("\n");
  const out: string[] = [];
  let inList: "ul" | "ol" | null = null;
  let inCode = false;
  const closeList = () => {
    if (inList) {
      out.push(`</${inList}>`);
      inList = null;
    }
  };
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (line.startsWith("```")) {
      closeList();
      if (!inCode) {
        out.push("<pre><code>");
        inCode = true;
      } else {
        out.push("</code></pre>");
        inCode = false;
      }
      continue;
    }
    if (inCode) {
      out.push(esc(raw));
      continue;
    }
    if (!line.trim()) {
      closeList();
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      closeList();
      out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
      continue;
    }
    if (/^(\*\*\*|---|___)$/.test(line.trim())) {
      closeList();
      out.push("<hr/>");
      continue;
    }
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    if (ol) {
      if (inList !== "ol") {
        closeList();
        out.push("<ol>");
        inList = "ol";
      }
      out.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }
    if (ul) {
      if (inList !== "ul") {
        closeList();
        out.push("<ul>");
        inList = "ul";
      }
      out.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }
    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  if (inCode) out.push("</code></pre>");

  const html = `<!doctype html><html><head><meta charset="utf-8"/>
<title>User's Guide — Neuron Garage Franchise Development</title>
<style>
  @page { size: Letter; margin: 0.6in; }
  html, body { background: #fff; color: #0b1a36; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.55; margin: 0; padding: 24px; max-width: 7.2in; }
  h1 { font-size: 22pt; margin: 0 0 6pt; color: #003c7e; }
  h2 { font-size: 16pt; margin: 18pt 0 6pt; color: #003c7e; border-bottom: 1px solid #e5e7eb; padding-bottom: 4pt; }
  h3 { font-size: 13pt; margin: 14pt 0 4pt; color: #0b1a36; }
  h4 { font-size: 11.5pt; margin: 10pt 0 3pt; color: #0b1a36; }
  p, li { font-size: 11pt; }
  ul, ol { padding-left: 22pt; margin: 6pt 0; }
  li { margin: 2pt 0; }
  code { font-family: "Courier New", monospace; font-size: 10pt; background: #f3f4f6; padding: 1pt 4pt; border-radius: 3pt; }
  pre { background: #f3f4f6; padding: 10pt; border-radius: 4pt; overflow: auto; }
  pre code { background: transparent; padding: 0; }
  a { color: #0757ff; text-decoration: none; }
  hr { border: 0; border-top: 1px solid #e5e7eb; margin: 14pt 0; }
  strong { color: #0b1a36; }
  .doc-header { border-bottom: 2px solid #003c7e; padding-bottom: 8pt; margin-bottom: 14pt; }
  .doc-header .sub { color: #475569; font-size: 10pt; margin-top: 2pt; }
</style></head><body>
<div class="doc-header">
  <div style="font-weight:700;color:#003c7e;">Neuron Garage Franchise Development</div>
  <div class="sub">User's Guide · v1.4 · Printed ${new Date().toLocaleDateString()}</div>
</div>
${out.join("\n")}
<script>
  window.addEventListener("load", function () {
    setTimeout(function () { window.focus(); window.print(); }, 150);
  });
  window.addEventListener("afterprint", function () { window.close(); });
</script>
</body></html>`;

  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) {
    alert("Please allow pop-ups to print the User's Guide.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
};

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
        subtitle="A friendly walkthrough of Neuron Garage Franchise Development for the team — no jargon, no surprises. In lock-step with the Full Specification."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadGuide}
              className="gap-2"
              style={{ borderColor: NAVY, color: NAVY }}
            >
              <Download className="h-4 w-4" /> Download Markdown
            </Button>
            <Button
              size="sm"
              onClick={handlePrintGuide}
              className="gap-2 text-white"
              style={{ backgroundColor: NAVY }}
            >
              <FileText className="h-4 w-4" /> Print / Save as PDF
            </Button>
          </div>
        }
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
            <Sparkles size={13} /> Welcome to the toolkit · v1.4
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
            className="mt-5 text-[16px] md:text-[17px] leading-relaxed max-w-[620px]"
            style={{ color: "#3a4a66" }}
          >
            Neuron Garage Franchise Development is your end-to-end recruiting console.
            Four core screens — City Search, Teacher Search, Email Outreach,
            Candidate Pipeline — plus a global Neuron AI assistant (⌘K),
            header-bell notifications, and a data-health surface for the
            engineering team. This guide walks you through every part of it
            in plain English.
          </p>

          <div className="mt-7 flex flex-wrap gap-2.5">
            {navChips.map((f) => (
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

      {/* CARD ANATOMY (kept verbatim — unique reference) */}
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

      {/* THE FULL REFERENCE (parity with Spec, rendered from markdown) */}
      <section className="mb-14">
        <SectionTitle>The full reference</SectionTitle>
        <p className="mt-2 text-[15px]" style={{ color: "#5a6a85" }}>
          Every feature, every rule, every Phase-2 item — in plain English.
          This is the same content the <strong>Download Markdown</strong>{" "}
          button produces, so the page and the file can never drift.
        </p>

        <div
          className="mt-6 rounded-2xl bg-white p-6 md:p-9"
          style={{ border: "1px solid #eef2f7" }}
        >
          <article
            className="max-w-none text-[14.5px] leading-[1.7]"
            style={{ color: "#3a4a66" }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1
                    className="text-[26px] font-black tracking-tight mb-4 mt-2"
                    style={{ color: NAVY }}
                  >
                    {children}
                  </h1>
                ),
                h2: ({ children }) => {
                  const text = String(children);
                  return (
                    <h2
                      id={slugify(text)}
                      className="scroll-mt-20 text-[20px] font-black tracking-tight mt-9 mb-3 pt-4 border-t border-[#eef2f7]"
                      style={{ color: NAVY }}
                    >
                      {children}
                    </h2>
                  );
                },
                h3: ({ children }) => (
                  <h3
                    className="text-[15.5px] font-bold mt-5 mb-2"
                    style={{ color: INK }}
                  >
                    {children}
                  </h3>
                ),
                p: ({ children }) => <p className="my-3">{children}</p>,
                a: ({ href, children }) => (
                  <a href={href} className="font-medium hover:underline" style={{ color: BLUE }}>
                    {children}
                  </a>
                ),
                ul: ({ children }) => (
                  <ul className="my-3 ml-5 list-disc space-y-1.5">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="my-3 ml-5 list-decimal space-y-1.5">{children}</ol>
                ),
                li: ({ children }) => <li className="pl-1">{children}</li>,
                strong: ({ children }) => (
                  <strong className="font-bold" style={{ color: INK }}>
                    {children}
                  </strong>
                ),
                code: ({ children }) => (
                  <code className="rounded bg-[#f2f4f6] px-1.5 py-0.5 font-mono text-[12.5px]" style={{ color: INK }}>
                    {children}
                  </code>
                ),
                blockquote: ({ children }) => (
                  <blockquote
                    className="my-4 border-l-4 pl-4 py-2 text-[13.5px] rounded-r italic"
                    style={{
                      borderColor: CORAL,
                      backgroundColor: "#fff8ec",
                      color: "#5a3a00",
                    }}
                  >
                    {children}
                  </blockquote>
                ),
                table: ({ children }) => (
                  <div className="my-4 overflow-x-auto rounded-lg border border-[#eef2f7]">
                    <table className="w-full text-[13px] border-collapse">{children}</table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-[#f7faff]" style={{ color: INK }}>
                    {children}
                  </thead>
                ),
                th: ({ children }) => (
                  <th className="text-left font-bold px-3 py-2 border-b border-[#eef2f7]">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-3 py-2 border-b border-[#f2f4f6] align-top">
                    {children}
                  </td>
                ),
                hr: () => <hr className="my-7 border-[#eef2f7]" />,
              }}
            >
              {USER_GUIDE_MARKDOWN}
            </ReactMarkdown>
          </article>
        </div>

        {/* Quick "Ask AI about X" row */}
        <div className="mt-6 flex flex-wrap gap-2">
          {navChips.map((f) => (
            <button
              key={f.id}
              onClick={() => openAssistant(f.id.replace(/^feature-\d+--/, "") as AssistantContext)}
              className="group inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-bold transition-all hover:-translate-y-0.5"
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
          This tool is built for the team — Kaylie, Sam and the recruiting
          staff. If something feels clunky, slow, or wrong, tell Brett or
          Haseeb. We fix it forward, one change at a time.
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
