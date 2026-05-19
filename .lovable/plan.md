## Fix SmartLead "min_time_btw_emails ≥ 3" error + auto-name campaigns

### What's wrong
`NewCampaignDrawer.tsx` defaults **Min gap between emails** to `1` minute and the validator allows `1–180`. SmartLead's `/campaigns/{id}/schedule` rejects anything `< 3`, so the launch fails with the 400 you saw.

### Changes (frontend only, single file: `src/components/email-outreach/NewCampaignDrawer.tsx`)

1. **Enforce SmartLead's floor of 3 min**
   - `useState(minGapMinutes)` default → `5`
   - Validator → `if (minGapMinutes < 3 || minGapMinutes > 180) return "Min gap must be between 3 and 180 minutes (SmartLead requirement)."`
   - Clamp on send → `Math.max(3, Math.min(180, minGapMinutes))`
   - Input `min={3}`, helper text "SmartLead minimum is 3 minutes."

2. **Auto-generated default campaign name**
   - Helper `defaultCampaignName()` → `"Outreach · {MMM-DD} · {HH:mm} {TZ-abbr} · v{n}"`  
     e.g. `Outreach · May-19 · 22:45 PKT · v1`
   - On drawer open (`useEffect` watching `open`), if `name` is empty, prefill via `setName(defaultCampaignName())`.
   - `v{n}` increments using `localStorage.ng_campaign_seq` so every new draft gets a fresh suffix even within the same minute.
   - Field stays fully editable — user can overwrite.

3. **Placeholder** in the name input updated to show the generated example.

No backend, schema, or proxy changes. Other behavior (test mode, schedule, sequences, launch self-heal) untouched.