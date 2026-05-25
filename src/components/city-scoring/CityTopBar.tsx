import { Bell, ChevronDown, Download, FileText, LogOut, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NeuronAiButton } from "@/components/neuron-ai/NeuronAiButton";

interface Props {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  screenMode: string;
  onExportCsv: () => void;
  onOpenReport: () => void;
  initials: string;
  displayName: string;
  role?: string | null;
  email?: string | null;
  onNavigateTeam: () => void;
  onLogout: () => void;
}

export function CityTopBar({
  searchTerm, setSearchTerm, screenMode, onExportCsv, onOpenReport,
  initials, displayName, role, email, onNavigateTeam, onLogout,
}: Props) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="relative flex-1 max-w-[680px]">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8794ab]" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search city, suburb, metro, or school district…"
          className="pl-9 h-10 bg-white border-[#e5eaf2] text-sm"
        />
      </div>
      {screenMode !== "spreadsheet" && (
        <Button variant="outline" className="h-10 border-[#e5eaf2] text-[#14233b] gap-2 font-normal" onClick={onExportCsv}>
          <Download size={15} /> Export Source Data
        </Button>
      )}
      <Button className="h-10 bg-[#174be8] hover:bg-[#1240c9] text-white gap-2 font-medium px-3.5" onClick={onOpenReport}>
        <FileText size={15} /> Market Report
      </Button>
      <NeuronAiButton />
      <button
        type="button"
        className="relative flex items-center justify-center rounded-full bg-white text-[#526078] hover:bg-[#f3f6fb]"
        aria-label="Notifications"
        style={{ width: 36, height: 36, border: "1px solid #eef2f7" }}
      >
        <Bell size={16} strokeWidth={1.75} />
        <span className="absolute -right-0.5 -top-0.5 flex items-center justify-center rounded-full bg-[#e11d48] text-[9px] font-bold text-white" style={{ width: 14, height: 14 }}>3</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full px-1 py-0.5 hover:bg-[#f7faff]">
            <span className="flex items-center justify-center rounded-full bg-[#174be8] text-sm font-bold text-white" style={{ width: 34, height: 34 }}>{initials}</span>
            <span className="hidden text-left md:block">
              <span className="block text-[13px] font-bold leading-4 text-[#07142f]">{displayName.split("@")[0]}</span>
              {role && <span className="block text-[10px] uppercase leading-3 tracking-wide text-[#526078]">{role}</span>}
            </span>
            <ChevronDown className="hidden h-4 w-4 text-[#526078] md:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium truncate">{displayName}</span>
              {email && (
                <span className="text-xs text-muted-foreground truncate">{email}</span>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {role === "admin" && (
            <>
              <DropdownMenuItem onClick={onNavigateTeam}>
                <Settings className="mr-2 h-4 w-4" /> Team members
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
