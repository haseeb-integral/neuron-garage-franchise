import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { STAGES, StageId } from "@/data/pipelineData";
import { deriveFitTag } from "@/utils/fitScore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TeamMember {
  email: string;
  firstName: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  teamMembers: TeamMember[];
  onCreated: (row: any) => void;
}

import { toDbStage } from "@/lib/stageDbMapping";
const uiStageToDb = (s: StageId): string => toDbStage(s);

const ACTIVE_STAGES = STAGES.filter((s) => s.id !== "disqualified");

const schema = z.object({
  first_name: z.string().trim().min(1, "Required").max(60),
  last_name: z.string().trim().min(1, "Required").max(60),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().max(40).optional(),
  city: z.string().trim().min(1, "Required").max(80),
  state: z.string().trim().length(2, "2 letters").regex(/^[A-Za-z]{2}$/, "2 letters"),
  assigned_to: z.string().min(1, "Required"),
  initial_stage: z.string().min(1, "Required"),
  fit_score: z.number().int().min(0).max(100),
});

type FormState = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  assigned_to: string;
  initial_stage: StageId;
  fit_score: number;
};

const blank = (defaultOwner: string): FormState => ({
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  city: "",
  state: "",
  assigned_to: defaultOwner,
  initial_stage: "new_lead",
  fit_score: 50,
});

export function NewCandidateModal({ open, onOpenChange, teamMembers, onCreated }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(blank(user?.email ?? ""));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setForm(blank(user?.email ?? ""));
    setErrors({});
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k as string]) setErrors((p) => ({ ...p, [k as string]: "" }));
  };

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        const k = i.path[0] as string;
        if (!errs[k]) errs[k] = i.message;
      });
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    const dbStage = uiStageToDb(form.initial_stage);

    const { data: inserted, error } = await supabase
      .from("candidates")
      .insert({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        email_source: "manual",
        phone: form.phone.trim() || null,
        city: form.city.trim(),
        state: form.state.trim().toUpperCase(),
        current_stage: dbStage as any,
        fit_score: form.fit_score,
        fit_tag: deriveFitTag(form.fit_score),
        status: "active",
        assigned_to: form.assigned_to,
      })
      .select("*")
      .single();

    if (error || !inserted) {
      setSubmitting(false);
      const msg = error?.message ?? "Failed to add candidate";
      if (msg.toLowerCase().includes("duplicate") || msg.includes("unique")) {
        toast.error("A candidate with this email already exists");
      } else {
        toast.error(msg);
      }
      return;
    }

    await supabase.from("candidate_stage_history").insert({
      candidate_id: inserted.id,
      from_stage: null,
      to_stage: dbStage as any,
      changed_by: user?.email ?? null,
      notes: "Manually added",
    });

    setSubmitting(false);
    qc.invalidateQueries({ queryKey: ["candidates"] });
    toast.success("Candidate added successfully");
    onCreated(inserted);
    reset();
    onOpenChange(false);
  };

  const fieldErr = (k: string) =>
    errors[k] ? <p className="text-xs text-destructive mt-1">{errors[k]}</p> : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Candidate</DialogTitle>
          <DialogDescription>
            Add a candidate manually to the pipeline.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          <div>
            <Label htmlFor="first_name">First Name *</Label>
            <Input
              id="first_name"
              value={form.first_name}
              onChange={(e) => set("first_name", e.target.value)}
            />
            {fieldErr("first_name")}
          </div>
          <div>
            <Label htmlFor="last_name">Last Name *</Label>
            <Input
              id="last_name"
              value={form.last_name}
              onChange={(e) => set("last_name", e.target.value)}
            />
            {fieldErr("last_name")}
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="email">Contact Email *</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              This will be saved as the candidate's primary contact email. It is not auto-verified.
            </p>
            {fieldErr("email")}
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
            {fieldErr("phone")}
          </div>
          <div>
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
            />
            {fieldErr("city")}
          </div>

          <div>
            <Label htmlFor="state">State * (2 letters)</Label>
            <Input
              id="state"
              maxLength={2}
              value={form.state}
              onChange={(e) => set("state", e.target.value.toUpperCase())}
            />
            {fieldErr("state")}
          </div>

          <div>
            <Label>Assigned To *</Label>
            <Select
              value={form.assigned_to}
              onValueChange={(v) => set("assigned_to", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select owner" />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map((m) => (
                  <SelectItem key={m.email} value={m.email}>
                    {m.firstName.charAt(0).toUpperCase() + m.firstName.slice(1)} ({m.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErr("assigned_to")}
          </div>

          <div>
            <Label>Initial Stage *</Label>
            <Select
              value={form.initial_stage}
              onValueChange={(v) => set("initial_stage", v as StageId)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVE_STAGES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErr("initial_stage")}
          </div>

          <div>
            <Label htmlFor="fit_score">Fit Score (0–100)</Label>
            <Input
              id="fit_score"
              type="number"
              min={0}
              max={100}
              value={form.fit_score}
              onChange={(e) => set("fit_score", Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Tag will be set to <strong>{deriveFitTag(form.fit_score)}</strong> based on this score.
            </p>
            {fieldErr("fit_score")}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={submitting}
            className="text-white"
            style={{ backgroundColor: "#174be8" }}
          >
            {submitting ? "Adding..." : "Add Candidate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
