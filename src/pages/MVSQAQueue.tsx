// ============================================================================
// /mvs-qa-queue — RETIRED.
//
// This page used to surface week-extraction failures from `mvs-extract-weeks`,
// which scraped each provider's registration page to compute Market Absorption.
// Market Absorption was removed from the MVS composite on June 24, 2026
// (weight 0, excluded from the composite). The weeks pipeline was switched off
// because every Firecrawl call here was spent producing a score no longer
// shown to users, and ~98% of the QA items were "no registration page found".
//
// The route is kept so old bookmarks and links don't 404. The page now shows
// a short retired-notice. The underlying edge function (`mvs-extract-weeks`)
// and the `mvs_qa_queue` table are intentionally left in place in case the
// Absorption pillar is ever revived.
// ============================================================================

import { Link } from "react-router-dom";

export default function MVSQAQueue() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        to="/market-validation"
        className="text-sm font-medium text-orange-600 hover:underline"
      >
        ← Back to Market Validation
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-slate-900">MVS QA Queue</h1>
      <p className="mt-2 text-sm font-semibold text-slate-500">Retired</p>

      <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-5 text-sm leading-relaxed text-slate-700">
        <p>
          This queue used to track providers whose weekly registration page
          could not be scraped. It fed the <strong>Market Absorption</strong>{" "}
          pillar.
        </p>
        <p className="mt-3">
          Market Absorption was removed from the MVS composite on{" "}
          <strong>June 24, 2026</strong> because sellout-rate scraping was
          unreliable. The five remaining pillars were re-normalized so weights
          still sum to 1.0.
        </p>
        <p className="mt-3">
          Because no live score depends on this data anymore, the weeks pipeline
          and this queue have been switched off. The historical rows are kept in
          the database for reference but no new items will appear here.
        </p>
      </div>
    </div>
  );
}
