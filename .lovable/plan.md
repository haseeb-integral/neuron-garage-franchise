## Scope

Tiny, surgical. Two changes, no logic.

### 1. Hide "Find via Apify" button
- `src/pages/TeacherProspects.tsx` — remove the `<Button>` that opens `setFindOpen(true)` from the header (lines ~384-386).
- Keep `FindProspectsModal` import and `findOpen` state commented-out / removed so the modal file stays untouched on disk (reversible — just re-add the button).
- No other behavior changes. Export CSV / Import CSV remain.

### 2. Document what was hidden + what we learned
Per the "remember what we hide" rule, append to `LATER.md`:
- **Hidden: "Find via Apify" button** on Teacher Search header (May 20). Modal code still lives in `src/components/teacher-prospects/FindProspectsModal.tsx`. Re-enable by restoring the button in `TeacherProspects.tsx`. Reason: unclear if Apify-from-scored-cities flow is still wanted; Kaylie/Sam haven't asked for it in current sprint.
- **Decision: filter-scoped stats stay as-is.** Stat cards (Total Imported / Email-Ready / Needs Enrichment) reflect the active source filter. User confirmed this is the desired behavior — numbers should never lie about what's currently shown.
- **Clarification logged:** the "wrong numbers" reported on May 20 (1,927 total / 0 email-ready / 1 source) were caused by the LinkedIn Import filter being active — not a regression from the previous execution. DB had 11,752 rows at the time.

### 3. Doc-sync drafts (Mode A — wait for "go" before writing)
After the code change, draft one-liners for:
- `OPEN_TASKS.md` — mark "Wire row actions to real writes" + "Surface Title/School-URL/LinkedIn columns" as ✅ done (from previous turn).
- `PROJECT_CONTEXT.md` — note `outreach_queue` table exists; Teacher Search columns now include Title, School URL, LinkedIn, City, Source, In-Outreach badge.
- No write until you say "go."

## Out of scope
- Renaming/removing the Apify modal file.
- Any change to stats RPC.
- Any change to filter UX.

## Risk
Low. One JSX block removed. Easily undone.
