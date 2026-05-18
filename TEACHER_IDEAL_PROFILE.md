# TEACHER_IDEAL_PROFILE.md — Neuron Garage

> Created: May 18, 2026
> Author: Dev Lead
> Source: May 15 meeting decisions + neurongarage.com website analysis
> Status: ACTIVE — read this before building Teacher Search, seeding the database, or writing AI fit scoring prompts

---

## What This File Is

This file defines exactly who Neuron Garage is trying to recruit as a franchise location director. It exists so that every AI agent, developer, and team member working on this codebase understands the business purpose behind the teacher database — not just the schema.

This is the difference between seeding 100,000 random teachers and seeding 100,000 **high-fit candidates** who actually convert.

---

## What Neuron Garage Is

Neuron Garage is a summer camp franchise for children ages 5–12 (K–6th grade). Campers do hands-on building challenges with recycled materials to develop a **growth mindset**. The camp runs June through mid-August, 8:30am–5:30pm daily.

Founded by Kaylie and Sam Reed in Austin, Texas in 2015. Expanding nationally starting summer 2026 by recruiting independent educator-franchisees to run their own Neuron Garage locations.

**From their website:**
> *"We are looking for Purpose Driven Educators to Join Our Mission. Bring the transformational Neuron Garage experience to your community!"*
> *"Make meaningful money this summer leveraging your passion and talents."*
> *"Each of our locations is run by an experienced educator with years of classroom experience who believes strongly in the importance of a growth mindset."*

---

## Who We Are Recruiting (The Franchisee)

The person Neuron Garage recruits through this SaaS tool is the **Location Director** — the franchisee who will own and operate a Neuron Garage camp in their city. This is NOT the camp counselor/guide (those are hired locally by the franchisee).

The Location Director:
- Runs the camp all summer (June–August)
- Delivers the Neuron Garage curriculum
- Hires and manages their own camp guides locally
- Pays a franchise fee / revenue share to Neuron Garage
- Is supported by Kaylie's team with curriculum, training, marketing, and systems

---

## Target Teacher Segments

> ⚠️ **Important note:** This scope is a strong starting point based on the May 15 meeting and Neuron Garage website analysis. The scope of teacher types can be **expanded or reduced** as Kaylie and Sam refine the recruiting strategy. Do not hardcode this as permanent — the fit scoring system is designed to be adjustable.

### Segment 1: Active Elementary School Teachers ✅ (Confirmed in May 15 meeting)

**Who:** Currently employed K–6 classroom teachers at public, private, or charter schools.

**Why they fit:**
- Summers are free — the camp runs June through August, exactly when they are off
- Already work with the exact age group Neuron Garage serves (K–6)
- Understand child development, behavior management, and classroom structure
- Growth mindset language resonates immediately — many already teach it
- Have the credibility and experience Neuron Garage requires in a director

**Best sub-profiles within this segment:**
- STEM, maker, art, design, or project-based learning teachers → highest fit (camp is hands-on building)
- Teachers who run after-school clubs, maker spaces, or enrichment programs → high fit
- Grade levels K–5 preferred (direct match to Tinkerers K–2 and Mechanics 3–6 programs)
- 5+ years experience preferred for director role credibility

### Segment 2: Retired Elementary School Teachers ✅ (Confirmed in May 15 meeting — Kaylie's addition)

**Who:** Former K–6 teachers who have retired from classroom teaching.

**Why they fit:**
- 100% available in summer — no school-year commitment
- Deep experience and credibility — exactly what the director role needs
- Often want purposeful work and community connection in retirement
- Summer income is a strong motivator
- Growth mindset aligns with values they built a career around

**Source challenge:** Harder to find in Apollo/LinkedIn (no current employer). Best found via:
- LinkedIn alumni searches ("retired teacher" + city)
- Vendor lists with retirement flag
- DonorsChoose historical records
- Local teacher association networks

### Segment 3: Summer Camp Teachers / Enrichment Teachers ✅ (Added May 18)

**Who:** Teachers or educators who already work at summer camps, enrichment programs, maker spaces, children's museums, after-school programs, or similar youth education settings.

**Why they fit:**
- Already proven in a camp/enrichment environment — lowest learning curve
- Understand the operational side of running a children's program
- Often entrepreneurial by nature (many run their own programs)
- Strong alignment with Neuron Garage's hands-on, project-based model

**Examples of roles to include:**
- Summer camp director or coordinator
- Enrichment program teacher (STEM, arts, coding, robotics)
- Maker space facilitator
- Children's museum educator
- After-school program director
- Youth program coordinator at a YMCA, library, or community center

**Source:** Apollo (search "camp director", "enrichment teacher", "maker space"), LinkedIn, Apify (summer camp staff pages)

### Segment 4: Middle / High School STEM, Maker, Shop, Art Teachers ✅ (Added May 18 — secondary tier)

**Who:** Currently employed middle-school or high-school teachers whose subject is hands-on: STEM, engineering, robotics, shop, maker, computer science, design, or visual/studio art.

**Why they fit (as a secondary tier, ranked below K–6 and retired):**
- Summers are free — same school calendar as elementary teachers
- Hands-on subject expertise maps directly to Neuron Garage's recycled-materials building model
- Many already moonlight at summer camps and enrichment programs (camp-staff pipeline)
- Often more comfortable than K–6 teachers with tools, fabrication, and open-ended project work
- The website only locks **campers** at K–6; it does **not** require the Location Director to be an elementary teacher ("Each of our locations is run by an experienced educator with years of classroom experience")

**How to weight them:** Lower base weight than K–6 / retired, but **boosted by hands-on subject match**. A high-school robotics teacher should outrank a K–6 generalist with no STEM/maker signal. A high-school English-only teacher should rank low.

**Source:** Apollo (search "high school STEM teacher", "robotics teacher", "shop teacher", "maker teacher", "art teacher" + city), LinkedIn, school staff pages via Firecrawl.

---

## Fit Scoring Criteria

The AI fit score (1–100) stored in `teacher_prospects_master.fit_score` should weight these signals:

### Strong positive signals (high weight)
| Signal | Reasoning |
|---|---|
| Currently teaches or has taught K–6 | Direct match to camp age group |
| Subject: STEM, maker, engineering, art, design | Camp is hands-on building — these teachers get it immediately |
| Has run a summer camp, after-school program, or maker space | Proven in the exact environment |
| Retired teacher | 100% summer available, high experience |
| Summer camp educator (any role) | Already in the ecosystem |
| Posted on DonorsChoose | Mission-driven signal — invests personal time/energy in kids |
| 5+ years teaching experience | Director role credibility |
| Instructional coach or curriculum specialist | Growth mindset is their professional vocabulary |

### Moderate positive signals (medium weight)
| Signal | Reasoning |
|---|---|
| Subject: general elementary, science, social studies | Broad fit, not as specific as STEM/maker |
| Grade level 3–6 (Mechanics program age) | Good match, slightly more structured fit |
| School counselor or psychologist background | Growth mindset expertise |
| 3–5 years experience | Decent experience, not yet at director threshold |

### Neutral / lower fit signals (low weight)
| Signal | Reasoning |
|---|---|
| High school teacher only | Camp is K–6, no direct age-group experience |
| Subject: purely academic (math, English, history) | Less hands-on, may need more convincing |
| Less than 3 years experience | Not enough experience for director role |
| College student studying education | Better fit as camp guide, not director |

---

## Search Query Templates for Apollo / Vendor Lists

Use these exact-phrase searches when pulling teacher records:

**For active elementary teachers:**
- `"elementary school teacher" + [city, state]`
- `"K-5 teacher"` or `"K-6 teacher"` + [city]
- `"2nd grade teacher"`, `"3rd grade teacher"`, `"4th grade teacher"` + [city]
- `"STEM teacher" elementary` + [city]
- `"maker space" teacher` + [city]
- `"project based learning" teacher` + [city]

**For retired teachers:**
- `"retired teacher"` + [city]
- `"former elementary teacher"` + [city]
- LinkedIn: past title = teacher, current = retired/consultant

**For summer camp / enrichment educators:**
- `"summer camp director"` + [city]
- `"camp coordinator"` + [city]
- `"enrichment teacher"` + [city]
- `"after school program director"` + [city]
- `"youth program coordinator"` + [city]
- `"maker space facilitator"` + [city]
- `"children's museum educator"` + [city]

---

## What This Is NOT

- We are NOT recruiting camp guides/counselors (college students). The franchisee hires those locally.
- We are NOT recruiting high school teachers as the primary target (wrong age group).
- We are NOT recruiting school administrators (principals, superintendents) as the primary target — though they are high fit if they have classroom background.
- This scope is a **starting point** — Kaylie may expand to middle school teachers, school counselors, or other educator profiles as the program grows.

---

## References
- May 15 meeting notes → `MAY15_MEETING_NOTES.md`
- Database schema → `DATABASE_LAYER_SPEC.md`
- Open tasks → `OPEN_TASKS.md`
- Neuron Garage website → https://neurongarage.com
- Franchise page → https://neurongarage.com/launch-your-own-neuron-garage
- Jobs page → https://neurongarage.com/counselor-jobs/
