import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Candidate } from "@/data/pipelineData";
import { EventDialog } from "../../EventDialog";

/** Step 1 "Schedule Call": saves the call and sends only a Google Calendar invite with a Meet link. */
export function ScheduleCallButton({ candidate, onSaved }: { candidate: Candidate; onSaved?: () => void }) {
  const [open, setOpen] = useState(false);
  const dbId = (candidate as any).dbId as string | undefined;
  if (!dbId) return null;
  return (
    <div className="mb-3">
      <Button className="font-semibold" onClick={() => setOpen(true)}>
        <CalendarPlus className="mr-2 h-4 w-4" /> Schedule Call
      </Button>
      <p className="mt-1 text-[11px] text-muted-foreground">Sends a Google Calendar invite with a Meet link. No other email is sent.</p>
      <EventDialog
        open={open}
        onOpenChange={setOpen}
        candidates={[candidate]}
        lockedCandidateId={dbId}
        googleInviteOnly
        onSaved={() => { onSaved?.(); window.dispatchEvent(new Event("candidate-events-changed")); }}
      />
    </div>
  );
}
