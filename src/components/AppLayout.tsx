import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { HelpCircle, Menu } from "lucide-react";
import logo from "@/assets/neuron-garage-logo.png";
import { maybeStartTourOnFirstVisit, startTour } from "@/lib/tour";

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close drawer on route change
  const closeDrawer = () => setOpen(false);

  // Auto-run guided tour on the user's first visit
  useEffect(() => {
    maybeStartTourOnFirstVisit();
  }, []);

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar (md+) */}
      <div className="hidden md:block">
        <AppSidebar />
      </div>

      {/* Mobile drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-60 border-r-0" style={{ backgroundColor: "#003c7e" }}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <AppSidebar variant="drawer" onNavigate={closeDrawer} />
        </SheetContent>
      </Sheet>

      <main
        className="flex-1 min-h-screen md:ml-60 p-4 md:p-8 relative"
        style={{ backgroundColor: "#ffffff" }}
      >
        {/* Desktop help icon (top-right) */}
        <button
          onClick={() => startTour()}
          aria-label="Restart guided tour"
          title="Restart guided tour"
          className="hidden md:flex items-center justify-center rounded-full absolute top-4 right-4 z-30 transition-colors"
          style={{
            width: 36,
            height: 36,
            backgroundColor: "#ffffff",
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
          <HelpCircle size={18} />
        </button>

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between mb-4 -mx-4 -mt-4 px-4 py-3 border-b" style={{ backgroundColor: "#003c7e", borderColor: "rgba(255,255,255,0.1)" }}>
          <button
            onClick={() => setOpen(true)}
            aria-label="Open navigation menu"
            className="flex items-center justify-center rounded-md text-white"
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <img src={logo} alt="Neuron Garage" className="w-8 h-8" />
            <span className="text-white text-base font-bold tracking-tight">Neuron Garage</span>
          </div>
          <button
            onClick={() => startTour()}
            aria-label="Restart guided tour"
            className="flex items-center justify-center rounded-md text-white"
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <HelpCircle size={20} />
          </button>
        </div>

        <Outlet key={location.pathname} />
      </main>
    </div>
  );
}
