import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileSearch, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { buildAuditRows, auditRowsToCsv, type AuditRow } from "@/lib/fddAuditReport";

async function loadRows(): Promise<AuditRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const [cand, comp, sends, events, sigs, files, proofs] = await Promise.all([
    db.from("candidates").select("id, first_name, last_name, email"),
    db.from("candidate_compliance").select("candidate_id, fdd_sent_at, fdd_received_at, fa_signed_at, fdd_file_id"),
    db.from("fdd_email_sends").select("candidate_id, fdd_file_id, recipient_email, actor_email, file_name, issuance_date, file_sha256, status, sent_at"),
    db.from("fdd_delivery_events").select("candidate_id, fdd_file_id, event, at"),
    db.from("candidate_portal_signatures").select("candidate_id, signer_name, signed_at, ip, pdf_sha256, fdd_file_id, correction_request_id").eq("form_key", "item23"),
    db.from("portal_step_files").select("id, file_name, fdd_issuance_date, file_sha256"),
    db.from("candidate_files").select("candidate_id, category, file_name").in("category", ["fdd_proof", "fa_proof"]).is("deleted_at", null),
  ]);
  const err = [cand, comp, sends, events, sigs, files, proofs].find((r) => r.error)?.error;
  if (err) throw err;
  return buildAuditRows({
    candidates: cand.data ?? [], compliance: comp.data ?? [], sends: sends.data ?? [], events: events.data ?? [],
    signatures: sigs.data ?? [], fddFiles: files.data ?? [], proofFiles: proofs.data ?? [],
  });
}

export function FddAuditReportDialog() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [signedOnly, setSignedOnly] = useState(false);
  const q = useQuery({ queryKey: ["fdd-audit-report"], queryFn: loadRows, enabled: open, staleTime: 0 });

  const rows = useMemo(() => (q.data ?? []).filter((r) => {
    if (search && !`${r.name} ${r.email}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (from && r.fddSentDate < from) return false;
    if (to && r.fddSentDate > to) return false;
    if (signedOnly && !r.faSignedDate) return false;
    return true;
  }), [q.data, search, from, to, signedOnly]);

  const download = () => {
    const blob = new Blob([auditRowsToCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `FDD-Audit-Report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full sm:w-auto"><FileSearch size={14} /> FDD Audit Report</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] w-[1300px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>FDD Audit Trail Report</DialogTitle>
          <DialogDescription>Every prospect sent an FDD, with Item 23 receipt and franchise agreement dates. Read-only.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-end gap-3">
          <Input placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
          <label className="text-xs text-muted-foreground">FDD sent from<Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /></label>
          <label className="text-xs text-muted-foreground">to<Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" /></label>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={signedOnly} onCheckedChange={(v) => setSignedOnly(v === true)} /> Only signed agreements</label>
          <Button size="sm" onClick={download} disabled={!rows.length} className="ml-auto"><Download size={14} /> Download CSV</Button>
        </div>
        <div className="overflow-auto border rounded-md flex-1">
          {q.isLoading ? (
            <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>
          ) : q.error ? (
            <div className="p-6 text-sm text-destructive">Could not load the report. Please try again.</div>
          ) : !rows.length ? (
            <div className="p-6 text-sm text-muted-foreground">No prospects match.</div>
          ) : (
            <table className="text-xs w-full">
              <thead className="bg-muted sticky top-0">
                <tr className="text-left">
                  {["Prospect", "FDD version", "How sent", "Date sent", "Proof of sending", "Item 23 received", "How received", "Proof of Item 23", "Item 23 signature", "Agreement signed", "Days"].map((h) => (
                    <th key={h} className="p-2 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.candidateId} className="border-t align-top">
                    <td className="p-2"><div className="font-medium">{r.name}</div><div className="text-muted-foreground">{r.email}</div></td>
                    <td className="p-2">{r.fddVersion || "—"}{r.fddFingerprint && <div className="text-muted-foreground break-all">SHA-256 {r.fddFingerprint.slice(0, 12)}…</div>}</td>
                    <td className="p-2 whitespace-nowrap">{r.fddMethod}{r.resendCount > 0 && <div className="text-muted-foreground">+{r.resendCount} resend{r.resendCount > 1 ? "s" : ""}</div>}</td>
                    <td className="p-2 whitespace-nowrap">{r.fddSentDate}</td>
                    <td className="p-2 min-w-[220px]">{r.fddProof}</td>
                    <td className="p-2 whitespace-nowrap">{r.item23Date || "—"}</td>
                    <td className="p-2 whitespace-nowrap">{r.item23Method || "—"}</td>
                    <td className="p-2 min-w-[200px] break-all">{r.item23Proof || "—"}</td>
                    <td className="p-2 min-w-[160px] italic">{r.item23Signature || "—"}</td>
                    <td className="p-2 whitespace-nowrap">{r.faSignedDate || "—"}</td>
                    <td className={`p-2 font-semibold ${r.daysSentToSigned != null && r.daysSentToSigned < 14 ? "text-destructive" : ""}`}>{r.daysSentToSigned ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{rows.length} prospect{rows.length === 1 ? "" : "s"}. Days in red are under 14.</p>
      </DialogContent>
    </Dialog>
  );
}
