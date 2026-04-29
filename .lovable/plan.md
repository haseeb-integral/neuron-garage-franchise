
Three small fixes:

## 1. Avatars — smaller, inline with names
- `CandidateCard` (normal): **40px → 28px** so it sits inline with the candidate name, like Linear/Asana cards.
- `CandidateCard` (compact): keep at **20px**.
- `CandidateDetailPanel` header: **48px → 40px**.
- `OverviewTab` upload block: keep at **64px** (it's the upload target, larger is good).

Adjust the card's top row so the avatar + name + city align on one tight horizontal line; FitScore badge stays top-right.

## 2. Header bar — blend in, no separate-strip feel
In `AppLayout.tsx`, the desktop top bar currently has:
- white background
- visible bottom border
- 56px height
- empty left column

Change to:
- **transparent background** (matches page bg `#f2f4f6` on most pages, white on Index — using `bg-transparent` so it inherits whichever page it's on)
- **no bottom border**
- height **48px**
- search input slightly tighter, help icon moved next to search (right-aligned cluster instead of three-column flex)
- remove the `sticky top-0` + white background "strip" effect; keep `sticky` but with transparent bg so page content scrolls naturally underneath… actually drop sticky to avoid any color seam. Just place it at the top of `<main>`.

Result: search reads as a floating input on the page, not as a second app bar. No new color introduced.

## 3. Sidebar — collapse button no longer clips the title
- Logo: **w-10 → w-8** (frees ~10px).
- Title: `text-lg → text-base` (slightly smaller, fits in 240px width).
- Header padding: `px-5 → pl-4 pr-2` to give the button more room without pushing the text.
- Gap between logo and text: `gap-3 → gap-2`.

After this, "Neuron Garage" should display fully with the toggle button visible to its right.

## Files edited
- `src/components/candidate-pipeline/CandidateCard.tsx` (avatar size 28; compact tweaks)
- `src/components/candidate-pipeline/CandidateDetailPanel.tsx` (avatar size 40)
- `src/components/AppLayout.tsx` (header transparent, 48px, no border, no sticky)
- `src/components/AppSidebar.tsx` (logo + title sizing + padding)
