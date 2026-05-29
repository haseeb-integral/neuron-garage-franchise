import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HelpCircle } from "lucide-react";

/**
 * Inline legend that explains every element on a candidate card.
 * Trigger sits in the pipeline toolbar; click to reveal an annotated key.
 */
export function CardLegendPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-xs font-medium px-2 py-1 rounded-md hover:bg-[#f1f3f5] flex items-center gap-1"
          style={{ color: "#495057" }}
          aria-label="What does each part of a candidate card mean?"
        >
          <HelpCircle size={12} /> Card legend
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-4">
        <div className="text-sm font-bold mb-2" style={{ color: "#003c7e" }}>
          Anatomy of a candidate card
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Each card packs four independent signals. Here's what they mean.
        </p>

        <ul className="space-y-2.5 text-xs">
          <LegendRow
            swatch={
              <span
                className="inline-block w-1 h-6 rounded-sm"
                style={{ backgroundColor: "#dc3545" }}
              />
            }
            title="Left stripe — Days in stage"
            body="Green ≤3 (fresh), amber 4–7 (watch), red 8+ (stalled)."
          />
          <LegendRow
            swatch={
              <span
                className="inline-flex w-6 h-6 rounded-full items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: "#0757ff" }}
              >
                AV
              </span>
            }
            title="Initials circle — Candidate avatar"
            body="The candidate's initials. Just identity, no score."
          />


          <LegendRow
            swatch={
              <span
                className="inline-flex px-1.5 h-5 rounded-full items-center text-[10px] font-bold text-white"
                style={{ backgroundColor: "#198754" }}
              >
                Qual 100
              </span>
            }
            title='"Qual" pill — Qualification composite'
            body="Calculated from the 5 star-pillar ratings in the detail panel (Teaching, Leadership, Financial, Market Fit, Culture Fit). Hidden when 0."
          />
          <LegendRow
            swatch={
              <span
                className="inline-flex px-2 h-5 rounded-md items-center text-[10px] font-medium"
                style={{ backgroundColor: "#e7f1ff", color: "#0757ff" }}
              >
                High Potential
              </span>
            }
            title="Blue tag — Qualitative label"
            body='Short status like "Interested", "High Potential", "Follow-Up".'
          />
          <LegendRow
            swatch={<span className="text-[10px] font-medium text-muted-foreground">Day 8</span>}
            title='"Day N" — Time in current stage'
            body="How many days the candidate has been sitting in this stage."
          />
          <LegendRow
            swatch={
              <span
                className="inline-flex w-5 h-5 rounded-full items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: "#198754" }}
              >
                h
              </span>
            }
            title="Small letter circle — Owner"
            body="First initial of the teammate assigned to this candidate. Hover for full name."
          />
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function LegendRow({
  swatch,
  title,
  body,
}: {
  swatch: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3">
      <div className="flex-shrink-0 w-16 flex items-center justify-center">{swatch}</div>
      <div className="flex-1">
        <div className="font-semibold text-foreground">{title}</div>
        <div className="text-muted-foreground leading-snug">{body}</div>
      </div>
    </li>
  );
}
