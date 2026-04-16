

## Onboarding Page Plan

Build the full Onboarding page at `/onboarding` (currently a placeholder). Two views: **dashboard table** → click row → **wizard view** for that franchisee.

### Files to Create

**Data — `src/data/onboardingData.ts`**
- `OnboardingStep` (1–7) with id, title, goal, default tasks, communication trigger
- `Franchisee` interface: id, name, city, state, currentStep, progressPct, daysElapsed, status (`on_track` | `stalled` | `overdue`), startDate, fddSentDate?, stepData (per-step tasks/form/notes/files/completionDate), activity[], comms (sent state per trigger)
- `STEPS` array (7 steps mapped to qualification stages with goals + task lists + form schemas)
- 3 sample franchisees:
  - Sarah Mitchell — Frisco, TX — Step 3 — On Track
  - Marcus Johnson — Tampa, FL — Step 4 — Stalled (mid FDD wait)
  - Patricia Williams — Plano, TX — Step 6 — On Track

**Components — `src/components/onboarding/`**
- `OnboardingTable.tsx` — Table with columns Name, City, Current Step (e.g. "Step 3 / 7"), Progress bar, Days Elapsed, Status badge. Row click → opens wizard. Header has "New Onboarding" orange button.
- `StatusBadge.tsx` — Pill: green `#20c997` / gold `#ffca28` / red `#ff4438`.
- `StepProgressBar.tsx` — 7 connected circles with line. Completed = filled green, current = filled orange `#fd7e14`, upcoming = grey outline. Click circle to jump to that step.
- `OnboardingWizard.tsx` — Full slide-over (`Sheet` side="right", `w-full sm:max-w-4xl`). Contains: back button, header (name + city), `StepProgressBar`, expanded `StepCard` for selected step, `ActivityLog`, `CommunicationTriggers`.
- `StepCard.tsx` — White card showing: step number + title, goal text, `TaskChecklist`, `StepForm` (renders fields based on step), `DocumentUpload` zone, internal notes textarea, completion date input. Step 4 also renders `FddCountdown`. Step 7 also renders "Begin Active Franchisee Onboarding" orange button.
- `TaskChecklist.tsx` — Checkbox list, can toggle complete.
- `StepForm.tsx` — Renders form fields per step schema (Step 1: name/email/phone/source; Step 2: Franchise Lead Sheet — Who/Where/When/Source/Financial/Why/Competition; other steps: simpler note fields).
- `DocumentUpload.tsx` — Dashed-border drop zone "Drop files here or click to upload" + file list (visual only, no real upload).
- `FddCountdown.tsx` — Card showing "FDD sent on [date] — earliest Step 5 date: [date+16 days]" with days-remaining counter.
- `ActivityLog.tsx` — Timeline of events (icon + author + timestamp + content), same visual style as Candidate Pipeline `NotesActivityTab`.
- `CommunicationTriggers.tsx` — Read-only card listing 6 automated emails, each row with name + trigger + Sent/Pending badge.

**Page — `src/pages/Onboarding.tsx`** (replace placeholder)
- State: franchisees list, selected franchisee id, selected step
- Renders header + `OnboardingTable`. When franchisee selected, renders `OnboardingWizard` slide-over.
- "New Onboarding" button → adds a blank franchisee at Step 1 with sonner toast.
- Wraps in full-bleed `#f2f4f6` container matching City Scoring / Teacher Prospects pattern.

### 7 Steps (matched to qualification process)
1. Lead Generation — collects personal info + source
2. Initial Qualification Call — Franchise Lead Sheet
3. Business Overview Call — overview notes + Q&A log
4. FDD & Agreement Review — FDD send date + 16-day countdown
5. Business Immersion & Evaluation — immersion schedule + evaluation notes
6. Confirmation Call — final commitment confirmation
7. Signing Call — signing date + "Begin Active Franchisee Onboarding" button

### Communication Triggers (read-only list)
| Email | Triggers After |
|---|---|
| Welcome Email | Step 1 |
| Process Roadmap | Step 2 |
| Market Analysis | Step 3 |
| FDD Document | Step 4 |
| Congratulations / Franchise Awarded | Step 6 |
| Donut Delivery Note + Onboarding Access | Step 7 |

Status auto-derived from current step's `lastUpdated` vs expected pace.

### Design Tokens
- Page bg `#f2f4f6`, cards white + `1px solid #dee2e6`, headings `#003c7e`, primary button `#fd7e14`
- Status: `#20c997` (on track), `#ffca28` (stalled), `#ff4438` (overdue)
- Step circle: completed `#20c997`, current `#fd7e14`, upcoming outline `#adb5bd`

