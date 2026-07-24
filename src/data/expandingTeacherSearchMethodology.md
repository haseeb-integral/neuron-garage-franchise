# Expanding Teacher Search and Enrichment — Methodology (Plain English)

**Version:** v1.0 · **Date:** 2026-07-24 · **Audience:** Neuron Garage team
**Based on:** *Teacher Prospect Enrichment — Methodology v1.3 (Definitive)* by Brett Thomas, Integral Associates
**Status:** Reference doc. Nothing new is being built in Lovable yet. This explains where the Manus experiment stands, what has been proven, and what the future Lovable upgrade will look like once the data is trusted.

---

## Executive Summary

Finding a teacher's name is easy. Knowing whether that teacher is worth recruiting as a franchisee is the hard part. This doc explains how we solve the hard part: a system that builds a full picture of each teacher prospect, using mostly free public data, and only spending money on the prospects who earn it.

**How the system works.** Two tools, two jobs.

- **Manus** is the engine that **finds** teachers and **proves** which data sources we can trust.
- **Lovable** is where the team **holds, scores, and works** those teachers — shortlisting, promoting, and launching outreach.

Records flow one direction: from Manus into Lovable. Lovable is the single teacher database.

Every enrichment question gets answered across three layers:

1. **Reachability** — can we contact them (verified email)?
2. **Capability** — are they proven (years of experience, certification)?
3. **Capacity and intent** — will they invest (evidence of entrepreneurial behavior)?

### This week's Houston results

| Win | The Number |
| :---- | :---- |
| Verified teacher emails in hand today (Cy-Fair ISD, 6,251 records at ~95% verified) | **~5,900** |
| Verified emails once Fort Bend scrape completes | **~9,000–11,000** |
| Additional derivable emails from Houston ISD's known pattern (~80% confidence) | **~1,000** |
| Houston metro trajectory: teachers with usable emails | **~10,000–12,000** |
| Share of scraped Houston teachers that already carry a verified email | **~78%** |
| Raw teacher names banked from state salary records across 10+ states | **~505,000** |
| Total spent on data to achieve all of the above | **Under $10** |

### What those numbers mean

- **Directory-first sourcing is a real playbook, not a lucky find.** Two districts (Cy-Fair, Fort Bend) publish full staff directories with verified emails. We now sweep for those first in every new market — they are the cheapest teachers we will ever acquire.
- **Email patterns are district-specific, not universal.** Cy-Fair and Fort Bend use `firstname.lastname`. Katy uses `flastname`. That is why the waterfall discovers each district's pattern before generating any email.
- **The experiments told us what NOT to build.** LinkedIn failed as a discovery channel. Teachers Pay Teachers can confirm behavior but cannot find new people. A paid coaching-staff database misrepresented itself (caught for $2). DonorsChoose is a helpful supplementary signal, not a primary source.
- **What is locked.** The scoring formula (six inputs). The spend rule (paid enrichment only above Fit Score 50). The outreach rule (recruiter chooses personal or school email). The ethics lines (public data only; no data brokers or skip-trace tools, ever).

**Bottom line:** Manus finds them and proves the data. Lovable holds them and works them. About six thousand verified teacher emails in hand today, on track for ten thousand plus, for under ten dollars — and every number in the system can show its math.

---

## 1. What "Enrichment" Means for Us

Most people hear enrichment and think "find the email." That is the smallest piece. For us, enrichment builds a picture across three layers:

- **Reachability.** Can we contact them, and on which channel?
- **Capability.** Are they actually a strong, experienced teacher with the skills to run a camp?
- **Capacity and intent.** Do they have the money, the time, and the appetite to invest in a franchise?

A name with a verified email but no story is a cold call. A name with a verified email, twelve years of K-6 experience, a Teachers Pay Teachers store, and a robotics team they coach is a warm conversation waiting to happen. The second profile is what this methodology produces.

---

## 2. The Governing Rule: Spend Follows Score

- **Free and near-free enrichment** runs on **everybody**.
- **Cheap paid enrichment** runs only on prospects with a **Fit Score of 50 or above** (locked threshold, admin-adjustable).
- **Deep enrichment** (the expensive per-person research) runs only on the **small group we are about to contact** or who have already shown interest.

This is exactly how expensive tools like Clay work internally. We rebuilt that logic with tools we already pay for. Houston already proves the economics — the free tier alone has produced almost 6,000 verified addresses.

---

## 3. Layer 1 — Reachability

### 3.1 The sourcing win: directory-first

The single biggest finding of the cycle. Some districts publish complete staff directories with every teacher's email on the page. When they do, we get names AND verified addresses in one free pass.

| District | Records | Email Coverage | Status |
| :---- | :---- | :---- | :---- |
| Cy-Fair ISD (79 campuses) | 6,251 | ~95% verified, from published `mailto:` links | **Done. Best source found anywhere.** |
| Fort Bend ISD (60 schools) | 3,000–5,000 est. | ~100% on pages (needs Firecrawl for JS rendering, ~$0.02–0.05/school) | **Scraping now.** |
| Houston ISD (~280 schools) | 1,272 | 0% published; ~80% derivable from pattern | Names done; derivation next |
| Katy ISD | ~98 | 0% published; ~75% derivable | Partial; scraper fix queued |
| Spring, Pasadena, Humble, Conroe, Pearland, Alvin ISDs | — | Unknown | Queued; directory check first |

**The rule this creates:** in every new market, **check for published directories with emails before anything else.** Austin metro (Austin ISD, Round Rock, Leander, Pflugerville) is the next repeat of this playbook.

### 3.2 The email waterfall

For teachers whose emails are NOT published, three steps, cheapest first:

1. **Pattern guess.** District emails follow predictable formats, but the format is **district-specific**: Cy-Fair and Fort Bend use `firstname.lastname`, Katy uses `flastname@katyisd.org`. Step one runs **one Hunter Domain Search per district** to discover that district's pattern before generating any email. Derivation confidence runs about **75–80%** (hyphenated names, accents, and middle names cause the misses).
2. **Verify.** Every generated guess runs through **Hunter's Verifier** before it is trusted. Derived emails are flagged as *derived* in the database and are never used for outreach unverified.
3. **Apollo fallback.** For misses, Apollo's people-match by name plus school. Apollo also delivers personal emails, LinkedIn URLs, and phone numbers as free byproducts of matches we already pay for.

### 3.3 Which email gets the pitch

**Both are available; the recruiter chooses.** Personal and school email each surface in the teacher's profile as contact options, selectable per campaign or per prospect. District inboxes filter cold email hard, and a franchise decision is made at the kitchen table — so personal will often be the better choice — but the judgment belongs to the recruiter, not the system.

---

## 4. Layer 2 — Capability

Teachers are one of the most publicly documented professions in America. Most of what we need is free.

### 4.1 State certification databases *(validation in progress)*

Nearly every state runs a public certification lookup that returns certificate type, subject endorsements, grade bands, original issue date, and status. **The issue date alone gives us years of experience.** This is the single richest free source for the "experienced with a track record" requirement, and almost nobody in recruiting uses it systematically.

**Texas is the pilot.** A 50-record hand-check of Houston teachers against the TEA lookup is running now to confirm the match rate before we build at scale. The TEA site requires browser navigation, so scale runs happen inside Manus as batch jobs.

### 4.2 Public salary and payroll records *(505,000 names banked)*

Teacher salaries are public record in most states. One record confirms current employment, maps salary steps to tenure, and provides a real income figure for the capacity assessment.

State salary files have already seeded **~505,000 teacher names** across 10+ states (FL, NY, IN, IL, MI, KS, GA, OH, WA, and others) into the Manus pool. No emails, but this is the raw-material bank for every future city: **when we open a new market, we already hold its teachers' names.**

### 4.3 LinkedIn *(tested and demoted)*

Testing overturned our early assumption. As a discovery channel, LinkedIn failed: a live test returned just 48 usable records, elementary teachers barely use the platform, search precision for K-6 is poor, terms-of-service risk is real, and cost per usable record is high next to free directory scraping.

**LinkedIn is now shortlist-tier enrichment only** — used sparingly to verify employment or career history on prospects who already scored well, starting with the Apollo employment fields we get for free.

### 4.4 Recognition records

Award pages, National Board Certification, grants, and local news mentions are public, crawlable, and double as outreach personalization ("Congratulations on the 2024 district award" is a first line that gets replies). These run as research steps inside the AI dossier for shortlisted prospects — not as standalone pipelines. School-quality ratings on our existing NCES anchor are deferred until the new Fit Score has run on real data.

---

## 5. Layer 3 — Capacity and Intent

This is where we go beyond anything an off-the-shelf tool provides.

### 5.1 Teachers Pay Teachers *(tested and reclassified)*

The test settled a key question. Only about a quarter of TpT sellers use their real name as their store name, listings carry no location data, and the site blocks profile scrapers.

**Verdict:** TpT cannot *find* new teachers, but it can *confirm* entrepreneurial behavior on teachers we already have — store existence, product count, follower and rating volume. A seller with 400 products and 10,000 followers is running a real business. This check runs at the **shortlist tier**, and scraping is paused until a better tool for seller profiles emerges. Outschool and tutoring platforms are queued behind it as similar signal checks.

### 5.2 DonorsChoose *(tested; supplementary signal)*

Free public API returning real teacher names tied to real schools. A teacher with funded STEM or maker projects has demonstrated initiative, grant-writing ability, and subject alignment with Neuron Garage.

Field testing tempered the initial enthusiasm: coverage is sparse (most teachers never post projects), and API rate limits restrict bulk collection.

**Verdict:** valuable **supplementary signal and Fit Score input**, not a primary discovery source.

### 5.3 The coaching-staff database *(tested and rejected, cheaply)*

A paid database advertising 800,000+ school staff records was tested three ways for about **$2 total**. Every run returned school-level records only — names of schools, addresses, mascots, athletic conferences. **No individual staff, despite the product's claims.** Rejected. Good illustration of why we test with small money before committing budget.

### 5.4 Business registrations

Secretary of State searches are free and public. A teacher who has registered an LLC has already crossed the biggest psychological line in entrepreneurship. Checked at the shortlist tier inside the dossier.

### 5.5 Financial capacity, handled carefully

Two coarse, honest proxies only: the **public salary record** and **years of service**. Used internally to prioritize, **never to exclude**, and **never shown to the prospect**. No consumer data brokers, no credit or property data, ever.

### 5.6 Behavioral intent, once outreach starts

Opens, clicks, replies, and landing-page visits are the cheapest and most accurate signal of all. Anyone who engages is bumped into the deep-enrichment tier automatically. **Intent beats every static signal.**

---

## 6. The Fit Score *(weights locked July 24)*

Every layer above feeds one number: a **0–100 Fit Score** with six inputs.

| Input | Weight | Source |
| :---- | :---- | :---- |
| Grade match (K-6 weighted heavily) | 25 | Existing |
| Teacher type (active / retired / camp-enrichment) | 20 | Existing |
| Subject match (STEM / art / enrichment adjacency) | 15 | Existing |
| Summer availability | 10 | Existing |
| Years of experience | 15 | **New:** certification issue date |
| Certification status | 15 | **New:** state cert lookup |

**Tags are unchanged:** **80+** High Potential · **50–79** Follow-Up · **below 50** Not a Fit.
Every input stays visible in **Show Formula**.

Entrepreneurial signals (TpT, DonorsChoose, LLC, coaching roles) are **deliberately held for the next scoring revision**, after the signal experiments show which of them reliably exist in the data. Scoring on data we do not dependably have would drag scores down with empty zeros.

---

## 7. The AI Research Dossier

For the small group that gets shortlisted or promoted, an AI agent researches the prospect across the open web: certification record, salary record, TpT store, LinkedIn public page, LLC search, local news.

It returns **structured fields plus a three-sentence plain-English summary** a recruiter reads in ten seconds — every field carrying its source link.

Cost: **$0.15–$0.30 per dossier.** Which is exactly why it runs only at the top of the funnel. This is our **Clay replacement**, executed as a Manus background job because a five-source research pass takes minutes, not seconds.

---

## 8. Rules That Govern Everything

- **Waterfall everything.** Cheapest source first; paid sources only on misses; never pay twice for the same field.
- **Test with small money before committing budget.** The $2 that exposed the coaching database and the $1 that settled TpT are the model.
- **Provenance on every field.** Every enriched fact stores where it came from and when. Derived emails are flagged as *derived*.
- **Confidence over volume.** Nothing unverified ever reaches outreach.
- **Freshness windows.** Contact data older than **18 months** is treated as stale and re-checked.
- **Enrich on trigger, never on schedule.** Status changes fire enrichment. Idle records cost nothing.
- **One record per human.** Cross-source matches merge into the existing row; duplicates poison outreach.
- **Public data only, used respectfully.** No login-gated scraping. No consumer data brokers. No skip-trace or people-finder tools, permanently. No LinkedIn bulk sourcing. Financial proxies stay internal and coarse. Scores and dossiers are never shown to prospects. We are building a brand teachers will trust with their savings — the data practices have to match.

---

## 9. Where Things Stand and What Runs Next

| Track | Status |
| :---- | :---- |
| Houston directory sourcing (Manus) | **Running, ahead of expectations.** ~5,900 verified emails in hand from Cy-Fair. Fort Bend in progress (3,000–5,000 more). HISD email derivation queued (~1,000 more). Katy fix, then Spring, Pasadena, Humble, Conroe, Pearland, Alvin — directory check first in each. Trajectory: **10,000–12,000 Houston teachers with usable emails at near-zero cost.** |
| Validation tests (Manus) | **Running.** TEA certification match rate (50 Houston records, by hand) and Hunter email-pattern checks on Houston-area districts. **These two numbers gate the Lovable build.** |
| Next market | **Queued: Austin metro** (Austin ISD, Round Rock, Leander, Pflugerville), repeating the directory-first playbook Houston proved. |
| Lovable Teacher Search upgrade | **Designed, deliberately unbuilt.** Once validation numbers land: build brief goes to development. Order: **email waterfall first**, then **certification enrichment and the new Fit Score**, then **dossier and trigger wiring**. The current feature stays at v1.0 until then. Prove the data first, upgrade once, on evidence. |
| Outreach | **Gated.** SmartLead remains in mailbox warm-up. No teacher receives an email until warm-up completes, compliance requirements land, and their record carries a verified address. |

---

## 10. How This Fits With the Current Lovable App

- The **current** Teacher Search feature in Lovable (v1.0) is unchanged. Everything above describes the **next version**, which is **not being built yet**.
- The current `teacher_prospects` table is already the single source of truth. The upgrade adds fields (verified vs derived email flag, certification issue date, cert status, source provenance) — it does not replace the table.
- The Houston pool imported this week (~1,418 rows so far, with more coming from Cy-Fair and Fort Bend) sits in that same table and will benefit from the upgrade automatically once it ships.
- **The build order, when we start:** email waterfall → certification + new Fit Score → dossier + trigger wiring. Ship in that sequence, not all at once.

---

*Neuron Garage Franchise Development · Expanding Teacher Search and Enrichment — Methodology v1.0 · 2026-07-24. Based on Teacher Prospect Enrichment Methodology v1.3 by Brett Thomas, Integral Associates. Reference doc only — no Lovable build committed until Manus validation numbers land.*
