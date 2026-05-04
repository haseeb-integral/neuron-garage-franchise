import { Home, Map, Users, Kanban, ClipboardCheck, BookOpen, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import logo from "@/assets/neuron-garage-logo.png";
import { useSidebarCollapsed } from "@/lib/sidebarState";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const primaryNavItems = [
  { title: "Dashboard", url: "/", icon: Home, tourId: "nav-dashboard" },
  { title: "City Scoring", url: "/city-scoring", icon: Map, tourId: "nav-city-scoring" },
  { title: "Teacher Prospects", url: "/teacher-prospects", icon: Users, tourId: "nav-teacher-prospects" },
  { title: "Candidate Pipeline", url: "/candidate-pipeline", icon: Kanban, tourId: "nav-candidate-pipeline" },
  { title: "Onboarding", url: "/onboarding", icon: ClipboardCheck, tourId: "nav-onboarding" },
];

const utilityNavItems = [
  { title: "Team Members", url: "/settings/team", icon: Users },
  { title: "Settings", url: "/settings/team", icon: Settings },
  { title: "User's Guide", url: "/user-guide", icon: BookOpen },
];

interface Props {
  variant?: "fixed" | "drawer";
  onNavigate?: () => void;
}

type NavItem = (typeof primaryNavItems)[number] | (typeof utilityNavItems)[number];

export function AppSidebar({ variant = "fixed", onNavigate }: Props) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useSidebarCollapsed();

  const isCollapsed = variant === "fixed" && collapsed;
  const widthClass = isCollapsed ? "w-16" : "w-56";

  const isActive = (url: string) => {
    if (url === "/") return location.pathname === "/";
    return location.pathname.startsWith(url);
  };

  const containerClass =
    variant === "fixed"
      ? `fixed left-0 top-0 h-screen ${widthClass} flex flex-col z-40 transition-[width] duration-200`
      : "h-full w-full flex flex-col";

  const renderLink = (item: NavItem, withTour = false) => {
    const active = isActive(item.url);
    const link = (
      <NavLink
        key={item.title}
        to={item.url}
        end={item.url === "/"}
        onClick={onNavigate}
        data-tour={withTour && "tourId" in item ? item.tourId : undefined}
        className={`group flex items-center rounded-lg text-sm transition-all ${
          isCollapsed ? "justify-center px-0" : "gap-3 px-3"
        }`}
        style={{
          minHeight: 38,
          backgroundColor: active ? "#0b4f9f" : "transparent",
          color: active ? "#ffffff" : "#26364d",
          fontWeight: active ? 700 : 500,
          boxShadow: active ? "0 6px 14px rgba(11, 79, 159, 0.10)" : "none",
        }}
        onMouseEnter={(e) => {
          if (!active) {
            e.currentTarget.style.backgroundColor = "#f3f7ff";
            e.currentTarget.style.color = "#0b4f9f";
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "#26364d";
          }
        }}
      >
        <item.icon size={17} />
        {!isCollapsed && <span>{item.title}</span>}
      </NavLink>
    );

    if (!isCollapsed) return link;

    return (
      <Tooltip key={item.title} delayDuration={150}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>{item.title}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider>
      <aside
        className={containerClass}
        style={{
          backgroundColor: "#ffffff",
          borderRight: "1px solid #e3eaf3",
          boxShadow: "6px 0 18px rgba(15, 23, 42, 0.025)",
        }}
      >
        <div className={`py-4 flex items-start ${isCollapsed ? "flex-col gap-2 px-2" : "pl-3 pr-2 gap-2"}`}>
          <div className={`flex items-center gap-2 ${isCollapsed ? "justify-center w-full" : "flex-1 min-w-0"}`}>
            <img src={logo} alt="Neuron Garage" className="w-8 h-8 flex-shrink-0 object-contain" />
            {!isCollapsed && (
              <div className="min-w-0 leading-none">
                <div className="text-[13px] font-black uppercase tracking-[0.08em] text-[#07142f]">Neuron</div>
                <div className="text-[13px] font-black uppercase tracking-[0.08em] text-[#07142f]">Garage</div>
                <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.30em] text-[#174be8]">Franchise</div>
              </div>
            )}
          </div>
          {variant === "fixed" && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="flex items-center justify-center rounded-lg transition-colors flex-shrink-0"
              style={{
                width: 30,
                height: 30,
                backgroundColor: "#ffffff",
                border: "1px solid #d8e2ef",
                color: "#546179",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f3f7ff";
                e.currentTarget.style.color = "#0b4f9f";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#ffffff";
                e.currentTarget.style.color = "#546179";
              }}
            >
              {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            </button>
          )}
        </div>

        <nav className="flex flex-col gap-1 px-2.5">
          {primaryNavItems.map((item) => renderLink(item, true))}
        </nav>

        <div className="mx-3 my-4 h-px bg-[#d8e2ef]" />

        <nav className="flex flex-col gap-1 px-2.5">
          {utilityNavItems.map((item) => renderLink(item))}
        </nav>
      </aside>
    </TooltipProvider>
  );
}
