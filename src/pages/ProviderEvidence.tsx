import { useSearchParams, Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Loader2 } from "lucide-react";

const NAVY = "#07142f";
const MUTED = "#526078";
const BORDER = "#eef2f7";
const SOFT = "#f7faff";
const BLUE = "#174be8";

/**
 * Phase E1 — Provider Evidence Review (read-only shell).
 *
 * Empty page shell only. Real grid + drawer ship in Phase E2 / E3.
 * Reads ?city= and ?state= query params, matching the same routing
 * pattern as /market-validation/competitors.
 */
export default function ProviderEvidence() {
  const [params] = useSearchParams();
  const city = params.get("city") ?? "";
  const state = params.get("state") ?? "";
  const cityKey = state ? `${city}, ${state}` : city;

  return (
    <>
      <PageHeader
        title="Provider Evidence Review"
        subtitle={
          cityKey
            ? `Read-only audit of providers and source queries for ${cityKey}.`
            : "Read-only audit of providers and source queries."
        }
        hideJourneyBar
      />

      <div className="mb-3 text-[12px]" style={{ color: MUTED }}>
        <Link to="/market-validation" className="font-semibold underline" style={{ color: BLUE }}>
          ← Back to Market Validation
        </Link>
      </div>

      <section
        className="rounded-lg border p-4"
        style={{ borderColor: BORDER, backgroundColor: SOFT }}
      >
        <div className="mb-1 text-[11px] font-bold uppercase tracking-wide" style={{ color: BLUE }}>
          What this page will show
        </div>
        <p className="text-[12px] leading-relaxed" style={{ color: NAVY }}>
          A spreadsheet-style grid of every provider found for{" "}
          <strong>{cityKey || "this city"}</strong>, with the exact Google query that surfaced it,
          the source URL, the price kept or dropped by the regex guard, and the evidence snippet.
          You will be able to click any row to open a side panel with the full source detail and
          screenshot link.
        </p>
        <p className="mt-2 text-[12px]" style={{ color: MUTED }}>
          This is Phase E1 — the empty shell. The data grid (Phase E2) and the row detail drawer
          (Phase E3) will be added in the next turns.
        </p>
      </section>

      <div
        className="mt-4 flex items-center gap-2 rounded-lg border bg-white p-6 text-[12px]"
        style={{ borderColor: BORDER, color: MUTED }}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading evidence for {cityKey || "—"}… (grid coming in Phase E2)
      </div>
    </>
  );
}
