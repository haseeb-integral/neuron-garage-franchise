import { ReactNode } from "react";
import { JourneyBar } from "@/components/JourneyBar";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  action?: ReactNode;
}

/**
 * Shared page header: title + subtitle + JourneyBar.
 * Provides pixel-consistent vertical spacing across all main pages.
 * Matches the Dashboard layout as the source of truth.
 */
export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
        <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "#003c7e" }}>
          {title}
        </h1>
        {action}
      </div>
      <p className="text-sm mt-1 mb-6" style={{ color: "#6c757d" }}>
        {subtitle}
      </p>
      <JourneyBar />
    </>
  );
}
