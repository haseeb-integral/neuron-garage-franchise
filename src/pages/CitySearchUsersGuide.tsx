import { BookOpen } from "lucide-react";
import { DocShell, DocCard } from "@/components/DocShell";
import { DownloadMDButton } from "@/components/DownloadMDButton";

// Plain-English how-to for the City Search screen (/city-scoring).
// Mirrors the download MD so users can save the guide offline.
const GUIDE_MD = `# City Search — User's Guide

**Page:** \`/city-scoring\` · **Updated:** 2026-07-07

City Search is the first screen in the app. It shows every US city we track (about 817), scores each one out of 100, and lets you sort, filter, and shortlist the best ones to look at next in Market Validation.

Think of it like a giant scorecard. You choose what matters most (more families? more teachers?), and the list re-ranks itself.

---

## 1. What the score means

Every city gets a **Total Score from 0 to 100**. Higher is better.

The score is made from two big pillars:

- **Demand** — how many target families live there (families with kids ages 5–12 and household income $150k+, plus growth).
- **TAM Teachers** — how big the teacher pool is (people we can recruit to teach at a Neuron Garage).

You control how much each pillar counts by dragging the two sliders at the top of the page.

Note: **Competitive Landscape** is shown for reference only. It does not change the Total Score right now. The real Competition pillar is coming in Phase 5.

---

## 2. Reading the letter grade (Tier A / B / C / D)

Same idea as school grades:

- **A** — score 90 or higher. Top of the class.
- **B** — 80 to 89. Strong candidate.
- **C** — 70 to 79. Worth a look.
- **D** — below 70. Skip for now.

Change the sliders and you'll see the counts shift — "+10 Tier A" means ten more cities crossed the 90 line under your new weights.

---

## 3. The three preset tiles

At the top of the weights panel are three one-click recipes:

- **Balanced** — Demand 50, TAM Teachers 50. Default. Good starting point.
- **Demand-Heavy** — Demand 70, TAM Teachers 30. Cities with lots of target families rise.
- **TAM-Heavy** — Demand 30, TAM Teachers 70. Cities with a large teacher pool rise.

If you drag the sliders to something that doesn't match a tile, the app shows **Custom** — that's normal.

Clicking a preset also **resets any deeper sub-signal tweaks** so you know exactly what you're looking at.

---

## 4. Fine-tuning inside a pillar

Each pillar has a small **gear icon (⚙)** next to it. Click it to open a drawer where you can change how much each sub-signal counts (e.g. inside Demand: kids ages 5–12 vs household income vs growth).

- The sub-signals inside one pillar always add up to 100.
- There's a **Reset** button to go back to the SOW defaults.
- When you close the drawer, the list re-ranks right away.

---

## 5. Filters (narrow the list)

Down the left/top you'll find:

- **State** — pick one or many.
- **Minimum population** — hide small towns.
- **Minimum score** — only show cities above a certain grade.
- **Tier** — quickly show just A's or A+B.
- **Non-registration-states only** — hides states that need extra franchise paperwork.
- **Watchlist only** — shows just cities you've starred.
- **City search box** — type any name to jump straight to it.

Filters and weights are saved in the URL, so you can copy the link and send the exact view to a teammate.

---

## 6. Clicking a city

Click any row and a panel opens below with:

- The city name, state, score, tier, and population.
- A short **Executive Summary** in plain English.
- **Pillar cards** for Demand and TAM Teachers with the actual signal numbers.
- **Key Market Signals** — families, income, teachers, licensed workers, etc. with source labels.
- Buttons to **Compare**, **Add to Watchlist**, or **Open the PDF report**.

Every number is click-through — open a popover to see where the data came from.

---

## 7. Comparing cities (up to 4)

- Check the box on the left of a row to add it to Compare (max 4 cities).
- Click **Compare** and a modal opens with all 4 side-by-side.
- Rows show composite, tier, each pillar, and each key signal.
- Hit **Export CSV** in the modal to save the comparison.

---

## 8. The Watchlist (your shortlist)

Click the **star** icon on any row to save it. Your watchlist is private to you and lives in the database.

Turn on the **Watchlist only** filter to see just your stars.

This is what feeds into Market Validation. When you're ready to score a city with real provider data, add it to the Market Validation shortlist there.

---

## 9. Saved searches

Set up filters + sliders the way you like, then click **Save search**. Give it a name (e.g. *"Texas Tier A only"*).

Later, click **Load** to snap the whole page back to that exact view — filters, weights, and preset all restored.

Delete removes the saved search.

---

## 10. Ask AI (the chat bar at the top)

Type a plain-English question or command, for example:

- *"Show me Tier A cities in Texas"*
- *"Boost Demand to 70"*
- *"Which cities in Florida have the most teachers?"*

The AI reads your current view (filters, weights, visible count), then answers back. It can:

- Change filters (state, tier, min score).
- Change your weights (relative nudge or exact number).
- Explain what it did in the answer card.

If it changes weights, you'll see a **Demand 50 → 70** diff so you know what shifted. You can always drag the sliders back.

---

## 11. Exporting

- **CSV (whole list)** — click **Download CSV** to save the ranked list under your current filters and weights.
- **PDF Market Report** — open a city, then click **Open PDF report** for a per-city summary you can share.

---

## 12. The notification bell

Top-right of the header. It shows a small red badge when there's news — for example, when a batch City Search job finishes.

Click it to see the 20 most recent notifications. Click **Mark all read** to clear the badge. Notifications are private to you.

---

## 13. Handy tips

- The URL changes as you filter and pick presets — copy it to share your exact view.
- Presets **clear** your sub-signal tweaks. If you had a custom setup, save it first.
- The score you see is always live — it's recomputed the moment you change weights or sub-weights. There's no "stale score" trap.
- If a row shows no data or a "?" grade, that city hasn't been scored yet. Ask the team to reseed the database.

---

## 14. What City Search does not do

- It does **not** call any live crawlers. All data comes from a pre-seeded Census + BLS pull.
- It does **not** know about local competitors yet (Phase 5).
- It does **not** score real estate, franchisee interest, or teacher outreach — those are separate features.

Use it to narrow 817 cities down to a shortlist of 25–50 that are worth deeper investigation in **Market Validation**.
`;

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold text-[#07142f] mb-3">{children}</h2>;
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-[#cfdcff] bg-[#f4f8ff] px-4 py-3 text-[13px] leading-relaxed text-[#07142f]">
      {children}
    </div>
  );
}

export default function CitySearchUsersGuide() {
  return (
    <DocShell
      eyebrow="User's Guide"
      eyebrowIcon={BookOpen}
      title="City Search — User's Guide"
      subtitle="Plain-English how-to for the /city-scoring page. Written for anyone, no jargon. Updated 2026-07-07."
      action={<DownloadMDButton content={GUIDE_MD} filename="city-search-users-guide.md" />}
    >
      <DocCard>
        <div className="space-y-10 text-[14px] leading-relaxed text-[#1a2540]">

          <Tip>
            City Search is the first screen in the app. It shows every US city we track (about <strong>817</strong>), scores each one out of 100, and lets you sort, filter, and shortlist the best ones to look at next in Market Validation. Think of it like a giant scorecard — you choose what matters most, and the list re-ranks itself.
          </Tip>

          <section>
            <H2>1. What the score means</H2>
            <p className="mb-3">Every city gets a <strong>Total Score from 0 to 100</strong>. Higher is better. The score is made from two big pillars:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Demand</strong> — how many target families live there (families with kids ages 5–12 and household income $150k+, plus growth).</li>
              <li><strong>TAM Teachers</strong> — how big the teacher pool is (people we can recruit to teach at a Neuron Garage).</li>
            </ul>
            <p className="mt-3">You control how much each pillar counts by dragging the two sliders at the top of the page.</p>
            <p className="mt-3 text-[13px] text-[#526078]">
              Note: <strong>Competitive Landscape</strong> is shown for reference only. It does not change the Total Score right now. The real Competition pillar is coming in Phase 5.
            </p>
          </section>

          <section>
            <H2>2. Reading the letter grade (Tier A / B / C / D)</H2>
            <p className="mb-3">Same idea as school grades:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>A</strong> — score 90 or higher. Top of the class.</li>
              <li><strong>B</strong> — 80 to 89. Strong candidate.</li>
              <li><strong>C</strong> — 70 to 79. Worth a look.</li>
              <li><strong>D</strong> — below 70. Skip for now.</li>
            </ul>
            <p className="mt-3">Change the sliders and you'll see the counts shift — "+10 Tier A" means ten more cities crossed the 90 line under your new weights.</p>
          </section>

          <section>
            <H2>3. The three preset tiles</H2>
            <p className="mb-3">At the top of the weights panel are three one-click recipes:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Balanced</strong> — Demand 50, TAM Teachers 50. Default. Good starting point.</li>
              <li><strong>Demand-Heavy</strong> — Demand 70, TAM Teachers 30. Cities with lots of target families rise.</li>
              <li><strong>TAM-Heavy</strong> — Demand 30, TAM Teachers 70. Cities with a large teacher pool rise.</li>
            </ul>
            <p className="mt-3">If you drag the sliders to something that doesn't match a tile, the app shows <strong>Custom</strong> — that's normal.</p>
            <p className="mt-3">Clicking a preset also <strong>resets any deeper sub-signal tweaks</strong> so you know exactly what you're looking at.</p>
          </section>

          <section>
            <H2>4. Fine-tuning inside a pillar</H2>
            <p className="mb-3">Each pillar has a small <strong>gear icon (⚙)</strong> next to it. Click it to open a drawer where you can change how much each sub-signal counts (e.g. inside Demand: kids ages 5–12 vs household income vs growth).</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>The sub-signals inside one pillar always add up to 100.</li>
              <li>There's a <strong>Reset</strong> button to go back to the SOW defaults.</li>
              <li>When you close the drawer, the list re-ranks right away.</li>
            </ul>
          </section>

          <section>
            <H2>5. Filters (narrow the list)</H2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>State</strong> — pick one or many.</li>
              <li><strong>Minimum population</strong> — hide small towns.</li>
              <li><strong>Minimum score</strong> — only show cities above a certain grade.</li>
              <li><strong>Tier</strong> — quickly show just A's or A+B.</li>
              <li><strong>Non-registration-states only</strong> — hides states that need extra franchise paperwork.</li>
              <li><strong>Watchlist only</strong> — shows just cities you've starred.</li>
              <li><strong>City search box</strong> — type any name to jump straight to it.</li>
            </ul>
            <p className="mt-3 text-[13px] text-[#526078]">
              Filters and weights are saved in the URL, so you can copy the link and send the exact view to a teammate.
            </p>
          </section>

          <section>
            <H2>6. Clicking a city</H2>
            <p className="mb-3">Click any row and a panel opens below with:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>The city name, state, score, tier, and population.</li>
              <li>A short <strong>Executive Summary</strong> in plain English.</li>
              <li><strong>Pillar cards</strong> for Demand and TAM Teachers with the actual signal numbers.</li>
              <li><strong>Key Market Signals</strong> — families, income, teachers, licensed workers, etc. with source labels.</li>
              <li>Buttons to <strong>Compare</strong>, <strong>Add to Watchlist</strong>, or <strong>Open the PDF report</strong>.</li>
            </ul>
            <p className="mt-3">Every number is click-through — open a popover to see where the data came from.</p>
          </section>

          <section>
            <H2>7. Comparing cities (up to 4)</H2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Check the box on the left of a row to add it to Compare (max 4 cities).</li>
              <li>Click <strong>Compare</strong> and a modal opens with all 4 side-by-side.</li>
              <li>Rows show composite, tier, each pillar, and each key signal.</li>
              <li>Hit <strong>Export CSV</strong> in the modal to save the comparison.</li>
            </ul>
          </section>

          <section>
            <H2>8. The Watchlist (your shortlist)</H2>
            <p className="mb-3">Click the <strong>star</strong> icon on any row to save it. Your watchlist is private to you and lives in the database.</p>
            <p className="mb-3">Turn on the <strong>Watchlist only</strong> filter to see just your stars.</p>
            <p>This is what feeds into Market Validation. When you're ready to score a city with real provider data, add it to the Market Validation shortlist there.</p>
          </section>

          <section>
            <H2>9. Saved searches</H2>
            <p className="mb-3">Set up filters + sliders the way you like, then click <strong>Save search</strong>. Give it a name (e.g. <em>"Texas Tier A only"</em>).</p>
            <p className="mb-3">Later, click <strong>Load</strong> to snap the whole page back to that exact view — filters, weights, and preset all restored.</p>
            <p><strong>Delete</strong> removes the saved search.</p>
          </section>

          <section>
            <H2>10. Ask AI (the chat bar at the top)</H2>
            <p className="mb-3">Type a plain-English question or command, for example:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><em>"Show me Tier A cities in Texas"</em></li>
              <li><em>"Boost Demand to 70"</em></li>
              <li><em>"Which cities in Florida have the most teachers?"</em></li>
            </ul>
            <p className="mt-3 mb-3">The AI reads your current view (filters, weights, visible count), then answers back. It can:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Change filters (state, tier, min score).</li>
              <li>Change your weights (relative nudge or exact number).</li>
              <li>Explain what it did in the answer card.</li>
            </ul>
            <p className="mt-3">If it changes weights, you'll see a <strong>Demand 50 → 70</strong> diff so you know what shifted. You can always drag the sliders back.</p>
          </section>

          <section>
            <H2>11. Exporting</H2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>CSV (whole list)</strong> — click <strong>Download CSV</strong> to save the ranked list under your current filters and weights.</li>
              <li><strong>PDF Market Report</strong> — open a city, then click <strong>Open PDF report</strong> for a per-city summary you can share.</li>
            </ul>
          </section>

          <section>
            <H2>12. The notification bell</H2>
            <p className="mb-3">Top-right of the header. It shows a small red badge when there's news — for example, when a batch City Search job finishes.</p>
            <p>Click it to see the 20 most recent notifications. Click <strong>Mark all read</strong> to clear the badge. Notifications are private to you.</p>
          </section>

          <section>
            <H2>13. Handy tips</H2>
            <ul className="list-disc pl-6 space-y-1">
              <li>The URL changes as you filter and pick presets — copy it to share your exact view.</li>
              <li>Presets <strong>clear</strong> your sub-signal tweaks. If you had a custom setup, save it first.</li>
              <li>The score you see is always live — it's recomputed the moment you change weights or sub-weights. There's no "stale score" trap.</li>
              <li>If a row shows no data or a "?" grade, that city hasn't been scored yet. Ask the team to reseed the database.</li>
            </ul>
          </section>

          <section>
            <H2>14. What City Search does not do</H2>
            <ul className="list-disc pl-6 space-y-1">
              <li>It does <strong>not</strong> call any live crawlers. All data comes from a pre-seeded Census + BLS pull.</li>
              <li>It does <strong>not</strong> know about local competitors yet (Phase 5).</li>
              <li>It does <strong>not</strong> score real estate, franchisee interest, or teacher outreach — those are separate features.</li>
            </ul>
            <p className="mt-3">Use it to narrow 817 cities down to a shortlist of 25–50 that are worth deeper investigation in <strong>Market Validation</strong>.</p>
          </section>

        </div>
      </DocCard>
    </DocShell>
  );
}
