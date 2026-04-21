import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download } from "lucide-react";

interface Props {
  stateFilter: string;
  tierFilter: string;
  minScore: number;
  onStateChange: (v: string) => void;
  onTierChange: (v: string) => void;
  onMinScoreChange: (v: number) => void;
}

export function FilterBar({ stateFilter, tierFilter, minScore, onStateChange, onTierChange, onMinScoreChange }: Props) {
  return (
    <div className="bg-white p-4 rounded-lg mb-6 flex flex-wrap items-center gap-4" style={{ border: '1px solid #dee2e6' }}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium" style={{ color: '#343a40' }}>State:</span>
        <Select value={stateFilter} onValueChange={onStateChange}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All</SelectItem>
            <SelectItem value="Texas">Texas</SelectItem>
            <SelectItem value="Florida">Florida</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium" style={{ color: '#343a40' }}>Tier:</span>
        <Select value={tierFilter} onValueChange={onTierChange}>
          <SelectTrigger className="w-[100px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All</SelectItem>
            <SelectItem value="A">A</SelectItem>
            <SelectItem value="B">B</SelectItem>
            <SelectItem value="C">C</SelectItem>
            <SelectItem value="D">D</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2 min-w-[200px]">
        <span className="text-sm font-medium whitespace-nowrap" style={{ color: '#343a40' }}>Min Score: {minScore}</span>
        <Slider value={[minScore]} onValueChange={([v]) => onMinScoreChange(v)} max={100} step={1} className="w-[120px]" />
      </div>
      <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:ml-auto">
        <Button className="h-9 text-white flex-1 sm:flex-none" style={{ backgroundColor: '#fd7e14' }} onClick={() => {}}>
          <RefreshCw size={14} className="mr-1" /> Refresh Data
        </Button>
        <Button variant="outline" className="h-9 flex-1 sm:flex-none" onClick={() => {}}>
          <Download size={14} className="mr-1" /> Export CSV
        </Button>
      </div>
    </div>
  );
}
