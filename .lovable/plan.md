# Fix "PDF export failed" — font fetch is blocked by CORS

## Root cause

`SitePackDocument.tsx` registers Inter from GitHub raw URLs:

```
https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Regular.ttf
```

GitHub raw redirects (302) to `objects.githubusercontent.com`, which does **not** send `Access-Control-Allow-Origin`. `@react-pdf/renderer` fetches font sources via `fetch()` in the browser; the redirected response is blocked, the font load promise rejects, and `pdf().toBlob()` throws — surfacing in `handleExport` as `toast.error("PDF export failed")`.

## Fix

Swap the font URLs to **jsDelivr's GitHub mirror**, which serves the same TTFs with permissive CORS headers (`access-control-allow-origin: *`):

```
https://cdn.jsdelivr.net/gh/rsms/inter@master/docs/font-files/Inter-Regular.ttf
https://cdn.jsdelivr.net/gh/rsms/inter@master/docs/font-files/Inter-Medium.ttf
https://cdn.jsdelivr.net/gh/rsms/inter@master/docs/font-files/Inter-SemiBold.ttf
https://cdn.jsdelivr.net/gh/rsms/inter@master/docs/font-files/Inter-Bold.ttf
https://cdn.jsdelivr.net/gh/rsms/inter@master/docs/font-files/Inter-Italic.ttf
```

Same file bytes, jsDelivr is a trusted public CDN, no extra dependency, no bundle size change.

## Also (small reliability win)

Wrap `handleExport`'s catch with `console.error(err)` already exists — good. Add the error message to the toast so future failures are diagnosable from the UI:

```ts
toast.error(`PDF export failed: ${err instanceof Error ? err.message : "unknown"}`);
```

## Files

- `src/lib/sitePack/SitePackDocument.tsx` — 5 URL swaps in `Font.register`.
- `src/pages/SiteAnalysis.tsx` — one-line toast message tweak in the export catch block.

## Out of scope

- Bundling Inter as a local asset (heavier, not needed once CDN works).
- Re-architecting the PDF.

Approve to proceed.
