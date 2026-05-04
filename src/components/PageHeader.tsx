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

/**
 * Shared page header: compact title/action row + global search/account controls + JourneyBar.
 * Keeps existing GlobalSearch functionality while preserving a dense dashboard view.
 */
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
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="min-w-0 pt-1">
          <h1 className="text-2xl md:text-[28px] font-black leading-tight tracking-tight" style={{ color: "#07142f" }}>
            {title}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#526078" }}>
            {subtitle}
          </p>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <div className="hidden md:block w-full max-w-[420px] lg:max-w-[500px] xl:max-w-[560px] [&_input]:h-9">
            <GlobalSearch />
          </div>
          {action && (
            <div className="flex items-center gap-2 shrink-0 flex-wrap lg:flex-nowrap [&_button]:h-9 [&_a]:h-9">
              {action}
            </div>
          )}
          <button
            type="button"
            className="relative hidden h-8 w-8 items-center justify-center rounded-full border border-[#d8e2ef] bg-white text-[#526078] transition-colors hover:bg-[#f3f7ff] hover:text-[#0b4f9f] md:flex"
            aria-label="Notifications"
          >
            <Bell size={15} />
            <span className="absolute -right-0.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#0b4f9f] px-1 text-[10px] font-bold text-white">
              3
            </span>
          </button>
          <button
            onClick={() => startTour()}
            aria-label="Restart guided tour"
            title="Restart guided tour"
            className="hidden h-8 w-8 items-center justify-center rounded-full border border-[#d8e2ef] bg-white text-[#526078] transition-colors hover:bg-[#f3f7ff] hover:text-[#0b4f9f] md:flex"
          >
            <HelpCircle size={15} />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full px-1.5 py-0.5 transition-colors hover:bg-[#f3f7ff]" aria-label="Open account menu">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0b4f9f] text-sm font-bold text-white">
                  {initials}
                </span>
                <span className="hidden text-left md:block">
                  <span className="block text-sm font-bold leading-4 text-[#07142f]">{displayName.split("@")[0]}</span>
                  {role && <span className="block text-[10px] uppercase leading-3 tracking-wide text-[#526078]">{role}</span>}
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
      <JourneyBar />
    </>
  );
}
