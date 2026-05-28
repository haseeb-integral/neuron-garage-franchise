import { useEffect, useState } from "react";
import { Candidate } from "@/data/pipelineData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users } from "lucide-react";

interface Props {
  candidate: Candidate;
}

type VoteValue = "approve" | "needs_info" | "reject";

interface VoteRow {
  id: string;
  voter: string;
  vote: VoteValue;
  comment: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
}

const VOTE_LABEL: Record<VoteValue, string> = {
  approve: "Approve",
  needs_info: "Needs more info",
  reject: "Reject",
};

const VOTE_COLOR: Record<VoteValue, string> = {
  approve: "#20c997",
  needs_info: "#ffca28",
  reject: "#ff4438",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CommitteeVotesTab({ candidate }: Props) {
  const dbId = (candidate as any).dbId as string | undefined;
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [profilesByEmail, setProfilesByEmail] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [myEmail, setMyEmail] = useState<string | null>(null);
  const [voteValue, setVoteValue] = useState<VoteValue | "">("");
  const [comment, setComment] = useState("");
  const [isProxy, setIsProxy] = useState(false);
  const [proxyEmail, setProxyEmail] = useState("");

  const load = async () => {
    if (!dbId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("candidate_votes")
      .select("*")
      .eq("candidate_id", dbId)
      .order("updated_at", { ascending: false });
    if (error) {
      toast.error("Couldn't load votes", { description: error.message });
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as VoteRow[];
    setVotes(rows);

    const emails = Array.from(
      new Set(rows.flatMap((r) => [r.voter, r.recorded_by].filter(Boolean) as string[])),
    );
    if (emails.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("email, full_name")
        .in("email", emails);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => {
        if (p.email) map[p.email] = p.full_name || p.email;
      });
      setProfilesByEmail(map);
    } else {
      setProfilesByEmail({});
    }
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sess } = await supabase.auth.getUser();
      if (cancelled) return;
      setMyEmail(sess?.user?.email ?? null);
    })();
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbId]);

  const proxyEmailTrimmed = proxyEmail.trim().toLowerCase();
  const proxyEmailValid = !isProxy || (EMAIL_RE.test(proxyEmailTrimmed) && proxyEmailTrimmed !== myEmail?.toLowerCase());

  const handleSubmit = async () => {
    if (!dbId || !voteValue || !myEmail) return;
    if (isProxy && !proxyEmailValid) {
      toast.error("Enter a valid teammate email different from your own.");
      return;
    }
    const voter = isProxy ? proxyEmailTrimmed : myEmail;
    setSubmitting(true);
    const { error } = await supabase
      .from("candidate_votes")
      .upsert(
        {
          candidate_id: dbId,
          voter,
          vote: voteValue,
          comment: comment.trim() || null,
          recorded_by: isProxy ? myEmail : null,
        },
        { onConflict: "candidate_id,voter" },
      );
    setSubmitting(false);
    if (error) {
      toast.error("Couldn't save vote", { description: error.message });
      return;
    }
    setVoteValue("");
    setComment("");
    setIsProxy(false);
    setProxyEmail("");
    toast.success(isProxy ? `Proxy vote recorded for ${voter}` : "Vote recorded");
    load();
  };

  const counts = {
    approve: votes.filter((v) => v.vote === "approve").length,
    needs_info: votes.filter((v) => v.vote === "needs_info").length,
    reject: votes.filter((v) => v.vote === "reject").length,
  };

  const displayName = (email: string) => profilesByEmail[email] || email;

  return (
    <div className="space-y-4 pt-4">
      <div className="bg-white rounded-lg p-4" style={{ border: "1px solid #dee2e6" }}>
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} style={{ color: "#003c7e" }} />
          <h4 className="font-semibold text-sm" style={{ color: "#003c7e" }}>Vote summary</h4>
        </div>
        <div className="text-sm" style={{ color: "#495057" }}>
          <span className="font-semibold" style={{ color: VOTE_COLOR.approve }}>{counts.approve} Approve</span>
          {" · "}
          <span className="font-semibold" style={{ color: VOTE_COLOR.needs_info }}>{counts.needs_info} Needs Info</span>
          {" · "}
          <span className="font-semibold" style={{ color: VOTE_COLOR.reject }}>{counts.reject} Reject</span>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 space-y-3" style={{ border: "1px solid #dee2e6" }}>
        <h4 className="font-semibold text-sm" style={{ color: "#003c7e" }}>Add a vote</h4>
        {!myEmail ? (
          <p className="text-xs" style={{ color: "#6c757d" }}>You must be signed in to vote.</p>
        ) : !dbId ? (
          <p className="text-xs" style={{ color: "#6c757d" }}>Votes can only be recorded for saved candidates.</p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Checkbox
                id="proxy-vote"
                checked={isProxy}
                onCheckedChange={(v) => setIsProxy(v === true)}
              />
              <Label htmlFor="proxy-vote" className="text-xs cursor-pointer" style={{ color: "#495057" }}>
                Record on behalf of another committee member (proxy vote)
              </Label>
            </div>
            {isProxy && (
              <div className="space-y-1">
                <Input
                  type="email"
                  placeholder="teammate@example.com"
                  value={proxyEmail}
                  onChange={(e) => setProxyEmail(e.target.value)}
                />
                {proxyEmail && !proxyEmailValid && (
                  <p className="text-[11px]" style={{ color: "#ff4438" }}>
                    Enter a valid email different from your own.
                  </p>
                )}
                <p className="text-[11px]" style={{ color: "#6c757d" }}>
                  Saved as their vote; you'll be shown as the recorder.
                </p>
              </div>
            )}
            <Select value={voteValue} onValueChange={(v) => setVoteValue(v as VoteValue)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select vote" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approve">Approve</SelectItem>
                <SelectItem value="needs_info">Needs more info</SelectItem>
                <SelectItem value="reject">Reject</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Optional comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={!voteValue || submitting || (isProxy && !proxyEmailValid)}
                className="text-white"
                style={{ backgroundColor: "#003c7e" }}
              >
                {submitting ? "Saving…" : isProxy ? "Record Proxy Vote" : "Add Vote"}
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="bg-white rounded-lg p-4" style={{ border: "1px solid #dee2e6" }}>
        <h4 className="font-semibold text-sm mb-3" style={{ color: "#003c7e" }}>Committee votes</h4>
        {loading ? (
          <p className="text-xs" style={{ color: "#6c757d" }}>Loading…</p>
        ) : votes.length === 0 ? (
          <p className="text-xs" style={{ color: "#6c757d" }}>No votes yet.</p>
        ) : (
          <ul className="space-y-3">
            {votes.map((v) => (
              <li key={v.id} className="border-t pt-3 first:border-0 first:pt-0" style={{ borderColor: "#e9ecef" }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">
                    {displayName(v.voter)}
                    {v.recorded_by && (
                      <span
                        className="ml-2 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: "#eef2f7", color: "#526078" }}
                      >
                        Proxy
                      </span>
                    )}
                  </div>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded"
                    style={{ backgroundColor: VOTE_COLOR[v.vote], color: "#ffffff" }}
                  >
                    {VOTE_LABEL[v.vote]}
                  </span>
                </div>
                {v.comment && (
                  <p className="text-sm mt-1" style={{ color: "#495057" }}>{v.comment}</p>
                )}
                <div className="text-[11px] mt-1" style={{ color: "#adb5bd" }}>
                  {new Date(v.updated_at).toLocaleString()}
                  {v.recorded_by && (
                    <span> · recorded by {displayName(v.recorded_by)}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
