import { Candidate, STAGES, stateRequiresRegistration } from "@/data/pipelineData";
import {
  AlertTriangle, Mail, Phone, MapPin, Calendar as CalendarIcon, User, Tag, Lock, Home, Users,
} from "lucide-react";
import { CandidateAvatar } from "@/components/ui/CandidateAvatar";
import { QualificationSection } from "../QualificationSection";
import { TagSelect } from "../TagSelect";

import { QualificationScores } from "@/data/pipelineData";

interface TeamMember { email: string; firstName: string; }

interface Props {
  candidate: Candidate;
  teamMembers?: TeamMember[];
  onScoresReplace?: (scores: QualificationScores) => void;
}

function Row({ icon: Icon, label, value, locked }: { icon: any; label: string; value?: string; locked?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={14} style={{ color: "#526078" }} className="mt-1" />
      <div className="min-w-0 flex-1">
        <div className="text-xs flex items-center gap-1" style={{ color: "#526078" }}>
          {label}
          {locked && <Lock size={11} style={{ color: "#8893a7" }} aria-label="Locked" />}
        </div>
        <div className="text-sm font-medium truncate">
          {value ? value : <span style={{ color: "#8893a7" }}>—</span>}
        </div>
      </div>
    </div>
  );
}

function CardShell({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg p-3" style={{ border: "1px solid #e3e8ef" }}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} style={{ color: "#07142f" }} />
        <h4 className="font-semibold text-sm" style={{ color: "#07142f" }}>{title}</h4>
      </div>
      {children}
    </div>
  );
}

export function OverviewTab({ candidate, onScoresReplace }: Props) {
  const stage = STAGES.find((s) => s.id === candidate.stage);
  const needsReg = stateRequiresRegistration(candidate.state);

  const mailing = [
    candidate.mailingStreet,
    [candidate.mailingCity, candidate.mailingState].filter(Boolean).join(", "),
    candidate.mailingZip,
  ].filter((p) => p && String(p).trim()).join(" · ");

  return (
    <div className="space-y-3 pt-3">
      <div className="bg-white rounded-lg p-3 flex items-center gap-4" style={{ border: "1px solid #e3e8ef" }}>
        <CandidateAvatar name={candidate.name} photoUrl={candidate.photoUrl} size={64} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold" style={{ color: "#07142f" }}>{candidate.name}</div>
          <div className="text-[11px] mt-1" style={{ color: "#8893a7" }}>
            Summary only — edit these details in the <strong>Qualification Process</strong> tab, Step 1.
          </div>
        </div>
      </div>

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

      <div className="bg-white rounded-lg p-3" style={{ border: "1px solid #e3e8ef" }}>
        <h4 className="font-semibold mb-3 text-sm" style={{ color: "#07142f" }}>Contact Information</h4>
        <div className="grid grid-cols-2 gap-2.5">
          <Row
            icon={Mail}
            label={candidate.emailSource === "manual" ? "Contact Email" : "Verified Email"}
            value={candidate.email}
            locked={candidate.emailSource !== "manual"}
          />
          <Row icon={Mail} label="Other Email" value={candidate.otherEmail} />
          <Row icon={Phone} label="Phone" value={candidate.phone} />
          <Row icon={MapPin} label="Location" value={`${candidate.city}${candidate.state ? `, ${candidate.state}` : ""}`} />
          <Row icon={User} label="Assigned To" value={candidate.assignedTo} />
          <Row
            icon={Tag}
            label="Source"
            value={
              [candidate.sourceType, candidate.sourceName].filter(Boolean).join(" › ") ||
              candidate.source
            }
          />
          <Row icon={Tag} label="Campaign" value={candidate.sourceCampaign} />

          <Row icon={CalendarIcon} label="Created" value={candidate.createdDate} />
        </div>
      </div>

      <CardShell icon={Home} title="Mailing Address">
        <div className="text-sm">
          {mailing || <span style={{ color: "#8893a7" }}>No mailing address on file</span>}
        </div>
      </CardShell>

      <CardShell icon={Users} title="Spouse / Partner">
        {candidate.partnerInvolved ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <Row icon={User} label="Name" value={candidate.partnerName} />
            <Row icon={Mail} label="Email" value={candidate.partnerEmail} />
            <Row icon={Phone} label="Phone" value={candidate.partnerPhone} />
          </div>
        ) : (
          <div className="text-sm" style={{ color: "#8893a7" }}>No partner involved</div>
        )}
      </CardShell>

      <RedFlagsSummary candidateDbId={(candidate as any).dbId} />

      <QualificationSection candidate={candidate} onScoresReplace={onScoresReplace} />

      <div className="bg-white rounded-lg p-3" style={{ border: "1px solid #e3e8ef" }}>
        <h4 className="font-semibold mb-3 text-sm" style={{ color: "#07142f" }}>Pipeline Status</h4>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <div className="text-xs" style={{ color: "#526078" }}>Current Stage</div>
            <div className="text-sm font-medium">{stage?.label}</div>
          </div>
          <div>
            <div className="text-xs" style={{ color: "#526078" }}>Days in Stage</div>
            <div className="text-sm font-medium">Day {candidate.daysInStage}</div>
          </div>
          {candidate.fddSentDate && (
            <div>
              <div className="text-xs" style={{ color: "#526078" }}>FDD Sent</div>
              <div className="text-sm font-medium">{candidate.fddSentDate}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
