import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Pencil } from "lucide-react";

export function RequestFormCorrection({ formId, onRequested }: { formId: string; onRequested: () => void }) {
  const [open, setOpen] = useState(false); const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  return <><Button variant="outline" size="sm" onClick={() => setOpen(true)}><Pencil className="h-4 w-4" /> Request correction</Button>
    <Dialog open={open} onOpenChange={(v) => { if (!busy) setOpen(v); }}><DialogContent><DialogHeader><DialogTitle>Request a form correction</DialogTitle><DialogDescription>The original signed copy stays saved. The prospect will review and submit a new copy.</DialogDescription></DialogHeader>
    <label htmlFor="correction-reason" className="text-sm font-medium">What needs correcting?</label><Textarea id="correction-reason" value={reason} maxLength={2000} onChange={(e) => setReason(e.target.value)} />
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button disabled={busy || !reason.trim()} onClick={async () => { setBusy(true); setError(""); const { error: failure } = await supabase.rpc("portal_request_correction", { _form_id: formId, _reason: reason }); setBusy(false); if (failure) { setError(failure.message); return; } setOpen(false); setReason(""); onRequested(); }}>{busy ? "Requesting…" : "Request correction"}</Button>
    </DialogContent></Dialog>
  </>;
}