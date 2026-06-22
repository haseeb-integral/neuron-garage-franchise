import { Candidate } from "@/data/pipelineData";
import { CandidateFileDropzone } from "../CandidateFileDropzone";
import { StageDocumentsSection } from "../StageDocumentsSection";
import { ComplianceSection } from "../ComplianceSection";

interface Props {
  candidate: Candidate;
}

export function DocumentsTab({ candidate }: Props) {
  const dbId = (candidate as any).dbId as string | undefined;

  if (!dbId) {
    return (
      <div className="mt-4 rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
        This candidate hasn't been saved to the database yet. Save the candidate before uploading documents.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <StageDocumentsSection candidateDbId={dbId} stage={candidate.stage} />
      <ComplianceSection candidateDbId={dbId} stage={candidate.stage} />

      <div>
        <h3 className="text-sm font-semibold mb-1">All Documents</h3>
        <p className="text-xs text-muted-foreground">
          Drag &amp; drop any candidate files here (signed NDAs, financials, supporting docs).
          Files are private to staff and can be removed at any time.
        </p>
      </div>
      <CandidateFileDropzone candidateDbId={dbId} category="general" />
    </div>
  );
}
