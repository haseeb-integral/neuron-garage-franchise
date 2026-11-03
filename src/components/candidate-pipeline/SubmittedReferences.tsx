import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { Answers } from "@/lib/portalForms/types";

/** Read-only prospect answers; staff call notes stay separate. */
export function SubmittedReferences({ candidateId }: { candidateId: string }) {
  const query = useQuery({
    queryKey: ["staff-submitted-references", candidateId], staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("candidate_portal_signatures")
        .select("form_key,answers_snapshot,signed_at").eq("candidate_id", candidateId)
        .in("form_key", ["references", "rfc"]).order("signed_at", { ascending: false });
      if (error) throw error;
      const source = data.find((row) => row.form_key === "references") ?? data.find((row) => Array.isArray((row.answers_snapshot as Answers).references));
      return source ? { source: source.form_key, refs: (source.answers_snapshot as Answers).references as Answers[] } : null;
    },
  });
  if (query.isPending) return <p className="text-sm text-muted-foreground">Loading submitted references…</p>;
  if (query.isError) return <Button variant="outline" size="sm" onClick={() => query.refetch()}>Retry submitted references</Button>;
  if (!query.data) return <p className="text-sm text-muted-foreground">The prospect has not submitted references yet.</p>;
  return <div className="mb-4 space-y-3"><h3 className="text-sm font-semibold">Prospect's submitted references{query.data.source === "rfc" ? " — from earlier Request for Consideration" : ""}</h3>
    {query.data.refs.map((reference, index) => <dl key={index} className="border-b pb-3 text-sm grid gap-1 sm:grid-cols-2">
      {[['name', 'Name'], ['relationship', 'Relationship to You'], ['email', 'Email'], ['phone', 'Phone']].map(([key, label]) => <div key={key}><dt className="text-muted-foreground">{label}</dt><dd className="break-words whitespace-pre-wrap">{String(reference[key] ?? "—")}</dd></div>)}
    </dl>)}
  </div>;
}