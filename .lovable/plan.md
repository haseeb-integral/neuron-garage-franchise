## Goal
Make the documentation pages readable by removing the hard-to-read dark-blue block treatment and improving wrapping/spacing for long technical content.

## What I’ll change
1. Update the shared documentation styling in `src/components/DocShell.tsx` so code/preformatted sections are easier to read.
   - Replace the current dark navy code-block background with a light surface.
   - Increase contrast and line-height.
   - Ensure long lines wrap instead of creating dense unreadable slabs.
   - Tidy table/cell spacing so technical sections scan better.

2. Keep the markdown content intact unless a specific section still needs cleanup after the styling fix.
   - The screenshot shows the main issue is presentation, not the wording itself.
   - I’ll avoid rewriting the architecture doc unless absolutely needed.

3. Apply the fix at the shared shell level so all doc pages using `DocShell` benefit, not just `/architecture`.
   - This should improve `/architecture`, `/observability-guide`, `/observability-spec`, `/smartlead-spec`, and similar pages.

4. Verify the result in the preview.
   - Check that the repo-map/code-style sections no longer render as dark blue unreadable blocks.
   - Confirm long labels and wrapped lines remain legible at the current desktop viewport.

## Expected result
- No more giant dark-blue unreadable code slabs.
- Better contrast for readers with glasses or lower visual comfort.
- Cleaner, calmer docs UI across the sidebar documentation pages.

## Technical notes
- Likely changes will be limited to `docProseClass` in `src/components/DocShell.tsx`.
- I may add `whitespace-pre-wrap`, `break-words`, or related prose-safe styles to improve long-line wrapping.
- I will not change app logic, routes, or backend behavior.