import { Home, Map, Users, Kanban, ClipboardCheck, BookOpen, ChevronLeft, ChevronRight, LogOut, Shield } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/neuron-garage-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebarCollapsed } from "@/lib/sidebarState";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [
  { title: "Dashboard", url: "/", icon: Home, tourId: "nav-dashboard" },
  { title: "City Scoring", url: "/city-scoring", icon: Map, tourId: "nav-city-scoring" },
  { title: "Teacher Prospects", url: "/teacher-prospects", icon: Users, tourId: "nav-teacher-prospects" },
  { title: "Candidate Pipeline", url: "/candidate-pipeline", icon: Kanban, tourId: "nav-candidate-pipeline" },
  { title: "Onboarding", url: "/onboarding", icon: ClipboardCheck, tourId: "nav-onboarding" },
];

const footerItem = { title: "User's Guide", url: "/user-guide", icon: BookOpen };

interface Props {
  variant?: "fixed" | "drawer";
  onNavigate?: () => void;
}

export function AppSidebar({ variant = "fixed", onNavigate }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, user, role, signOut } = useAuth();
  const [collapsed, setCollapsed] = useSidebarCollapsed();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  const displayName = profile?.full_name || profile?.email || user?.email || "Account";
  const initials = (displayName.match(/\b\w/g) || []).slice(0, 2).join("").toUpperCase() || "U";

  // Drawer (mobile) is always expanded
  const isCollapsed = variant === "fixed" && collapsed;
  const widthClass = isCollapsed ? "w-16" : "w-60";

  const isActive = (url: string) => {
    if (url === "/") return location.pathname === "/";
    return location.pathname.startsWith(url);
  };

  const containerClass =
    variant === "fixed"
      ? `fixed left-0 top-0 h-screen ${widthClass} flex flex-col z-40 transition-[width] duration-200`
      : "h-full w-full flex flex-col";

  const renderLink = (item: typeof navItems[number] | typeof footerItem, withTour = false) => {
    const active = isActive(item.url);
    const link = (
      <NavLink
        key={item.title}
        to={item.url}
        end={item.url === "/"}
        onClick={onNavigate}
        data-tour={withTour ? (item as typeof navItems[number]).tourId : undefined}
        className={`group flex items-center rounded-lg text-sm transition-colors ${
          isCollapsed ? "justify-center px-0" : "gap-3 px-3"
        }`}
        style={{
          minHeight: 44,
          backgroundColor: active ? "rgba(255,255,255,0.10)" : "transparent",
          borderLeft: active && !isCollapsed ? "3px solid #fd7e14" : "3px solid transparent",
          color: active ? "#ffffff" : "rgba(255,255,255,0.60)",
          fontWeight: active ? 600 : 400,
        }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.85)"; }}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.60)"; }}
      >
        <item.icon size={18} style={{ color: active && isCollapsed ? "#fd7e14" : undefined }} />
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
      <aside className={containerClass} style={{ backgroundColor: "#003c7e" }}>
        <div className={`py-5 flex items-center ${isCollapsed ? "flex-col gap-3 px-2" : "pl-4 pr-2 gap-2"}`}>
          <div className={`flex items-center gap-2 ${isCollapsed ? "" : "flex-1 min-w-0"}`}>
            <img src={logo} alt="Neuron Garage" className="w-8 h-8 flex-shrink-0" />
            {!isCollapsed && (
              <span className="text-white text-base font-bold tracking-tight truncate">Neuron Garage</span>
            )}
          </div>
          {variant === "fixed" && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="flex items-center justify-center rounded-md transition-colors flex-shrink-0"
              style={{
                width: 26,
                height: 26,
                backgroundColor: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.75)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.16)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)"; }}
            >
              {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          )}
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-3">
          {navItems.map((item) => renderLink(item, true))}
          {role === "admin" && renderLink({ title: "Users", url: "/users", icon: Shield, tourId: "nav-users" }, true)}
        </nav>

        <div
          className="px-3 pb-4 pt-2 mt-auto flex flex-col gap-1"
          style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}
        >
          {renderLink(footerItem)}

          {/* User info + Logout */}
          {!isCollapsed && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg mt-1"
              style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
            >
              <div
                className="flex items-center justify-center rounded-full text-xs font-semibold flex-shrink-0"
                style={{ width: 28, height: 28, backgroundColor: "#fd7e14", color: "#fff" }}
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-white truncate font-medium">{displayName}</div>
                {role && (
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.55)" }}>
                    {role}
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            aria-label="Log out"
            title="Log out"
            className={`group flex items-center rounded-lg text-sm transition-colors ${
              isCollapsed ? "justify-center px-0" : "gap-3 px-3"
            }`}
            style={{
              minHeight: 40,
              color: "rgba(255,255,255,0.60)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.95)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.60)"; }}
          >
            <LogOut size={18} />
            {!isCollapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
