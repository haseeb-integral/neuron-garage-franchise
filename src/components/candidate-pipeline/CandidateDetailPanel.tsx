import { Candidate, QualificationScores, TrialClose, CommitteeVotes, ActivityEntry } from "@/data/pipelineData";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FitScoreBadge } from "@/components/teacher-prospects/FitScoreBadge";
import { OverviewTab } from "./tabs/OverviewTab";
import { QualificationTab } from "./tabs/QualificationTab";
import { NotesActivityTab } from "./tabs/NotesActivityTab";
import { HomeworkTab } from "./tabs/HomeworkTab";
import { SelectionCommittee } from "./SelectionCommittee";

interface Props {
  candidate: Candidate | null;
  onClose: () => void;
  onUpdate: (c: Candidate) => void;
}

export function CandidateDetailPanel({ candidate, onClose, onUpdate }: Props) {
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
          <div className="flex items-start justify-between pr-8">
            <div>
              <SheetTitle style={{ color: "#003c7e" }} className="text-2xl">{candidate.name}</SheetTitle>
              <p className="text-sm mt-1" style={{ color: "#6c757d" }}>
                {candidate.city}, {candidate.state} · {candidate.email}
              </p>
            </div>
            <FitScoreBadge score={candidate.fitScore} />
          </div>
        </SheetHeader>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="qualification">Qualification</TabsTrigger>
            <TabsTrigger value="notes">Notes & Activity</TabsTrigger>
            <TabsTrigger value="homework">Homework</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab candidate={candidate} />
          </TabsContent>
          <TabsContent value="qualification">
            <QualificationTab candidate={candidate} onScoreChange={handleScoreChange} />
          </TabsContent>
          <TabsContent value="notes">
            <NotesActivityTab candidate={candidate} onAddNote={handleAddNote} />
          </TabsContent>
          <TabsContent value="homework">
            <HomeworkTab candidate={candidate} onTrialCloseChange={handleTrialClose} />
          </TabsContent>
        </Tabs>

        {candidate.stage === "immersion" && (
          <SelectionCommittee candidate={candidate} onVote={handleVote} />
        )}
      </SheetContent>
    </Sheet>
  );
}
