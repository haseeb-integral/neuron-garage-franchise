import { Skeleton } from "@/components/ui/skeleton";

/**
 * Page-shell skeleton shown while a lazy route chunk is loading.
 * Sidebar + top bar are outside <Suspense> in AppLayout, so this only
 * fills the <Outlet /> content area.
 */
export function RouteSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-8 w-28" />
      </div>
      <Skeleton className="h-4 w-80" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
