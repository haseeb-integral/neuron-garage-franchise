# Neuron Garage QA_CHECKLIST.md

This file is a simple non-technical checklist for reviewing screens before approving or merging changes.

Use this before telling Lovable, ChatGPT, Codex, or a contractor that a screen is approved.

---

## 1. Quick Approval Rule

A screen is ready only when it passes three checks:

```text
1. It looks consistent with DESIGN.md.
2. It follows WORKFLOW.md.
3. Every visible button does something clear.
```

If any of these fail, do not approve yet.

---

## 2. Visual Design Checklist

Check the screen visually.

- [ ] Page background is white or almost white.
- [ ] Main cards are white.
- [ ] Borders are very light and thin.
- [ ] Primary buttons are blue, not orange.
- [ ] Orange is only used for pending/warning states.
- [ ] Text is readable and not too small.
- [ ] Table rows are compact and not oversized.
- [ ] Chips/badges are small and do not dominate the row.
- [ ] Filters are aligned and do not wrap badly on desktop.
- [ ] Cards have enough breathing room but are not huge.
- [ ] There is no large unused empty space.
- [ ] Right-side insight panels align reasonably with the main table/work area.
- [ ] The screen does not look like a generic AI/purple-gradient app.

---

## 3. Workflow Checklist

Check whether the screen belongs in the correct product flow.

Correct flow:

```text
City Search → Teacher Prospects → Email Outreach → Candidate Pipeline → Onboarding
```

- [ ] City Search sends the user to Teacher Prospects.
- [ ] Teacher Prospects can send selected prospects to Email Outreach.
- [ ] Email Outreach can promote interested replies to Candidate Pipeline.
- [ ] Candidate Pipeline can move qualified candidates toward Onboarding.
- [ ] Onboarding is only for signed/approved franchisees.

---

## 4. Button and Action Checklist

Every visible button should do one of these:

```text
Open a modal/drawer
Navigate to the right screen
Run a safe local/sample action
Export/download data
Show a clear MVP toast
```

Check:

- [ ] No button silently does nothing.
- [ ] No button triggers paid APIs automatically unless explicitly approved.
- [ ] No button sends real emails automatically unless explicitly approved.
- [ ] Toast-only behavior is acceptable only for MVP placeholders.
- [ ] If a button is placeholder behavior, the toast clearly says what will be connected later.

Good MVP toasts:

```text
Sample replies synced. SmartLead sync will be connected later.
Sample data refreshed. Live source refresh will be connected later.
CSV export will be connected with live source data.
```

Bad MVP toasts:

```text
Done.
Success.
Clicked.
```

---

## 5. Data Safety Checklist

Before approving any change:

- [ ] No API keys are visible in code.
- [ ] No API keys are pasted into GitHub files.
- [ ] No Supabase secrets are exposed.
- [ ] No `.env` file with real secrets is committed.
- [ ] Paid APIs are not called automatically.
- [ ] Live scraping is not triggered automatically.
- [ ] Real email sending is not triggered automatically.
- [ ] Any API-related behavior uses environment variables only.

---

## 6. Navigation Checklist

- [ ] Sidebar order follows the workflow.
- [ ] Active sidebar item is correct.
- [ ] Page title matches the selected screen.
- [ ] Back/change actions make sense.
- [ ] CTAs lead to the next logical workflow step.

Correct sidebar order:

```text
Dashboard
City Search
Teacher Prospects
Email Outreach
Candidate Pipeline
Onboarding
Team Members
Settings
```

---

## 7. Table Checklist

For any table screen:

- [ ] Header labels are clear.
- [ ] Rows are not too tall.
- [ ] Badges/chips are compact.
- [ ] Sorting/filtering labels make sense.
- [ ] Pagination is visible if needed.
- [ ] Row click opens the correct detail drawer.
- [ ] Row action menu has real actions.
- [ ] Selecting rows does not cause ugly UI shift.
- [ ] Closing a detail drawer does not leave the wrong row selected.

---

## 8. Drawer / Modal Checklist

For drawers and modals:

- [ ] White background.
- [ ] Light border.
- [ ] Clean header.
- [ ] No orange legacy styling unless warning/pending.
- [ ] Close button works.
- [ ] Primary action is blue.
- [ ] Fields are grouped logically.
- [ ] It does not feel cramped or too empty.

---

## 9. City Search Checklist

- [ ] Ranked Markets appears correctly.
- [ ] Selected Market detail panel appears correctly.
- [ ] Right insight cards align with the main row.
- [ ] Find Teachers in This Market goes to Teacher Prospects with market context.
- [ ] Compare Mode works safely.
- [ ] Add Criteria has a visible result.
- [ ] Report preview opens safely.
- [ ] Export uses sample/current visible data or a clear MVP toast.

---

## 10. Teacher Prospects Checklist

- [ ] Title shows selected market, such as Frisco, TX Teacher Prospects.
- [ ] Market Context card appears.
- [ ] Teacher table shows enough rows to avoid awkward empty space.
- [ ] Fit Tag filter has visible matching Fit Tag chips in the table.
- [ ] Profile drawer opens and matches the white/blue design.
- [ ] Promote to Pipeline works.
- [ ] Promoted teacher remains visible with a Promoted badge.
- [ ] Duplicate promotion is disabled.
- [ ] Change Market / Find Prospects action is clear.
- [ ] Export CSV works or shows a clear MVP message.

---

## 11. Email Outreach Checklist

- [ ] Screen sits between Teacher Prospects and Candidate Pipeline.
- [ ] It acts like a campaign control center.
- [ ] It does not send real emails automatically in MVP.
- [ ] Campaign cards show useful sample data.
- [ ] Outreach table shows email status, engagement, reply status, and action.
- [ ] Interested replies can be promoted to Candidate Pipeline.
- [ ] Sync Replies uses mock/safe behavior until SmartLead/GHL is connected.
- [ ] Real sending engine is treated as SmartLead or GHL, not Lovable itself.

---

## 12. Candidate Pipeline Checklist

- [ ] Only interested/promoted people appear as candidates.
- [ ] Stages represent qualification, not cold prospecting.
- [ ] Candidate cards are compact and readable.
- [ ] Stage movement works.
- [ ] Notes/actions are clear.
- [ ] Candidate can eventually move to Onboarding.

---

## 13. Onboarding Checklist

- [ ] Onboarding is for signed/approved franchisees only.
- [ ] Tasks/documents/checklists are clearly grouped.
- [ ] Progress is visible.
- [ ] Statuses are clear.
- [ ] It does not duplicate Candidate Pipeline functionality.

---

## 14. Final Approval Statement

Before merging, the reviewer should be able to say:

```text
This screen follows the Neuron Garage workflow, matches DESIGN.md, has safe MVP behavior, and has no exposed secrets or paid API calls.
```

If that sentence is not true, do not merge yet.
