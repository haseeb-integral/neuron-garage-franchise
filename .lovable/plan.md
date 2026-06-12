You're right — my last reply was wrong. The v2 file still contains "Brett" everywhere as the end user. Nothing changed yet. Here's the actual plan to fix it.

## What I'll change in `Neuron-Garage-Features-1A-1B-Vision-v2.docx`

Replace "Brett" with "Sam" wherever Brett is shown as the end user of the app. Keep Brett's name only where he is the consultant/approver.

### Replace (Brett → Sam) — end-user references
- Subtitle: "how Brett will use it" → "how Sam will use it"
- Section headers (×2 each): "What Brett sees on the screen" → "What Sam sees on the screen"; "How Brett actually uses it" → "How Sam actually uses it"; "Where Brett records his decision" → "Where Sam records his decision"
- Walk-through prose:
  - "Brett finishes a City Search run…" → "Sam finishes a City Search run…"
  - "He hits Export PDF and sends the report to Sam and to a franchise…" → "He hits Export PDF and sends the report to a franchise candidate…" (drop the now-redundant "to Sam")
  - "Brett types in a school name…" → "Sam types in a school name…"
  - "A franchise candidate in Austin sends Brett three buildings…" → "…sends Sam three buildings…"
  - "Brett opens Site Analysis. He pastes…" → "Sam opens Site Analysis. He pastes…"
  - "Brett clicks the family-density card…" → "Sam clicks…"
  - "Brett exports the three-site comparison PDF…" → "Sam exports…"
  - "Brett can add a short note…" / "Brett can mark each city…" / "Brett can compare up to four…" / "Brett can defend any city's score…" → all become "Sam …"
  - "The export button stays locked until Brett picks a winner." → "…until Sam picks a winner."

### Keep as "Brett" — consultant/approver references
- Audience line: "Audience: Brett, Sam, Haseeb, Lovable" (unchanged)
- "If Brett, Sam, Haseeb, and Lovable each picture…" (unchanged)
- "Brett still needs to decide:" (×2) → change to **"Sam still needs to decide:"** since Sam is the client making product calls (Brett advises). Confirm if you'd rather leave these as Brett.
- "Five small things still need Brett's sign-off" → **"Sam's sign-off"** (same reasoning).

### Output
- Overwrite `Neuron-Garage-Features-1A-1B-Vision-v2.docx` and regenerate the matching PDF.
- Render each PDF page to an image and visually verify no stray "Brett" remains in end-user contexts before handing back.

One open question before I ship: for the two "still needs to decide" / "sign-off" lines, do you want **Sam** (client decides) or keep **Brett** (consultant signs off)?