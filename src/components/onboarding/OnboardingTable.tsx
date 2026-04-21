import { Franchisee, computeProgressPct } from "@/data/onboardingData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "./StatusBadge";
import { ChevronRight } from "lucide-react";

interface Props {
  franchisees: Franchisee[];
  onSelect: (id: string) => void;
}

export function OnboardingTable({ franchisees, onSelect }: Props) {
  return (
    <div className="bg-white rounded-lg" style={{ border: "1px solid #dee2e6" }}>
      <div className="overflow-x-auto rounded-lg">
        <Table>
        <TableHeader>
          <TableRow style={{ backgroundColor: "#f8f9fa" }}>
            <TableHead style={{ color: "#003c7e" }}>Name</TableHead>
            <TableHead style={{ color: "#003c7e" }}>City</TableHead>
            <TableHead style={{ color: "#003c7e" }}>Current Step</TableHead>
            <TableHead style={{ color: "#003c7e" }} className="w-[200px]">Progress</TableHead>
            <TableHead style={{ color: "#003c7e" }}>Days Elapsed</TableHead>
            <TableHead style={{ color: "#003c7e" }}>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {franchisees.map((f) => {
            const pct = computeProgressPct(f.currentStep);
            return (
              <TableRow
                key={f.id}
                onClick={() => onSelect(f.id)}
                className="cursor-pointer"
              >
                <TableCell className="font-semibold" style={{ color: "#003c7e" }}>{f.name}</TableCell>
                <TableCell>{f.city}, {f.state}</TableCell>
                <TableCell>
                  <span className="text-sm font-medium">Step {f.currentStep} / 7</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={pct} className="h-2" />
                    <span className="text-xs font-medium w-10" style={{ color: "#6c757d" }}>{pct}%</span>
                  </div>
                </TableCell>
                <TableCell>{f.daysElapsed} days</TableCell>
                <TableCell><StatusBadge status={f.status} /></TableCell>
                <TableCell><ChevronRight size={16} style={{ color: "#adb5bd" }} /></TableCell>
              </TableRow>
            );
          })}
          {franchisees.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8" style={{ color: "#adb5bd" }}>
                No franchisees in onboarding yet. Start one from the Candidate Pipeline.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
