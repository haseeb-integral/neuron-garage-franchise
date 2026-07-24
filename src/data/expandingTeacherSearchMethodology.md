# **Teacher Prospect Enrichment — Methodology**

**Version 1.4 · The Definitive Document**  
**Date:** July 24, 2026 · **Prepared by:** Brett Thomas, Integral Associates  
**For:** Sam Reed and Kaylie Reed, Neuron Garage  
**Status:** Current and complete. Supersedes all prior methodology versions. Reflects confirmed database counts as of end of day July 24, 2026\.

## ---

**Executive Summary**

Finding a teacher's name is easy. Knowing whether that teacher is worth recruiting as a franchisee is the hard part. This document describes how we solve the hard part: a system that builds a complete picture of each teacher prospect, using mostly free public data, spending money only on the prospects who earn it.  
**How the system works.** Two platforms, two jobs. The Manus engine finds teachers and proves which data sources we can trust. The Lovable app is where your team holds, scores, and works those teachers: shortlisting, promoting, and launching outreach. Records flow one direction, from Manus into Lovable, which holds the single teacher database. Every enrichment question gets answered across three layers: can we reach them (verified email), are they proven (years of experience from state certification records), and will they invest (evidence of entrepreneurial behavior).  
**The headline results, by the numbers (confirmed in the database, exportable today):**

| Win | The Number |
| :---- | :---- |
| Texas teachers in the database today | **8,073** |
| Of those, with confirmed email addresses | **6,351 (79%)** |
| Largest single source: Cy-Fair ISD, all with verified @cfisd.net emails from published directory pages | **6,251** |
| Houston ISD names with derived emails (firstname.lastname pattern) | **1,272** |
| Additional verified records expected as the Fort Bend scrape completes (running in the background now) | **3,000-5,000** |
| Houston metro trajectory: teachers with usable emails | **11,000-13,000** |
| Raw teacher names banked from state salary records across ten-plus states (future-city raw material) | **\~505,000** |
| Total spent on paid data experiments to learn all of the above | **\~$40** |

**The key insight of the cycle.** The bottleneck is not finding teachers. It is finding the correct URL pattern for each district's staff directory. Once that pattern is confirmed, scraping is fast, free, and produces verified institutional emails. That reframes market expansion: opening Austin is not a research project, it is four URL-pattern hunts (Austin ISD, Round Rock, Leander, Pflugerville), and everything downstream is nearly automatic.  
**What the experiments ruled out, cheaply.** Three paid tools were tested and rejected for about $40 combined: a coaching-staff database that advertised 800,000+ staff records but returned only school-level data with no individual names, Teachers Pay Teachers scrapers that were blocked by anti-scraping defenses and returned product listings rather than seller profiles, and LinkedIn actors rejected on cost and terms-of-service grounds. Each rejection came with a documented reason and a small receipt. That is the discipline: test with small money, keep what proves out, discard what does not.  
**What is decided.** The scoring formula (six inputs, weights locked), the spending rule (paid enrichment only above a Fit Score of 50), the outreach rule (both personal and school email available, recruiter chooses), and the ethical lines (public data only, no data brokers, no skip-trace tools, ever). The Lovable upgrade is fully designed and deliberately unbuilt: two final validation tests are running now, and once those numbers land, the build goes to development with evidence behind every choice.  
**The bottom line:** Manus finds them and proves the data. Lovable holds them and works them. Over eight thousand Texas teachers in the database, sixty-three hundred with confirmed emails, Fort Bend adding thousands more in the background, roughly forty dollars spent, and every number in the system can show its math.

## ---

**1\. What Enrichment Means for Us**

Most people hear enrichment and think "find the email." That is the smallest piece. For our purposes, enrichment means building a complete picture of a person across three layers:

> * **Reachability.** Can we contact them, and on which channel?  
> * **Capability.** Are they actually a strong, experienced teacher with the skills to run a camp?  
> * **Capacity and intent.** Do they have the money, the time, and the appetite to invest in a franchise?

A name with a verified email but no story is a cold call. A name with a verified email, twelve years of K-6 experience, a Teachers Pay Teachers store, and a robotics team they coach is a warm conversation waiting to happen. That second profile is what this methodology produces.

## **2\. The Governing Principle: Spend Follows Score**

> * **Free and near-free enrichment** runs on everybody.  
> * **Cheap paid enrichment** runs only on prospects with a Fit Score of 50 or above (the locked threshold, admin-adjustable).  
> * **Deep enrichment**, the expensive per-person research, runs only on the small group we are about to contact or who have shown interest.

This is exactly how expensive tools like Clay work internally. We rebuilt that logic with tools we already pay for, and the Houston results prove the economics: the free tier alone has already produced more than six thousand confirmed addresses.

## **3\. Layer 1 — Reachability**

### **3.1 The sourcing win that changed the plan: directory-first**

The single biggest finding of the cycle. Some districts publish complete staff directories with every teacher's email on the page. When they do, we get names AND verified addresses in one free pass. Confirmed database counts:

| District | Records in DB | Email Status | Status |
| :---- | :---- | :---- | :---- |
| Cy-Fair ISD (79 campuses) | 6,251 | All with verified @cfisd.net addresses from published mailto links | **Done. Best source found anywhere.** |
| Houston ISD (\~280 schools) | 1,272 | Derived @houstonisd.org emails (firstname.lastname pattern, \~80% derivation confidence, flagged as derived, waterfall verification pending) | Done; verification next |
| Katy ISD | \~98 | Derivable (flastname@katyisd.org, \~75% confidence) | Partial; scraper fix queued |
| YES Prep, Clear Creek ISD, others | \~452 | Mixed | Done |
| **Total Texas in database** | **8,073** | **6,351 with confirmed emails (79%)** | Exportable today |
| Fort Bend ISD (60 schools) | 3,000-5,000 est. | \~100% on the pages (Firecrawl for JavaScript rendering, \~$0.02-0.05 per school) | **Scraping now, in background** |
| Spring, Pasadena, Humble ISDs | — | Unknown | **URL-pattern hunts running now** |
| Conroe, Pearland, Alvin ISDs | — | Unknown | Queued; directory check first |

**The rule this produces:** in every new market, check for published directories with emails before anything else. They are the cheapest teachers we will ever acquire. Austin metro (Austin ISD, Round Rock, Leander, Pflugerville) is the next repeat of this playbook.

### **3.2 The email waterfall (validated, with one refinement)**

For teachers whose emails are not published, three steps, cheapest first:

> 1. **Pattern guess.** District emails follow predictable formats, but the format is district-specific: Cy-Fair, Fort Bend, and Houston ISD use firstname.lastname, while Katy uses first-initial-lastname (flastname@katyisd.org). That is exactly why step one exists: one Hunter Domain Search per district discovers that district's pattern before we generate anything. Derivation confidence runs about 75-80% (hyphenated names, accents, and middle names cause the misses).  
> 2. **Verify.** Every generated guess runs through Hunter's Verifier before it is trusted. Derived emails are flagged as derived in the database and are never used for outreach unverified. The 1,272 derived HISD addresses are in this queue now.  
> 3. **Apollo fallback.** For misses, Apollo's people-match by name plus school. Apollo is also our path to personal emails, LinkedIn URLs, and phone numbers (taken as free byproducts, never a separate workstream).

### **3.3 Which email gets the pitch**

**Both are available; the recruiter chooses.** Personal and school email each surface in the teacher's profile as contact options, selectable per campaign or per prospect. District inboxes filter cold email hard and a franchise decision is made at the kitchen table, so personal will often be the better choice, but the judgment belongs to the recruiter, not the system.

## **4\. Layer 2 — Capability**

Teachers are one of the most publicly documented professions in America. Most of what we need is free.

### **4.1 State certification databases (validation in progress)**

Nearly every state runs a public certification lookup returning certificate type, subject endorsements, grade bands, original issue date, and status. **The issue date alone gives us years of experience.** This is the single richest free source for the "experienced with a track record" requirement, and almost nobody in recruiting uses it systematically. Texas is the pilot: a 50-record hand-check of Houston teachers against the TEA lookup is running now to confirm the match rate before we build at scale. The TEA site requires browser navigation, so scale runs happen in Manus as batch jobs.

### **4.2 Public salary and payroll records (505,000 names banked)**

Teacher salaries are public record in most states. One record confirms current employment, maps salary steps to tenure, and provides a real income figure for the capacity assessment. State salary files have already seeded roughly 505,000 teacher names across ten-plus states (FL, NY, IN, IL, MI, KS, GA, OH, WA, and others) into the Manus pool. No emails, but that is the raw material bank for every future city: when we open a new market, we already hold its teachers' names.

### **4.3 LinkedIn (tested and demoted)**

Testing overturned our early assumption. As a discovery channel LinkedIn failed: a live test returned just 48 usable records, elementary teachers barely use the platform, search precision for K-6 is poor, terms-of-service risk is real, and cost per usable record is high next to free directory scraping. LinkedIn is now shortlist-tier enrichment only, used sparingly to verify employment or career history on prospects who already scored well, starting with Apollo's employment fields that come free with matches we already pay for.

### **4.4 Recognition records**

Award pages, National Board Certification, grants, and local news mentions are public, crawlable, and double as outreach personalization ("Congratulations on the 2024 district award" is a first line that gets replies). These run as research steps inside the AI dossier for shortlisted prospects, not as standalone pipelines. School-quality ratings on our existing NCES anchor are deferred until the new Fit Score has run on real data.

## **5\. Layer 3 — Capacity and Intent**

This is where we go beyond anything an off-the-shelf tool provides.

### **5.1 Teachers Pay Teachers (tested and reclassified)**

The test settled a key question. TpT's anti-scraping defenses blocked profile scrapers, returned product listings rather than seller profiles, and only about a quarter of sellers use their real name as their store name with no location data. So TpT cannot *find* us new teachers, but it can *confirm* entrepreneurial behavior on teachers we already have: store existence, product count, follower and rating volume. A seller with 400 products and 10,000 followers is running a real business. This check runs at the shortlist tier, and scraping is paused until a better tool for seller profiles emerges. Outschool and tutoring platforms are queued behind it as similar signal checks.

### **5.2 DonorsChoose (tested; supplementary signal)**

Free public API returning real teacher names tied to real schools, and a teacher with funded STEM or maker projects has demonstrated initiative, grant-writing ability, and subject alignment with Neuron Garage. Field testing tempered the initial enthusiasm: coverage is sparse because most teachers never post projects, and API rate limits restrict bulk collection. **Verdict: a valuable supplementary signal and Fit Score input, not a primary discovery source.**

### **5.3 The coaching-staff database (tested and rejected, cheaply)**

A paid database advertising 800,000+ school staff records was tested three ways. Every run returned school-level records only: names of schools, addresses, mascots, athletic conferences. No individual staff, despite the product's claims. Rejected, and a good illustration of why we test with small money before committing budget.

### **5.4 Business registrations**

Secretary of State searches are free and public. A teacher who has registered an LLC has already crossed the biggest psychological line in entrepreneurship. Checked at the shortlist tier inside the dossier.

### **5.5 Financial capacity, handled carefully**

Two coarse, honest proxies only: the public salary record and years of service. Used internally to prioritize, never to exclude, and never shown to the prospect. No consumer data brokers, no credit or property data, ever.

### **5.6 Behavioral intent, once outreach starts**

Opens, clicks, replies, and landing-page visits are the cheapest and most accurate signal of all. Anyone who engages is bumped into the deep-enrichment tier automatically. Intent beats every static signal.

## **6\. The Fit Score (weights locked July 24\)**

Every layer above feeds one number: a 0-to-100 score with six inputs.

| Input | Weight | Source |
| :---- | :---- | :---- |
| Grade match (K-6 weighted heavily) | 25 | Existing |
| Teacher type (active / retired / camp-enrichment) | 20 | Existing |
| Subject match (STEM / art / enrichment adjacency) | 15 | Existing |
| Summer availability | 10 | Existing |
| Years of experience | 15 | New: certification issue date |
| Certification status | 15 | New: state cert lookup |

Tags are unchanged: 80+ is High Potential, 50-79 is Follow-Up, below 50 is Not a Fit. Every input stays visible in Show Formula. Entrepreneurial signals (TpT, DonorsChoose, LLC, coaching roles) are deliberately held for the next scoring revision, after the signal experiments show which of them reliably exist in the data; scoring on data we do not dependably have would drag scores down with empty zeros.

## **7\. The AI Research Dossier**

For the small group that gets shortlisted or promoted, an AI agent researches the prospect across the open web: certification record, salary record, TpT store, LinkedIn public page, LLC search, local news. It returns structured fields plus a three-sentence plain-English summary a recruiter reads in ten seconds, every field carrying its source link. Cost runs $0.15 to $0.30 per dossier, which is exactly why it runs only at the top of the funnel. This is our Clay replacement, executed as a Manus background job because a five-source research pass takes minutes, not seconds.

## **8\. Rules That Govern Everything**

> * **Waterfall everything.** Cheapest source first; paid sources only on misses; never pay twice for the same field.  
> * **Test with small money before committing budget.** Roughly $40 of experiments this cycle ruled out three paid tools and validated the free playbook. That ratio is the model.  
> * **Provenance on every field.** Every enriched fact stores where it came from and when. Derived emails are flagged as derived.  
> * **Confidence over volume.** Nothing unverified ever reaches outreach.  
> * **Freshness windows.** Contact data older than 18 months is treated as stale and re-checked.  
> * **Enrich on trigger, never on schedule.** Status changes fire enrichment. Idle records cost nothing.  
> * **One record per human.** Cross-source matches merge into the existing row; duplicates poison outreach.  
> * **Public data only, used respectfully.** No login-gated scraping. No consumer data brokers. No skip-trace or people-finder tools, permanently. No LinkedIn bulk sourcing. Financial proxies stay internal and coarse. Scores and dossiers are never shown to prospects. We are building a brand teachers will trust with their savings; the data practices have to match.

## **9\. Where Things Stand and What Runs Next**

| Track | Status |
| :---- | :---- |
| Houston directory sourcing (Manus) | **Running in the background, ahead of expectations.** 8,073 Texas teachers in the database, 6,351 with confirmed emails, fully exportable. Fort Bend scraping now (3,000-5,000 more expected). Spring, Pasadena, and Humble URL-pattern hunts underway. Katy fix, then Conroe, Pearland, Alvin, directory check first in each. Trajectory: 11,000-13,000 Houston teachers with usable emails at near-zero cost. |
| Validation tests (Manus) | **Running.** TEA certification match rate (50 Houston records, by hand) and Hunter email-pattern checks on Houston-area districts. These two numbers gate the Lovable build. HISD's 1,272 derived emails also queue for waterfall verification. |
| Next market | **Queued: Austin metro** (Austin ISD, Round Rock, Leander, Pflugerville), repeating the directory-first playbook Houston proved. Four URL-pattern hunts, not a research project. |
| Lovable Teacher Search upgrade | **Designed, deliberately unbuilt.** Once validation numbers land: build brief goes to development. Order: email waterfall first, then certification enrichment and the new Fit Score, then dossier and trigger wiring. The current feature stays at v1.0 until then. Prove the data first, upgrade once, on evidence. |
| Outreach | **Gated.** SmartLead remains in mailbox warm-up. No teacher receives an email until warm-up completes, compliance requirements land, and their record carries a verified address. |

*Neuron Garage Franchise Development · Teacher Prospect Enrichment Methodology v1.4 · July 24, 2026 · Prepared by Integral Associates · Supersedes v1.0 through v1.3.*