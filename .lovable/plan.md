## Plan: Clickable Provider Names in Premium Providers Table

### What we're doing
In the **Premium Providers table** (inside the live city deep-dive panel), make each provider's name a clickable external link that opens in a new tab. If no URL exists, the name stays plain text.

### Correction to your understanding
- **Column name**: The `mvs_providers` column is `url`, not `source_url`. That's the only fix needed to your description — the rest of your approach is correct.
- **File location**: The table lives in `src/components/phase2-demo/LiveCityDeepDive.tsx` (rendered by `MarketValidation.tsx`), so that's where the change goes.

### Implementation
In `LiveCityDeepDive.tsx`, within the `premiumProviders.map(...)` table row, change the provider name cell from plain text to a conditional link:

```tsx
<td className="px-4 py-2.5 font-semibold" style={{ color: NAVY }}>
  {p.url ? (
    <a
      href={p.url}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:underline"
    >
      {p.name}
    </a>
  ) : (
    p.name
  )}
</td>
```

### Why this is the right standard
- `<a>` tag with `href` is the semantic HTML element for navigation — screen readers and keyboard users handle it correctly.
- `target="_blank"` opens in a new tab so the user doesn't lose their place in the Market Validation page.
- `rel="noopener noreferrer"` is the security pairing that prevents the opened page from accessing `window.opener`.
- Keeping it plain text (not a disabled link) when `url` is missing avoids confusing UX and accessibility noise.

No other UI changes. One file, one cell modification.