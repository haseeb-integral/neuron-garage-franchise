import { ReactNode } from "react";
import { JourneyBar } from "@/components/JourneyBar";
import { GlobalSearch } from "@/components/GlobalSearch";
import { HelpCircle } from "lucide-react";
import { startTour } from "@/lib/tour";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  action?: ReactNode;
}

/**
 * Shared page header: title + subtitle + JourneyBar.
 * On the right side: global search, optional page action, and the help icon.
 * Sits on the same background as the page (no separate header bar).
 */
export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <>
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "#003c7e" }}>
            {title}
          </h1>
          <p className="text-sm mt-1" style={{ color: "#6c757d" }}>
            {subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 flex-wrap lg:flex-nowrap lg:justify-end">
          <div className="hidden md:block w-full sm:w-[360px]">
            <GlobalSearch />
          </div>
          {action}
          <button
            onClick={() => startTour()}
            aria-label="Restart guided tour"
            title="Restart guided tour"
            className="hidden md:flex items-center justify-center rounded-full transition-colors flex-shrink-0"
            style={{
              width: 32,
              height: 32,
              backgroundColor: "transparent",
              border: "1px solid #dee2e6",
              color: "#6c757d",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#fd7e14";
              e.currentTarget.style.borderColor = "#fd7e14";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#6c757d";
              e.currentTarget.style.borderColor = "#dee2e6";
            }}
          >
            <HelpCircle size={16} />
          </button>
        </div>
      </div>
      <JourneyBar />
    </>
  );
}
