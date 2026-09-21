# **Teacher Record Enrichment — Methodology**

*(Previously titled "Expanding Teacher Search and Enrichment". Same document, new name.)*

**Version 2.0 · Two-City Proof (Houston + Austin)**
**Date:** September 21, 2026 · **Prepared by:** Brett Thomas, Integral Associates, with Manus
**For:** Sam Reed, Kaylie Reed and Skyler, Neuron Garage
**Status:** Current. Supersedes version 1.4 (July 24, 2026). Reflects the Houston and Austin enrichment runs and how the results now appear inside the Lovable app.

---

## **Executive Summary**

Finding a teacher's name is easy. Knowing whether that teacher is worth recruiting as a franchisee is the hard part. The system now does both, in three layers, for under **$1 of data cost per city**.

| Combined result, two cities | Total |
| :---- | :---- |
| K-6 teacher records | **15,684** |
| Verified contacts with work email | **14,258** |
| Teachers with outreach hooks or project evidence | **~573** |
| Teachers with entrepreneurial signal flags | **~297** |
| Total data cost across both cities | **under $2** |

Manus finds and proves the data. Lovable holds it, shows it, and works it. Records flow one direction: Manus → Lovable.

---

## **1. The Three Layers**

**Layer 1 — Contact verification.** Crawl official district staff directories to confirm name, work email, school, district, grade and job title. One directory gives thousands of verified records in a single pass. Cost: $0.

**Layer 2 — Outreach hooks.** Pull DonorsChoose project pages, district newsroom recognition articles, education-foundation grant lists and campus club rosters. These give the recruiter a personal opening line. Cost: $0.

**Layer 3 — Qualification signals.** Screen the roster against state licensing databases, curriculum seller platforms, tutoring marketplaces and business filings to find teachers already building something on the side. Cost: $0 to $100 per city.

> **Layer 3 is where the value lives. Layers 1 and 2 are prerequisites, not the deliverable.**

---

## **2. Results: Two-City Proof**

### Houston (completed August 2026)

| Metric | Result |
| :---- | :---- |
| Total elementary teacher records | **10,755** |
| Verified contacts (name + email + school + district) | **9,366** |
| Teachers with confirmed role and grade | **3,012** |
| Teachers with outreach hooks | **~150** |
| Teachers flagged with entrepreneurial signals | **209** |
| Data cost | **< $1** |

### Austin (completed September 2026)

| Metric | Result |
| :---- | :---- |
| Audited K-6 teacher records | **4,929** |
| Verified contacts | **4,892 (99.2%)** |
| Export-ready deduplicated contacts | **4,736** |
| Teachers with any verified enrichment fact | **2,303** |
| Source-cited evidence facts | **3,069** |
| HIGH verified outreach hooks | **665 facts / 423 teachers** |
| DonorsChoose teachers with verified projects | **270** |
| Entrepreneurial signal flags (insurance + real estate) | **102 flags / 88 teachers** |
| Data cost | **< $1** |

---

## **3. Source Performance Across Both Cities**

| Source | Houston | Austin | Verdict |
| :---- | :---- | :---- | :---- |
| District directories | 9,366 contacts | 4,892 contacts | Best source. Free. Proven twice. |
| DonorsChoose | 39 (50-school pilot) | 480 facts / 270 teachers (full 118-school pass) | Strongest hook source. Always run the full pass. |
| TDI insurance licences | 208 flags | 32 flags | Top entrepreneurial signal. Free, statewide. |
| TREC real estate | 1 flag | 70 flags | Strong in Austin. Re-filter by county. |
| Education foundation grants | 3 recipients | 46 recipients | City-specific. Find the local foundations. |
| Awards and recognition | 84 facts | 131 facts | Hooks, not qualification signals. |
| Teachers Pay Teachers | 3 sellers | 0 | Market dependent. Test, do not rely on. |
| Wyzant / Superprof | 125+ found | 0 matched | Market dependent. |
| TDLR occupational licences | — | 0 of 49,846 rows | Documented zero-yield source. |

---

## **4. The Confidence System**

### Directory sources (Layer 1)

- **HIGH** — official district email match, or full name + exact school + district. Auto-merge.
- **MEDIUM** — full name + school/city, or full name + district + role. Review queue.
- **LOW** — name + city only. Discard.

### Non-directory sources (Layers 2 and 3)

Licences, tutoring profiles and seller pages happen outside the school system, so they structurally cannot confirm a school assignment. Requiring a school-level bridge guarantees zero results. This was proven in Houston, where 208 valid insurance matches were first thrown away, and again in Austin, where a hardcoded Houston city filter produced a false zero.

- **HIGH MEDIUM** — first + last name + metro city match, surname not in the top-20 most common. Import as flagged.
- **LOW MEDIUM** — same match, but a common surname. Import as flagged; verify with an automated LinkedIn check ($0.004 per profile) before outreach.
- **LOW** — last name only, or a city outside the approved metro list. Discard.

For any MEDIUM match with a high-value signal (registered LLC, active TpT store), the LinkedIn check promotes it to HIGH automatically. This replaces human review at scale.

---

## **5. City-to-City Retooling (the critical lesson)**

Layer 1 transfers cleanly between cities. **Layer 3 does not.** Run this 7-step checklist before the signal layer launches in any new city. Total time: 3 to 5 hours.

1. Update the approved metro city list for every city-filtered source.
2. Re-filter state licence data (TDI, TREC, TDLR) for the new metro counties.
3. Re-run seller and marketplace searches with new city parameters.
4. Run new Apify searches (Wyzant, Superprof) for the new city.
5. Run the DonorsChoose **full** school pass, not a pilot.
6. Rebuild the local news allowlist and find city-specific institutional sources (education foundations, grant programmes).
7. Confirm the MEDIUM confidence standard is active (name + city = flagged, no school bridge for non-directory sources).

---

## **6. Operational Sequence per City**

| Phase | Timeline | Work | Deliverable |
| :---- | :---- | :---- | :---- |
| Phase 1 | Days 1-3 | Directory crawl, Source Atlas recipes, certification lookup, dedupe | Verified contact list |
| Phase 2 | Days 3-5 | DonorsChoose full pass, newsrooms, campus crawl, foundation grants | Outreach hooks |
| Retooling | Day 5 (3-5 hrs) | The 7-step checklist above | Layer 3 ready |
| Phase 3 | Days 5-7 | Licence screening, marketplaces, business filings, LinkedIn verification | Entrepreneurial flags |

---

## **7. Cost Model**

| Item | Cost | Note |
| :---- | :---- | :---- |
| Layer 1 directory crawl | $0 | Public pages |
| Layer 2 hooks | $0 to $10 | Firecrawl + Google Maps |
| Layer 3 licence re-filtering | $0 | Statewide data, just re-filter |
| Layer 3 business filings | $1 one-time | Covers all cities in the state |
| Layer 3 Apify searches | $5 to $15 | Per-city |
| LinkedIn verification | $2 to $5 | $0.004 per profile |
| Optional email gap-fill | $50-60/mo | Covers all cities |

Proven across two cities: under $2 total. Projected per city with the full stack: $10 to $100.

---

## **8. How This Shows Up in the App**

Every enriched teacher is placed in one of three tiers on the Teacher Search screen. The tier is worked out from the signals on the record, not entered by hand.

| Tier | Meaning | How to use it |
| :---- | :---- | :---- |
| **Tier 1 — Entrepreneurial signal** | A second professional licence or side business matches this teacher's name and city | Call first, most personalised message |
| **Tier 2 — Outreach hook** | A verified project, grant, award or leadership fact | Open the email with the specific detail |
| **Tier 3 — Verified contact** | Name, email, school, district and grade confirmed | Professional outreach, segment by school and grade |

On the teacher list, each row shows an amber **Side business** chip (with its confidence) and a green hook chip in plain words, for example "Ran a funded classroom project (DonorsChoose)". The **Signals** filter lets the team show only Tier 1, only Tier 2, or only MEDIUM-confidence matches.

Open a teacher and the **Enrichment & Signals** panel shows:

- the tier banner and what it means,
- each entrepreneurial signal as its own card — what it is, the licence detail, the source, a confidence badge, what that confidence means in plain words, the match basis, and a clickable source link,
- verified facts listed in plain English underneath, kept visually separate.

**Verified evidence and secondary (MEDIUM/LOW) signals are never combined into one number and never turned into an automatic franchise score.** They are review context for the recruiter.

### Import rules the app follows

- One teacher list for every city. Austin, Houston and future cities go into the same pool.
- `dedupe_key` from Manus is the unique import key; matching falls back to email, then name + city + state. Never name alone.
- The standard 27-column City/Metro export is recognised automatically — no manual column mapping.
- A blank cell never erases a value we already hold.
- Signal detail, source link, confidence and match basis are written to the evidence store per signal, so nothing is flattened into a count.
- The separate one-row-per-signal sprint file is blocked from the main import, because it would duplicate teacher rows.

---

## **9. Lessons Learned**

**From Houston (the laboratory)**

1. District directories are the best free source. Find the URL pattern and the whole district opens up.
2. Per-teacher searching is low yield. Source-first population pulls are far more efficient.
3. The strict identity standard threw away 208 valid licence matches. Name + city = MEDIUM flagged must be the starting standard everywhere.
4. Awards are outreach hooks, not qualification signals.
5. The free TDI insurance database was the single most productive signal source.

**From Austin (the first replication)**

6. Layer 1 replicated cleanly: 4,929 records at 99.2% email coverage.
7. Layer 3 did not replicate. A hardcoded Houston city filter produced a false zero, Apify searches were not re-run, and the confidence standard reverted to strict. All three had to be caught by hand.
8. Local education foundations produced 46 named grant recipients versus Houston's 3. Thirty minutes of discovery, very high value.
9. DonorsChoose as a full pass beat the pilot 12 to 1.

---

## **10. Next Steps**

**Immediate.** Run LinkedIn verification ($0.004 per profile) on the 297 combined Houston and Austin flags. Re-run the Houston signal layer — the Houston file we imported carried no signal data, so those 209 flags are not yet in the app.

**This month.** Secretary of State business filing searches across all Texas cities. A teacher who registered an LLC is the strongest franchise-fit signal available.

**Next two weeks.** Apply the full three-layer methodology to San Antonio using the retooling checklist from day one. Begin Phoenix and Charlotte district discovery.

**Cold email.** Launch outbound using the three-tier structure and measure reply rate by tier to validate the enrichment investment.

**October.** Scale to all ten target cities.
