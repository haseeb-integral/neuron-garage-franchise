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

  const closeDrawer = () => setOpen(false);

  useEffect(() => {
    maybeStartTourOnFirstVisit();
  }, []);

  return (
    <div className="min-h-screen flex bg-white">
      <div className="hidden md:block">
        <AppSidebar />
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-[248px] border-r-0 bg-white">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <AppSidebar variant="drawer" onNavigate={closeDrawer} />
        </SheetContent>
      </Sheet>

      <main
        className={`flex-1 min-h-screen bg-white ${collapsed ? "md:ml-16" : "md:ml-[248px]"} transition-[margin] duration-200`}
      >
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-white border-[#d8e2ef]">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open navigation menu"
            className="flex items-center justify-center rounded-md text-[#0b4f9f]"
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
            className="flex items-center justify-center rounded-md text-[#0b4f9f]"
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <HelpCircle size={20} />
          </button>
        </div>

        <div className="p-3 md:px-7 md:py-4 lg:px-8 lg:py-5">
          <Outlet key={location.pathname} />
        </div>
      </main>
    </div>
  );
}
