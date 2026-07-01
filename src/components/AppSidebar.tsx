import { useState } from "react";
import { Home, Map, Users, Kanban, ChevronLeft, ChevronRight, ChevronDown, Mail, FileText, BookOpen, Send, MailOpen, Calculator, Gauge, Activity, FileCode2, KeyRound, Network, Wand2, Plug, ShieldCheck, PieChart, BookMarked, BarChart3, Building2, MapPin, PlayCircle, type LucideIcon } from "lucide-react";

import { NavLink, useLocation } from "react-router-dom";
import { prefetchRoute } from "@/lib/routePrefetch";
import logo from "@/assets/neuron-garage-logo.png";
import { useSidebarCollapsed } from "@/lib/sidebarState";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


const primaryNavItems = [
  { title: "Dashboard", url: "/", icon: Home, demo: false },
  { title: "City Search", url: "/city-scoring", icon: Map, demo: false },
  { title: "Market Validation", url: "/market-validation", icon: BarChart3, demo: false },
  { title: "Site Analysis", url: "/site-analysis", icon: Building2, demo: false },
  { title: "Teacher Search", url: "/teacher-prospects", icon: Users, demo: false },
  { title: "Email Outreach", url: "/email-outreach", icon: Mail, demo: false },
  { title: "Candidate Pipeline", url: "/candidate-pipeline", icon: Kanban, demo: false },
  { title: "Data Observability", url: "/observability", icon: Activity, demo: false },
];

const utilityNavItems = [
  { title: "Team Members", url: "/settings/team", icon: Users },
  { title: "User's Guide", url: "/users-guide", icon: BookOpen },
];

const docsNavItems = [
  { title: "Credentials & Handover", url: "/handover", icon: KeyRound },
  { title: "System Architecture", url: "/architecture", icon: Network },
  { title: "Prompts & AI Workflows", url: "/docs/prompts-and-ai-workflows", icon: Wand2 },
  { title: "APIs & Data Sources", url: "/docs/apis", icon: Plug },
  { title: "Guardrails", url: "/docs/guardrails", icon: ShieldCheck },
  { title: "Scoring Method", url: "/scoring-method", icon: Gauge },
  { title: "CSI Methodology", url: "/methodology", icon: Calculator },
  { title: "MVS v1.5 Spec", url: "/mvs-spec", icon: ShieldCheck },
  { title: "MVS Methodology", url: "/mvs-methodology", icon: BarChart3 },
  
  { title: "SAS Methodology", url: "/sas-methodology", icon: MapPin },
  { title: "Demographics Method", url: "/demographics-methodology", icon: PieChart },
  { title: "Candidate Pipeline", url: "/candidate-pipeline-methodology", icon: Kanban },
  { title: "Observability Guide", url: "/observability-guide", icon: Activity },
  { title: "Observability Spec", url: "/observability-spec", icon: FileCode2 },
  { title: "Outreach Guide", url: "/email-outreach-docs", icon: MailOpen },
  { title: "SmartLead API Spec", url: "/smartlead-spec", icon: Send },
  { title: "Glossary", url: "/glossary", icon: BookMarked },
  { title: "Full Specification", url: "/spec", icon: FileText },
];

const SIDEBAR_ICON_SIZE = 17;
const sidebarIconClass = "h-[17px] w-[17px] min-h-[17px] min-w-[17px] shrink-0";

function SidebarIcon({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon size={SIDEBAR_ICON_SIZE} strokeWidth={2} className={sidebarIconClass} aria-hidden="true" />;
}


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
    const isDemo = "demo" in item && (item as { demo?: boolean }).demo === true;
    const link = (
      <NavLink
        key={item.title}
        to={item.url}
        end={item.url === "/"}
        onClick={onNavigate}
        onMouseEnter={() => prefetchRoute(item.url)}
        onFocus={() => prefetchRoute(item.url)}
        className={`group flex min-h-[28px] items-center rounded-lg text-[13px] transition-all ${isCollapsed ? "justify-center px-0" : "gap-3 px-3"} ${active ? "bg-[#1f5bff] font-medium text-white" : "bg-transparent font-medium text-[#14233b] hover:bg-[#f7faff] hover:text-[#0757ff]"}`}
      >
        <SidebarIcon icon={item.icon} />
        {!isCollapsed && (
          <span className="flex flex-1 items-center justify-between gap-2 whitespace-nowrap">
            <span>{item.title}</span>
            {isDemo && (
              <span
                className={`rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wide ${active ? "bg-white/20 text-white" : "bg-[rgba(253,126,20,0.12)] text-[#a35200]"}`}
              >
                Demo
              </span>
            )}
          </span>
        )}
      </NavLink>
    );

    if (!isCollapsed) return link;
    return (
      <Tooltip key={item.title} delayDuration={150}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>{item.title}{isDemo ? " (demo)" : ""}</TooltipContent>
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
                <div className="mt-1 text-[9.5px] font-bold uppercase leading-none tracking-[0.30em] text-[#0757ff]">Development</div>
              </div>
            )}
          </div>
          {variant === "fixed" && (
            <button onClick={() => setCollapsed(!collapsed)} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-[#eef2f7] bg-white text-[#14233b] shadow-[0_4px_10px_rgba(15,23,42,0.03)] hover:bg-[#f7faff] hover:text-[#0757ff]" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
              {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
            </button>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pb-12">
          <nav className={`flex flex-col ${isCollapsed ? "gap-2 px-2" : "gap-0.5 px-3.5"}`}>
            {primaryNavItems.map((item) => renderLink(item))}
          </nav>

          <div className={`${isCollapsed ? "mx-3 my-5" : "mx-3.5 my-5"} h-px bg-[#eef2f7]`} />

          <nav className={`flex flex-col ${isCollapsed ? "gap-2 px-2" : "gap-0.5 px-3.5"}`}>
            {utilityNavItems.map((item) => renderLink(item))}

            {/* Methodology & Docs — collapsible group keeps the sidebar tidy for v1.0 */}
            {isCollapsed ? (
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      setCollapsed(false);
                      setDocsOpen(true);
                    }}
                    className={`group flex min-h-[28px] w-full items-center justify-center rounded-lg text-[13px] transition-all ${docsActive ? "bg-[#1f5bff] font-medium text-white" : "font-medium text-[#14233b] hover:bg-[#f7faff] hover:text-[#0757ff]"}`}
                    aria-label="Open Methodology & Docs"
                  >
                    <SidebarIcon icon={BookMarked} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>Methodology &amp; Docs</TooltipContent>
              </Tooltip>

            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setDocsOpen((v) => !v)}
                  className={`flex min-h-[28px] items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-all ${docsActive ? "text-[#0757ff]" : "text-[#14233b] hover:bg-[#f7faff] hover:text-[#0757ff]"}`}
                  aria-expanded={docsOpen}
                >
                  <SidebarIcon icon={BookMarked} />
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
        </div>
      </aside>
    </TooltipProvider>
  );
}
