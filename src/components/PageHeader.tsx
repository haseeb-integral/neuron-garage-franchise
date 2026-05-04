import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { JourneyBar } from "@/components/JourneyBar";
import { GlobalSearch } from "@/components/GlobalSearch";
import { HelpCircle, LogOut, Settings, Bell } from "lucide-react";
import { startTour } from "@/lib/tour";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  const navigate = useNavigate();
  const { profile, user, role, signOut } = useAuth();
  const displayName = profile?.full_name || profile?.email || user?.email || "Account";
  const initials = (displayName.match(/\b\w/g) || []).slice(0, 1).join("").toUpperCase() || "U";

  const handleLogout = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="hidden md:block w-full max-w-[690px] [&_input]:h-10">
          <GlobalSearch />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            className="relative hidden items-center justify-center rounded-full border border-[#d8e2ef] bg-white text-[#526078] transition-colors hover:bg-[#f3f7ff] hover:text-[#174be8] md:flex"
            aria-label="Notifications"
            style={{ width: 34, height: 34, minWidth: 34, minHeight: 34 }}
          >
            <Bell size={16} />
            <span className="absolute -right-0.5 -top-1 flex min-w-4 items-center justify-center rounded-full bg-[#174be8] px-1 text-[10px] font-bold text-white" style={{ height: 16 }}>
              3
            </span>
          </button>

          <button
            onClick={() => startTour()}
            aria-label="Restart guided tour"
            title="Restart guided tour"
            className="hidden items-center justify-center rounded-full border border-[#d8e2ef] bg-white text-[#526078] transition-colors hover:bg-[#f3f7ff] hover:text-[#174be8] md:flex"
            style={{ width: 34, height: 34, minWidth: 34, minHeight: 34 }}
          >
            <HelpCircle size={16} />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full px-2 py-1 transition-colors hover:bg-[#f3f7ff]" aria-label="Open account menu">
                <span className="flex items-center justify-center rounded-full bg-[#174be8] text-sm font-bold text-white" style={{ width: 34, height: 34, minWidth: 34, minHeight: 34 }}>
                  {initials}
                </span>
                <span className="hidden text-left md:block">
                  <span className="block text-sm font-bold leading-4 text-[#07142f]">{displayName.split("@")[0]}</span>
                  {role && <span className="block text-[11px] uppercase leading-4 tracking-wide text-[#526078]">{role}</span>}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium truncate">{displayName}</span>
                  {(profile?.email || user?.email) && (
                    <span className="text-xs text-muted-foreground truncate">
                      {profile?.email || user?.email}
                    </span>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {role === "admin" && (
                <>
                  <DropdownMenuItem onClick={() => navigate("/settings/team")}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Team members</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-[29px] font-black leading-tight tracking-tight" style={{ color: "#07142f" }}>
            {title}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#526078" }}>
            {subtitle}
          </p>
        </div>

        {action && (
          <div className="flex shrink-0 flex-wrap items-center gap-3 lg:flex-nowrap lg:justify-end">
            {action}
          </div>
        )}
      </div>

      <JourneyBar />
    </>
  );
}
