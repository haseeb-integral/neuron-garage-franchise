import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { HelpCircle, Menu } from "lucide-react";
import logo from "@/assets/neuron-garage-logo.png";
import { maybeStartTourOnFirstVisit, startTour } from "@/lib/tour";
import { useDefaultCollapsedForRoute, useSidebarCollapsed } from "@/lib/sidebarState";

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const [collapsed] = useSidebarCollapsed();

  // Default-collapsed when first visiting Candidate Pipeline (so all 7 columns fit).
  useDefaultCollapsedForRoute(["/candidate-pipeline"]);

  // Close drawer on route change
  const closeDrawer = () => setOpen(false);

  // Auto-run guided tour on the user's first visit
  useEffect(() => {
    maybeStartTourOnFirstVisit();
  }, []);

  return (
    <div className="min-h-screen flex bg-[#f5f8fc]">
      {/* Desktop sidebar (md+) */}
      <div className="hidden md:block">
        <AppSidebar />
      </div>

      {/* Mobile drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-60 border-r-0 bg-white">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <AppSidebar variant="drawer" onNavigate={closeDrawer} />
        </SheetContent>
      </Sheet>

      <main
        className={`flex-1 min-h-screen ${collapsed ? "md:ml-16" : "md:ml-60"} transition-[margin] duration-200`}
      >
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-white border-[#d8e2ef]">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open navigation menu"
            className="flex items-center justify-center rounded-md text-[#174be8]"
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <img src={logo} alt="Neuron Garage" className="w-8 h-8 object-contain" />
            <span className="text-[#07142f] text-base font-bold tracking-tight">Neuron Garage</span>
          </div>
          <button
            onClick={() => startTour()}
            aria-label="Restart guided tour"
            className="flex items-center justify-center rounded-md text-[#174be8]"
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <HelpCircle size={20} />
          </button>
        </div>

        <div className="p-3 md:p-5 lg:p-6">
          <Outlet key={location.pathname} />
        </div>
      </main>
    </div>
  );
}
