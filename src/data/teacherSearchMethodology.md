# Teacher Search — Methodology (Plain English)

**Version:** v1.1 · **Date:** 2026-07-24 · **Audience:** Admin users

*Changed since v1.0: corrected the source filter options, and clarified that the Fit Score is not automatically calculated today — it is entered by hand or left blank until a scoring rule is wired up.*

This doc explains, in plain words, how Teacher Search finds teachers and how it decides who might be a good fit. It is written for admins — not engineers. If you want the full technical spec, open the **Teacher Search Spec** page.

---

## 1. What Teacher Search does

Teacher Search helps us find current and former **elementary school teachers** in a chosen city. For each teacher we show:

- Their name and school.
- Their city and state.
- If we found an email or a LinkedIn.
- A **Fit Score** from 0 to 100 that tells us how well they might fit as a future camp lead or franchisee.

The goal is simple: give the recruiting team a short list of teachers most worth reaching out to.

---

## 2. How we find teachers

We use four ways to add teachers to the list:

1. **Find Prospects (automatic search).** You pick a city and press *Find Prospects*. The tool then looks up public elementary schools in that city and pulls teacher names from public web pages (Google Maps listings for those schools). This is powered by a third-party service called **Apify**.
2. **CSV upload — one list at a time.** You can upload a spreadsheet of teachers. The tool uses AI to figure out which column is the name, which is the email, and so on.
3. **CSV upload — bulk pool.** For very large lists you can bulk-upload into the Master Teacher DB. Duplicates (same email) are removed automatically.
4. **Manual add.** You can also add or edit a single teacher by hand.

Every teacher we add ends up in one table (`teacher_prospects`), so nothing is scattered.

---

## 3. How the Fit Score works

The Fit Score is a number from **0 to 100**. Higher = better fit. It is a rough helper, not a promise.

**Today the score is not calculated automatically.** New teachers come in with an empty Fit Score. A score only appears when a person types one in (for example, when promoting a teacher to the Candidate Pipeline) or when an older import already had one. We plan to turn on an automatic rule later that looks at:

- **Grade level.** Teachers who teach **Kindergarten to Grade 6** would get a big boost. Middle and high school teachers would get a smaller boost.
- **Teacher type.** Active, retired, or already doing **camp / enrichment** work. Camp and enrichment backgrounds would score higher.
- **Summer availability.** Signals that the person can work in summer would boost the score.
- **Subject match.** Teachers in subjects close to our camps (STEM, art, enrichment) would get extra points.

Whatever the score is, it maps to a plain-English tag:

- **80 and above → "High Potential"**
- **50 to 79 → "Follow-Up"**
- **Below 50 → "Not a Fit"**

The tag is what shows up as a colored pill in the table.

---

## 4. What each teacher's status means

Every teacher has a status that tells you where they are in our process:

- **New** — Just found. Not reviewed yet.
- **Shortlisted** — You marked them worth another look.
- **In Outreach** — They are already in a SmartLead email campaign.
- **Suppressed** — Do not contact (unsubscribed or blocked).
- **Not a Fit** — Reviewed and rejected.

You can change a teacher's status from the table or from the detail panel.

---

## 5. What each part of the screen does

- **City Rail (left).** Pick one or more cities to focus on.
- **Market Context Banner.** Shows the score and tier of the city you picked. It tells you: "Is this a strong market to be prospecting in?"
- **Next Best Action.** A single suggestion for what to do next (for example: "Push 12 verified teachers to SmartLead").
- **Funnel Widget.** Four numbers side by side: **Total → With Email → Verified → In SmartLead**. This tells you how full each stage of the pipeline is.
- **Filter Bar.** Search, source filter, and a switch to hide teachers who are already in outreach.
- **Teacher Table.** The main list. You can sort, select rows, and act on them.
- **Bulk Action Bar.** Appears when you select rows. Lets you tag, promote, add to a campaign, or export.
- **Detail Panel.** Opens when you click a row. Shows the full profile.
- **AI Panel (right).** A chat assistant that can answer questions about what's on screen.

---

## 6. Bulk actions you can take

When you select one or more rows:

- **Add tag** — apply a label to every selected teacher.
- **Change status** — mark them Shortlisted, In Outreach, or Not a Fit in one click.
- **Enrich emails** — for teachers linked to a known school, we look up missing email addresses in the background.
- **Add to campaign** — push them to SmartLead for email outreach.
- **Promote to Candidate Pipeline** — move them into the recruiting funnel as "New Lead".
- **Export CSV** — download all selected rows (or, if nothing is selected, everything that matches the current filters).

---

## 7. The AI co-pilot

There is a small AI assistant on the right side of the page. It only answers questions about the teachers **currently visible** with the filters you have set. Some examples:

- "Who are the top 5 teachers by Fit Score in this city?"
- "How many have no email yet?"
- "Which schools show up most often?"

Rules the assistant follows:

- It **never takes actions**. It only answers and suggests.
- It **only uses what is on screen**. If your filter is Denver, it will not talk about Austin.
- It **does not claim experience** we do not have. The tool is new, so it uses neutral wording like "the data suggests" instead of "in our experience".
- After each answer it suggests 2 or 3 short follow-up questions you can click.

---

## 8. What Teacher Search is **not**

- It does **not** send emails. That is the job of **Email Outreach / SmartLead**.
- It does **not** schedule interviews. That is the job of **Candidate Pipeline**.
- It does **not** score the city itself. That is **City Search** and **Market Validation**.
- The Fit Score is **not** a machine-learning model today. It is a set of clear rules we can inspect and change.

---

## 9. Limits to be aware of

- Apify is our only automatic source right now. Apollo and vendor lists are on the roadmap.
- Email verification is best effort — for older rows the "Verified" flag may be blank.
- Some teacher names come from Google Maps listings, so spelling can be off. You can edit any row.
- Fit Score is a rough helper. Always use human judgment before promoting a teacher.

---

## 10. Where the data lives

Everything is stored in the Neuron Garage backend. Admins can trace any teacher back to:

- The **city** they belong to.
- The **school** they teach at (linked to the NCES public-school directory when we know the id).
- The **campaign** they were pushed to (if any).
- The **activity log** on the detail panel (who changed what, and when).

---

If you find something in the tool that does not match this doc, please tell the team — we keep this page in sync with the shipped behavior. Latest update: **2026-07-21**.
