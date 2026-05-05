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
  const widthClass = isCollapsed ? "w-16" : "w-[220px]";

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
        className={`group flex items-center rounded-lg transition-all ${
          isCollapsed ? "justify-center px-0" : "gap-3 px-3"
        }`}
        style={{
          minHeight: isCollapsed ? 36 : 38,
          backgroundColor: active ? "#174be8" : "transparent",
          color: active ? "#ffffff" : "#14233b",
          fontSize: 13.5,
          fontWeight: active ? 600 : 500,
          boxShadow: "none",
        }}
        onMouseEnter={(e) => {
          if (!active) {
            e.currentTarget.style.backgroundColor = "#f7faff";
            e.currentTarget.style.color = "#0757ff";
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "#14233b";
          }
        }}
      >
        <item.icon size={isCollapsed ? 17 : 18} strokeWidth={active ? 2 : 1.8} />
        {!isCollapsed && <span className="whitespace-nowrap">{item.title}</span>}
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
          borderRight: "1px solid #e4eaf3",
          boxShadow: "8px 0 24px rgba(15, 23, 42, 0.025)",
        }}
      >
        <div className={`flex items-start ${isCollapsed ? "flex-col gap-3 px-2 py-4" : "gap-2 px-3.5 pb-5 pt-4"}`}>
          <div className={`flex items-center gap-2 ${isCollapsed ? "justify-center w-full" : "flex-1 min-w-0"}`}>
            <img src={logo} alt="Neuron Garage" className={`${isCollapsed ? "h-9 w-9" : "h-10 w-10"} flex-shrink-0 object-contain`} />
            {!isCollapsed && (
              <div className="min-w-0 leading-none">
                <div className="text-[15px] font-black uppercase leading-[0.95] tracking-[0.08em] text-[#07142f]">Neuron</div>
                <div className="text-[15px] font-black uppercase leading-[0.95] tracking-[0.08em] text-[#07142f]">Garage</div>
                <div className="mt-1.5 text-[9.5px] font-bold uppercase leading-none tracking-[0.30em] text-[#0757ff]">Franchise</div>
              </div>
            )}
          </div>
          {variant === "fixed" && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="flex items-center justify-center rounded-xl transition-colors flex-shrink-0"
              style={{
                width: isCollapsed ? 32 : 34,
                height: isCollapsed ? 32 : 34,
                backgroundColor: "#ffffff",
                border: "1px solid #eef2f7",
                color: "#14233b",
                boxShadow: "0 4px 10px rgba(15, 23, 42, 0.03)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f7faff";
                e.currentTarget.style.color = "#0757ff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#ffffff";
                e.currentTarget.style.color = "#14233b";
              }}
            >
              {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
            </button>
          )}
        </div>

        <nav className={`flex flex-col ${isCollapsed ? "gap-2 px-2" : "gap-2.5 px-3.5"}`}>
          {primaryNavItems.map((item) => renderLink(item, true))}
        </nav>

        <div className={`${isCollapsed ? "mx-3 my-5" : "mx-3.5 my-5"} h-px bg-[#eef2f7]`} />

        <nav className={`flex flex-col ${isCollapsed ? "gap-2 px-2" : "gap-2.5 px-3.5"}`}>
          {utilityNavItems.map((item) => renderLink(item))}
        </nav>
      </aside>
    </TooltipProvider>
  );
}
