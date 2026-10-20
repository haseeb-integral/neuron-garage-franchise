# Email Outreach gaps — Phase 2: Company mailing address

Phase 1 (checking each A/B version for the unsubscribe link) is done.

## What and why
The law (CAN-SPAM) says every cold email needs a real business mailing address. Right now the app uses a stand-in: "[ADD MAILING ADDRESS]". We will let staff save the real address once. Then every launch check will use it.

## What we will build
1. A new small settings table that stores one company mailing address. Staff can read it. Only admins can change it.
2. A "Company Mailing Address" card under Setup & reference on the Email Outreach page. You type the address and press Save.
3. Every launch path reads the saved address instead of the stand-in:
   - the new-campaign drawer footer and its check
   - the Launch button on the campaign list
   - the lead-push function (it will refuse to push if no address is saved, or a step is missing it)
4. If no address is saved, launches are blocked with a clear message that says where to add it.

## Pages and parts affected
- Email Outreach page: new card only.
- New-campaign drawer, campaign list Launch button, lead-push function.
- Not touched: Reply Triage, Analytics, Import Wizard, Outreach Queue, the SmartLead proxy, "START" status, tracking flags.

## Turns
About 2 turns: turn 1 table + card; turn 2 wire it into all launch checks and tests.

## Risks and testing
- Old campaigns made with the stand-in will show as blocked until the footer has the real address. This is on purpose.
- Tests: new tests for "no address saved blocks launch" and "address present passes". Then a signed-in check that the card saves and reloads.
- Real SmartLead launch can't be tested until the API key works.

## Next phases (not in this turn)
- Phase 3: unsubscribe sync timer + "Sync now" button.
- Phase 4: mailbox section with campaign links and warmup switch.
