import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, HelpCircle, LogOut, Settings, Bell } from "lucide-react";
import { JourneyBar } from "@/components/JourneyBar";
import { GlobalSearch } from "@/components/GlobalSearch";
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
import { NotificationsPopover } from "@/components/NotificationsPopover";
import { useNotifications } from "@/hooks/useNotifications";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  action?: ReactNode;
  hideJourneyBar?: boolean;
  searchPlaceholder?: string;
}

export function PageHeader({ title, subtitle, action, hideJourneyBar = false, searchPlaceholder }: PageHeaderProps) {
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
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="hidden md:block w-full max-w-[760px]">
          <GlobalSearch placeholder={searchPlaceholder} />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            className="relative hidden items-center justify-center rounded-full bg-white text-[#526078] transition-colors hover:bg-[#f3f6fb] hover:text-[#174be8] md:flex"
            aria-label="Notifications"
            style={{ width: 36, height: 36, minWidth: 36, minHeight: 36, border: "1px solid #eef2f7" }}
          >
            <Bell size={16} strokeWidth={1.75} />
            <span className="absolute -right-0.5 -top-0.5 flex items-center justify-center rounded-full bg-[#e11d48] text-[9px] font-bold text-white" style={{ width: 14, height: 14 }}>
              3
            </span>
          </button>

          <button
            onClick={() => startTour()}
            aria-label="Restart guided tour"
            title="Restart guided tour"
            className="hidden items-center justify-center rounded-full bg-white text-[#526078] transition-colors hover:bg-[#f3f6fb] hover:text-[#174be8] md:flex"
            style={{ width: 36, height: 36, minWidth: 36, minHeight: 36, border: "1px solid #eef2f7" }}
          >
            <HelpCircle size={16} strokeWidth={1.75} />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full px-1 py-0.5 transition-colors hover:bg-[#f7faff]" aria-label="Open account menu">
                <span className="flex items-center justify-center rounded-full bg-[#174be8] text-sm font-bold text-white" style={{ width: 34, height: 34, minWidth: 34, minHeight: 34 }}>
                  {initials}
                </span>
                <span className="hidden text-left md:block">
                  <span className="block text-[13px] font-bold leading-4 text-[#07142f]">{displayName.split("@")[0]}</span>
                  {role && <span className="block text-[10px] uppercase leading-3 tracking-wide text-[#526078]">{role}</span>}
                </span>
                <ChevronDown className="hidden h-4 w-4 text-[#526078] md:block" />
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

      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-black leading-tight tracking-tight" style={{ color: "#07142f" }}>
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

      {!hideJourneyBar && <JourneyBar />}
    </>
  );
}
