import { useState } from "react";
import { Home, Map, Users, Kanban, ChevronLeft, ChevronRight, ChevronDown, Mail, FileText, BookOpen, Send, MailOpen, BarChart3, Calculator, Gauge, LibraryBig, Activity, FileCode2 } from "lucide-react";

import { NavLink, useLocation } from "react-router-dom";
import logo from "@/assets/neuron-garage-logo.png";
import { useSidebarCollapsed } from "@/lib/sidebarState";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const primaryNavItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "City Search", url: "/city-scoring", icon: Map },
  { title: "Teacher Search", url: "/teacher-prospects", icon: Users },
  { title: "Email Outreach", url: "/email-outreach", icon: Mail },
  { title: "Candidate Pipeline", url: "/candidate-pipeline", icon: Kanban },
  { title: "Data Observability", url: "/observability", icon: Activity },
];

const utilityNavItems = [
  { title: "Team Members", url: "/settings/team", icon: Users },
  { title: "User's Guide", url: "/users-guide", icon: BookOpen },
];

const docsNavItems = [
  { title: "Scoring Method", url: "/scoring-method", icon: Gauge },
  { title: "CSI Methodology", url: "/methodology", icon: Calculator },
  { title: "Demographics Method", url: "/demographics-methodology", icon: BarChart3 },
  { title: "Observability Guide", url: "/observability-guide", icon: Activity },
  { title: "Observability Spec", url: "/observability-spec", icon: FileCode2 },

  { title: "Outreach Guide", url: "/email-outreach-docs", icon: MailOpen },
  { title: "SmartLead API Spec", url: "/smartlead-spec", icon: Send },
  { title: "Full Specification", url: "/spec", icon: FileText },
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
  const docsActive = docsNavItems.some((d) => location.pathname.startsWith(d.url));
  const [docsOpen, setDocsOpen] = useState(docsActive);

  const isActive = (url: string) => (url === "/" ? location.pathname === "/" : location.pathname.startsWith(url));

  const renderLink = (item: NavItem) => {
    const active = isActive(item.url);
    const link = (
      <NavLink
        key={item.title}
        to={item.url}
        end={item.url === "/"}
        onClick={onNavigate}
        className={`group flex min-h-[34px] items-center rounded-lg text-[13px] transition-all ${isCollapsed ? "justify-center px-0" : "gap-3 px-3"} ${active ? "bg-[#1f5bff] font-medium text-white" : "bg-transparent font-medium text-[#14233b] hover:bg-[#f7faff] hover:text-[#0757ff]"}`}
      >
        <item.icon size={17} strokeWidth={1.75} />
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
      <aside className={`${variant === "fixed" ? `fixed left-0 top-0 h-screen ${widthClass}` : "h-full w-full"} z-40 flex flex-col border-r border-[#eef2f7] bg-white transition-[width] duration-200`}>
        <div className={`flex items-start ${isCollapsed ? "flex-col gap-3 px-2 py-4" : "gap-2 px-3.5 pb-5 pt-4"}`}>
          <div className={`flex items-center gap-2 ${isCollapsed ? "w-full justify-center" : "min-w-0 flex-1"}`}>
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
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <NeuronAiButton />
              <button onClick={() => setCollapsed(!collapsed)} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-[#eef2f7] bg-white text-[#14233b] shadow-[0_4px_10px_rgba(15,23,42,0.03)] hover:bg-[#f7faff] hover:text-[#0757ff]" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
                {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
              </button>
            </div>
          )}
        </div>

        <nav className={`flex flex-col ${isCollapsed ? "gap-2 px-2" : "gap-2.5 px-3.5"}`}>
          {primaryNavItems.map((item) => renderLink(item))}
        </nav>

        <div className={`${isCollapsed ? "mx-3 my-5" : "mx-3.5 my-5"} h-px bg-[#eef2f7]`} />

        <nav className={`flex flex-col ${isCollapsed ? "gap-2 px-2" : "gap-2.5 px-3.5"}`}>
          {utilityNavItems.map((item) => renderLink(item))}

          {/* Methodology & Docs — collapsible group keeps the sidebar tidy for v1.0 */}
          {isCollapsed ? (
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <NavLink
                  to={docsNavItems[0].url}
                  onClick={onNavigate}
                  className={`group flex min-h-[34px] items-center justify-center rounded-lg text-[13px] transition-all ${docsActive ? "bg-[#1f5bff] font-medium text-white" : "font-medium text-[#14233b] hover:bg-[#f7faff] hover:text-[#0757ff]"}`}
                >
                  <LibraryBig size={17} strokeWidth={1.75} />
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>Methodology &amp; Docs</TooltipContent>
            </Tooltip>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setDocsOpen((v) => !v)}
                className={`flex min-h-[34px] items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-all ${docsActive ? "text-[#0757ff]" : "text-[#14233b] hover:bg-[#f7faff] hover:text-[#0757ff]"}`}
                aria-expanded={docsOpen}
              >
                <LibraryBig size={17} strokeWidth={1.75} />
                <span className="flex-1 whitespace-nowrap text-left">Methodology &amp; Docs</span>
                <ChevronDown size={14} className={`transition-transform ${docsOpen ? "rotate-180" : ""}`} />
              </button>
              {docsOpen && (
                <div className="flex flex-col gap-1 pl-2">
                  {docsNavItems.map((item) => renderLink(item))}
                </div>
              )}
            </>
          )}
        </nav>
      </aside>
    </TooltipProvider>
  );
}
