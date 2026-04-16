import { Home, Map, Users, Kanban, ClipboardCheck } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useLocation } from "react-router-dom";

const navItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "City Scoring", url: "/city-scoring", icon: Map },
  { title: "Teacher Prospects", url: "/teacher-prospects", icon: Users },
  { title: "Candidate Pipeline", url: "/candidate-pipeline", icon: Kanban },
  { title: "Onboarding", url: "/onboarding", icon: ClipboardCheck },
];

export function AppSidebar() {
  const location = useLocation();

  const isActive = (url: string) => {
    if (url === "/") return location.pathname === "/";
    return location.pathname.startsWith(url);
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 flex flex-col z-50" style={{ backgroundColor: '#003c7e' }}>
      <div className="px-5 py-6">
        <h1 className="text-white text-lg font-bold tracking-tight">🧠 Neuron Garage</h1>
      </div>

      <nav className="flex-1 flex flex-col gap-1 px-3">
        {navItems.map((item) => {
          const active = isActive(item.url);
          return (
            <NavLink
              key={item.title}
              to={item.url}
              end={item.url === "/"}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: active ? '#004ea4' : 'transparent',
                color: active ? '#4ba0ff' : 'rgba(255,255,255,0.75)',
              }}
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
