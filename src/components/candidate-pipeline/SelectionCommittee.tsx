import { Candidate, CommitteeVotes } from "@/data/pipelineData";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface Props {
  candidate: Candidate;
  onVote: (member: keyof CommitteeVotes, vote: "approve" | "decline") => void;
}

export function SelectionCommittee({ candidate, onVote }: Props) {
  const members: (keyof CommitteeVotes)[] = ["Kaylie", "Sam", "Skylar"];
  const approves = members.filter((m) => candidate.votes[m] === "approve").length;
  const declines = members.filter((m) => candidate.votes[m] === "decline").length;

  return (
    <div className="bg-white rounded-lg p-4 mt-4" style={{ border: "1px solid #dee2e6" }}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-sm" style={{ color: "#003c7e" }}>Selection Committee</h4>
        <div className="text-xs" style={{ color: "#6c757d" }}>
          <span style={{ color: "#20c997" }} className="font-semibold">{approves} approve</span>
          {" · "}
          <span style={{ color: "#ff4438" }} className="font-semibold">{declines} decline</span>
        </div>
      </div>
      <div className="space-y-2">
        {members.map((m) => {
          const v = candidate.votes[m];
          return (
            <div key={m} className="flex items-center justify-between">
              <span className="text-sm font-medium">{m}</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={v === "approve" ? "default" : "outline"}
                  onClick={() => onVote(m, "approve")}
                  style={v === "approve" ? { backgroundColor: "#20c997", color: "#fff" } : {}}
                >
                  <Check size={14} /> Approve
                </Button>
                <Button
                  size="sm"
                  variant={v === "decline" ? "default" : "outline"}
                  onClick={() => onVote(m, "decline")}
                  style={v === "decline" ? { backgroundColor: "#ff4438", color: "#fff" } : {}}
                >
                  <X size={14} /> Decline
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
