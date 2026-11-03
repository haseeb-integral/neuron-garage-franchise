# Phase 7 — Approve the email wording

## Form changes are ready
- Request for Consideration no longer asks for County or References.
- Home and camp ZIP codes fill city and state. Both remain editable.
- References is now a separate Step 3 form with the same three reference questions.
- Staff see submitted reference details under Qualification Process → References. Staff call notes stay separate.
- Old signed RFC layouts, answers, and PDFs stay unchanged.

Live tests passed: save and return, submit, locked answers, PDF download, staff read-back, ZIP filling, and manual city edits. The 58 focused checks passed; five existing checks were skipped because their test settings were not provided. The test prospect had no old signed RFC, so old RFC display was checked in code tests, not a live old submission. Temporary test forms and PDF were removed.

Files touched: RFC and old RFC definitions; new References definition; form registry and tests; prefill; ZIP lookup and local ZIP list; PortalForm; portal step list; staff submitted-reference display; ProcessTab and its test; ProspectFormsTab; FormSubmissionHistory; architecture rules and roadmap.

## Proposed exact email words
Square brackets below mean the email fills in the saved name or call details. These brackets are not shown to prospects.

### Portal invitation
**Subject:** Welcome to your Neuron Garage path to ownership

Hi [First name],

It was great to start the conversation with you. Your Neuron Garage portal is ready.

Over the next few weeks, we'll get to know each other and explore what owning a Neuron Garage camp could look like. Your portal keeps your five conversations, call details, and between-call tasks in one place.

Our first conversation is already behind us. You can still finish the Step 1 tasks before we talk again.

Set your password to get started. We're glad you're here.

**Button:** Set my password

The Neuron Garage team

### Call booked
**Subject:** Looking forward to our next Neuron Garage conversation

Hi [First name],

Your [Call title] is booked for [Date and time, with time zone]. We're looking forward to taking the next step with you.

You'll meet with [Host name], and we've set aside [Length] minutes.

Before we talk, check your portal for anything still to complete. Each conversation builds on the one before.

**Button:** View my call

The Neuron Garage team

If a host or length has not been saved, omit that missing detail rather than inventing one.

### New step opens
**Subject:** Your next Neuron Garage step is ready

Hi [First name],

You're ready for the next conversation. [Step title] is now open in your portal.

Take a look at your next tasks and available files before we talk again. We're looking forward to learning more together.

**Button:** View my path

The Neuron Garage team

### Call moved
**Subject:** Your Neuron Garage call time has changed

Hi [First name],

We've updated your [Call title]. The new time is [Date and time, with time zone].

You'll meet with [Host name], and we've set aside [Length] minutes.

Your portal has the latest details. We look forward to continuing the conversation.

**Button:** View my call

The Neuron Garage team

### Day-before reminder
**Subject:** See you tomorrow for our Neuron Garage conversation

Hi [First name],

We're looking forward to your [Call title] tomorrow at [Time, with time zone].

You'll meet with [Host name], and we've set aside [Length] minutes.

Take a quick look at your portal for any remaining tasks before we talk. See you tomorrow!

**Button:** View my path

The Neuron Garage team

## Safe next phase — about 1 turn
After approval, update only these email words and check their previews. Keep invite password links, resend links, call details, recipient checks, unsubscribe handling, send timing, and duplicate-send protection unchanged. Portal notice buttons must open the prospect portal, not staff sign-in.

The invitation uses the account-invite email, not the call-notice template. Check that shared staff invite wording stays unchanged. Resending an invite currently sends a password-reset link; keep that working without treating it as a new account invite.

Do not change FDD emails or proof, forms, signed answers, PDFs, the 16-day signing rule, staff access, Email Outreach, City Search, or Teacher Search.

Tests: render all five previews; check names and date/time details; check missing host/length; verify prospect button links and account setup links. Send inbox samples only to Sam's approved test address if needed. No real prospect messages should be sent just to test wording.

**Approval requested:** Approve these words, or tell me which lines to change. Email wording and sending have not changed yet.