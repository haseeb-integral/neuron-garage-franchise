I’ll fix the Site Analysis PDF export failure and verify it in the running app.

Plan:
1. Reproduce the failure with a browser smoke test on the Site Analysis page and capture the exact console/toast error.
2. Update the PDF exporter to remove the most likely fragile browser dependency: remote font fetching in `@react-pdf/renderer`; use built-in PDF-safe fonts so export does not depend on CDN/CORS/font parsing.
3. Keep the current PDF content/layout and the existing export button placement unchanged.
4. Smoke-test again by clicking Export decision pack (PDF), confirm the download starts, and confirm no PDF export error appears.
5. If the smoke test still fails after removing remote fonts, switch the export path to the already-installed `jspdf`/`html2canvas` fallback approach for a browser-stable PDF download.