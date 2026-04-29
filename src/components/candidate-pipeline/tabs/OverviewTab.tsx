import { useRef } from "react";
import { Candidate, STAGES, stateRequiresRegistration } from "@/data/pipelineData";
import { AlertTriangle, Mail, Phone, MapPin, Calendar, User, Tag, Camera } from "lucide-react";
import { CandidateAvatar } from "@/components/ui/CandidateAvatar";
import { toast } from "sonner";

interface Props {
  candidate: Candidate;
}

export function OverviewTab({ candidate }: Props) {
  const stage = STAGES.find((s) => s.id === candidate.stage);
  const needsReg = stateRequiresRegistration(candidate.state);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePickPhoto = () => fileInputRef.current?.click();
  const handleFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast.info("Photo upload coming soon", {
      description: "We'll save it to the candidate record once Lovable Cloud is enabled.",
    });
    e.target.value = "";
  };

  const rows = [
    { icon: Mail, label: "Email", value: candidate.email },
    { icon: Phone, label: "Phone", value: candidate.phone },
    { icon: MapPin, label: "Location", value: `${candidate.city}, ${candidate.state}` },
    { icon: User, label: "Assigned To", value: candidate.assignedTo },
    { icon: Tag, label: "Source", value: candidate.source },
    { icon: Calendar, label: "Created", value: candidate.createdDate },
  ];

  return (
    <div className="space-y-4 pt-4">
      {needsReg && (
        <div
          className="flex items-start gap-2 p-3 rounded-lg"
          style={{ backgroundColor: "#fff4d1", border: "1px solid #ffca28" }}
        >
          <AlertTriangle size={16} style={{ color: "#7a5a00" }} className="mt-0.5" />
          <div className="text-sm" style={{ color: "#7a5a00" }}>
            <strong>{candidate.state}</strong> is a franchise registration state. Confirm legal compliance before sending FDD.
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg p-4" style={{ border: "1px solid #dee2e6" }}>
        <h4 className="font-semibold mb-3 text-sm" style={{ color: "#003c7e" }}>Contact Information</h4>
        <div className="grid grid-cols-2 gap-3">
          {rows.map((r) => (
            <div key={r.label} className="flex items-start gap-2">
              <r.icon size={14} style={{ color: "#6c757d" }} className="mt-1" />
              <div>
                <div className="text-xs" style={{ color: "#6c757d" }}>{r.label}</div>
                <div className="text-sm font-medium">{r.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg p-4" style={{ border: "1px solid #dee2e6" }}>
        <h4 className="font-semibold mb-3 text-sm" style={{ color: "#003c7e" }}>Pipeline Status</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs" style={{ color: "#6c757d" }}>Current Stage</div>
            <div className="text-sm font-medium">{stage?.label}</div>
          </div>
          <div>
            <div className="text-xs" style={{ color: "#6c757d" }}>Days in Stage</div>
            <div className="text-sm font-medium">Day {candidate.daysInStage}</div>
          </div>
          {candidate.fddSentDate && (
            <div>
              <div className="text-xs" style={{ color: "#6c757d" }}>FDD Sent</div>
              <div className="text-sm font-medium">{candidate.fddSentDate}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
