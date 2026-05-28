import { Candidate, QualificationScores, TrialClose, CommitteeVotes, ActivityEntry } from "@/data/pipelineData";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FitScoreBadge } from "@/components/teacher-prospects/FitScoreBadge";
import { OverviewTab } from "./tabs/OverviewTab";
import { LeadSheetTab } from "./tabs/LeadSheetTab";
import { QualificationTab } from "./tabs/QualificationTab";
import { NotesActivityTab } from "./tabs/NotesActivityTab";
import { StageHistoryTab } from "./tabs/StageHistoryTab";
import { HomeworkTab } from "./tabs/HomeworkTab";
import { CommitteeVotesTab } from "./tabs/CommitteeVotesTab";
import { SelectionCommittee } from "./SelectionCommittee";
import { CandidateAvatar } from "@/components/ui/CandidateAvatar";

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

  const handleVote = (member: keyof CommitteeVotes, vote: "approve" | "decline") => {
    const current = candidate.votes[member];
    onUpdate({
      ...candidate,
      votes: { ...candidate.votes, [member]: current === vote ? null : vote },
    });
  };



  return (
    <Sheet open={!!candidate} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto" style={{ backgroundColor: "#f2f4f6" }}>
        <SheetHeader>
          <div className="flex items-start justify-between pr-8 gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <CandidateAvatar
                name={candidate.name}
                photoUrl={candidate.photoUrl}
                size={40}
                className="mt-1"
              />
              <div className="min-w-0">
                <SheetTitle style={{ color: "#003c7e" }} className="text-2xl truncate">{candidate.name}</SheetTitle>
                <p className="text-sm mt-1" style={{ color: "#6c757d" }}>
                  {candidate.city}, {candidate.state} · {candidate.email}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "#adb5bd" }}>
                  Owner: {candidate.assignedTo}
                </p>
              </div>
            </div>
            <FitScoreBadge score={candidate.fitScore} />
          </div>
        </SheetHeader>

        <Tabs defaultValue="overview" className="mt-6">
          <div className="overflow-x-auto -mx-1 px-1">
            <TabsList className="inline-flex w-max gap-1 h-auto p-1">
              <TabsTrigger value="overview" className="whitespace-nowrap px-3">Overview</TabsTrigger>
              <TabsTrigger value="lead-sheet" className="whitespace-nowrap px-3">Lead Sheet</TabsTrigger>
              <TabsTrigger value="qualification" className="whitespace-nowrap px-3">Qualification</TabsTrigger>
              <TabsTrigger value="notes" className="whitespace-nowrap px-3">Notes &amp; Activity</TabsTrigger>
              <TabsTrigger value="stage-history" className="whitespace-nowrap px-3">Stage History</TabsTrigger>
              <TabsTrigger value="homework" className="whitespace-nowrap px-3">Homework</TabsTrigger>
              <TabsTrigger value="committee" className="whitespace-nowrap px-3">Committee Votes</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview">
            <OverviewTab candidate={candidate} />
          </TabsContent>
          <TabsContent value="lead-sheet">
            <LeadSheetTab candidate={candidate} />
          </TabsContent>
          <TabsContent value="qualification">
            <QualificationTab candidate={candidate} onScoreChange={handleScoreChange} />
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
        </Tabs>

        {candidate.stage === "immersion" && (
          <SelectionCommittee candidate={candidate} onVote={handleVote} />
        )}
      </SheetContent>
    </Sheet>
  );
}
