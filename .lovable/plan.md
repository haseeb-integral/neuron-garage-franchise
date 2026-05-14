## Goal
Replace the CSV-only download in the Market Report modal with a real PDF that mirrors the on-screen content, and make the right-panel "Generate PDF Report" button a one-click flow.

## Approach
Use **html2canvas + jsPDF** to snapshot the modal content div and emit a clean, multi-page A4 PDF. Both libs are small, work fully client-side, and require zero backend changes. (Preferred over `window.print()` because it avoids printing app chrome and works without user print-dialog steps.)

## Scope
**Files:**
- `src/components/city-scoring/MarketReportModal.tsx` — PDF capture + new button + auto-download support
- `src/pages/CityScoring.tsx` — pass an `autoDownload` flag when the right-panel button is clicked

**Dep add:** `jspdf`, `html2canvas`

## Changes

### 1. Install deps
- `bun add jspdf html2canvas`

### 2. MarketReportModal.tsx
- Attach `ref={reportRef}` to the existing scrollable content `<div className="space-y-5 ...">` (lines ~217–311). No layout changes.
- New `handleDownloadPdf`:
  - Guard on `loading` / missing ref.
  - Temporarily expand node height to `scrollHeight` and force white bg so html2canvas captures the full modal (currently clipped by `max-h-[90vh]`).
  - `html2canvas(node, { scale: 2, backgroundColor: "#ffffff", useCORS: true, windowWidth: node.scrollWidth })`.
  - Build A4 portrait with `jsPDF({ unit: "pt", format: "a4" })`.
  - Multi-page slice: render the same image at negative `y` offsets per page (standard pattern) so long content paginates cleanly.
  - Add a small header line (`pdf.text(...)`) on page 1 with `Generated: YYYY-MM-DD` — no DOM mutation needed.
  - Filename: `${city-slug}-${stateAbbr}-market-report-${YYYY-MM-DD}.pdf`.
  - Toast success/error.
- Footer: keep `Download Source CSV` (outline); add primary `Download PDF Report` button next to it, disabled while `loading`.
- **Auto-download wiring:** add new optional prop `autoDownload?: boolean`. When `open` becomes true with `autoDownload`, after the existing data-load effect resolves and `loading` flips false, run `handleDownloadPdf` once (guarded by a ref so it fires only once per open). The modal still appears (so the user sees what's being captured and the export progress) — they can close it after.

### 3. CityScoring.tsx (line ~1947)
- Add local state `reportAutoPdf: boolean`.
- "Generate PDF Report" button → `setReportAutoPdf(true); setReportOpen(true);`.
- Pass `autoDownload={reportAutoPdf}` to `<MarketReportModal>`.
- Reset `reportAutoPdf` to false when the modal closes.
- The "Report" button at line 1928 stays as plain open (no auto-download).

**Decision: I'll do the auto-download.** It's straightforward — one prop, one effect, one ref guard. No data race because we wait for the existing `loading` effect to finish before triggering.

## Risk
Low. Read-only capture of existing DOM. No scoring, data, or layout logic changes. Two new npm deps (~250KB gzipped) loaded only where used.

## Out of scope
- Restyling the modal for print
- Server-side PDF generation
- Hiding the modal during auto-download (kept visible so user sees source + can re-export/close)
