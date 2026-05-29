import { Candidate, QualificationScores, TrialClose, ActivityEntry } from "@/data/pipelineData";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { OverviewTab } from "./tabs/OverviewTab";
import { LeadSheetTab } from "./tabs/LeadSheetTab";
import { QualificationTab } from "./tabs/QualificationTab";
import { NotesActivityTab } from "./tabs/NotesActivityTab";
import { StageHistoryTab } from "./tabs/StageHistoryTab";
import { HomeworkTab } from "./tabs/HomeworkTab";
import { CommitteeVotesTab } from "./tabs/CommitteeVotesTab";
import { DocumentsTab } from "./tabs/DocumentsTab";
import { CandidateAvatar } from "@/components/ui/CandidateAvatar";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { exportResearchPacket } from "./exportResearchPacket";
import { isEnabled } from "@/lib/featureFlags";
import { toast } from "sonner";

interface TeamMember { email: string; firstName: string; }

interface Props {
  candidate: Candidate | null;
  onClose: () => void;
  onUpdate: (c: Candidate) => void;
  onSaveProfile?: (patch: Record<string, any>, localPatch: Partial<Candidate>) => Promise<void> | void;
  teamMembers?: TeamMember[];
}

export function CandidateDetailPanel({ candidate, onClose, onUpdate, onSaveProfile, teamMembers }: Props) {
  if (!candidate) return null;

  const handleScoreChange = (key: keyof QualificationScores, value: number) => {
    onUpdate({ ...candidate, qualificationScores: { ...candidate.qualificationScores, [key]: value } });
  };

  const handleScoresReplace = (scores: QualificationScores) => {
    onUpdate({ ...candidate, qualificationScores: scores });
  };

  const handleAddNote = (content: string) => {
    const next: ActivityEntry = {
      id: Math.max(0, ...candidate.activity.map((a) => a.id)) + 1,
      type: "note",
      author: "You",
      timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
      content,
    };
    onUpdate({ ...candidate, activity: [next, ...candidate.activity] });
  };

  const handleTrialClose = (key: keyof TrialClose, value: boolean) => {
    onUpdate({ ...candidate, trialClose: { ...candidate.trialClose, [key]: value } });
  };




  return (
    <Sheet open={!!candidate} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto p-0" style={{ backgroundColor: "#ffffff" }}>
        <SheetHeader className="px-6 pt-6 pb-4" style={{ backgroundColor: "#f7faff", borderBottom: "1px solid #e3e8ef" }}>
          <div className="flex items-start justify-between pr-8 gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <CandidateAvatar
                name={candidate.name}
                photoUrl={candidate.photoUrl}
                size={40}
                className="mt-1"
              />
              <div className="min-w-0">
                <SheetTitle style={{ color: "#07142f" }} className="text-2xl truncate font-semibold">{candidate.name}</SheetTitle>
                <p className="text-sm mt-1" style={{ color: "#526078" }}>
                  {candidate.city}, {candidate.state} · {candidate.email}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "#8893a7" }}>
                  Owner: {candidate.assignedTo}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 shrink-0">
              
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 hover:bg-[#174be8]/5"
                style={{ color: "#174be8", borderColor: "#174be8" }}
                onClick={async () => {
                  try {
                    await exportResearchPacket(candidate);
                  } catch (e: any) {
                    toast.error("Couldn't build packet", { description: e?.message ?? String(e) });
                  }
                }}
              >
                <FileDown size={13} /> Export Packet
              </Button>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="overview" className="mt-0 px-5 pb-5">
          <div className="overflow-x-auto -mx-1 px-1 pt-3 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            <TabsList className="inline-flex w-max gap-1 h-auto p-1 bg-transparent">
              <TabsTrigger value="overview" className="whitespace-nowrap px-3 data-[state=active]:text-[#174be8] data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#174be8] rounded-none text-[#526078]">Overview</TabsTrigger>
              <TabsTrigger value="lead-sheet" className="whitespace-nowrap px-3 data-[state=active]:text-[#174be8] data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#174be8] rounded-none text-[#526078]">Lead Sheet</TabsTrigger>
              <TabsTrigger value="qualification" className="whitespace-nowrap px-3 data-[state=active]:text-[#174be8] data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#174be8] rounded-none text-[#526078]">Qualification</TabsTrigger>
              <TabsTrigger value="notes" className="whitespace-nowrap px-3 data-[state=active]:text-[#174be8] data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#174be8] rounded-none text-[#526078]">Notes &amp; Activity</TabsTrigger>
              <TabsTrigger value="stage-history" className="whitespace-nowrap px-3 data-[state=active]:text-[#174be8] data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#174be8] rounded-none text-[#526078]">Stage History</TabsTrigger>
              <TabsTrigger value="homework" className="whitespace-nowrap px-3 data-[state=active]:text-[#174be8] data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#174be8] rounded-none text-[#526078]">Homework</TabsTrigger>
              <TabsTrigger value="committee" className="whitespace-nowrap px-3 data-[state=active]:text-[#174be8] data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#174be8] rounded-none text-[#526078]">Committee Votes</TabsTrigger>
              {isEnabled("FF_DOCUMENTS") && (
                <TabsTrigger value="documents" className="whitespace-nowrap px-3 data-[state=active]:text-[#174be8] data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#174be8] rounded-none text-[#526078]">Documents</TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="overview">
            <OverviewTab candidate={candidate} teamMembers={teamMembers} onSave={onSaveProfile} />
          </TabsContent>
          <TabsContent value="lead-sheet">
            <LeadSheetTab candidate={candidate} />
          </TabsContent>
          <TabsContent value="qualification">
            <QualificationTab candidate={candidate} onScoreChange={handleScoreChange} onScoresReplace={handleScoresReplace} />
          </TabsContent>
          <TabsContent value="notes">
            <NotesActivityTab candidate={candidate} onAddNote={handleAddNote} />
          </TabsContent>
          <TabsContent value="stage-history">
            <StageHistoryTab candidate={candidate} />
          </TabsContent>
          <TabsContent value="homework">
            <HomeworkTab candidate={candidate} onTrialCloseChange={handleTrialClose} />
          </TabsContent>
          <TabsContent value="committee">
            <CommitteeVotesTab candidate={candidate} />
          </TabsContent>
          {isEnabled("FF_DOCUMENTS") && (
            <TabsContent value="documents">
              <DocumentsTab candidate={candidate} />
            </TabsContent>
          )}
        </Tabs>

      </SheetContent>
    </Sheet>
  );
}
