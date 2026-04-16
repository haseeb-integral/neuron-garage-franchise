import { Home, Map, Users, Kanban, ClipboardCheck } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import logo from "@/assets/neuron-garage-logo.png";

const navItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "City Scoring", url: "/city-scoring", icon: Map },
  { title: "Teacher Prospects", url: "/teacher-prospects", icon: Users },
  { title: "Candidate Pipeline", url: "/candidate-pipeline", icon: Kanban },
  { title: "Onboarding", url: "/onboarding", icon: ClipboardCheck },
];

interface Props {
  variant?: "fixed" | "drawer";
  onNavigate?: () => void;
}

export function AppSidebar({ variant = "fixed", onNavigate }: Props) {
  const location = useLocation();

  const isActive = (url: string) => {
    if (url === "/") return location.pathname === "/";
    return location.pathname.startsWith(url);
  };

  const containerClass =
    variant === "fixed"
      ? "fixed left-0 top-0 h-screen w-60 flex flex-col z-40"
      : "h-full w-full flex flex-col";

  return (
    <aside className={containerClass} style={{ backgroundColor: "#003c7e" }}>
      <div className="px-5 py-5 flex items-center gap-3">
        <img src={logo} alt="Neuron Garage" className="w-10 h-10" />
        <span className="text-white text-lg font-bold tracking-tight">Neuron Garage</span>
      </div>

      <nav className="flex-1 flex flex-col gap-1 px-3">
        {navItems.map((item) => {
          const active = isActive(item.url);
          return (
            <NavLink
              key={item.title}
              to={item.url}
              end={item.url === "/"}
              onClick={onNavigate}
              className="group flex items-center gap-3 px-3 rounded-lg text-sm transition-colors"
              style={{
                minHeight: 44,
                backgroundColor: active ? "rgba(255,255,255,0.10)" : "transparent",
                borderLeft: active ? "3px solid #fd7e14" : "3px solid transparent",
                color: active ? "#ffffff" : "rgba(255,255,255,0.60)",
                fontWeight: active ? 600 : 400,
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.85)"; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.60)"; }}
            >
              <item.icon size={18} />
              <span>{item.title}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
