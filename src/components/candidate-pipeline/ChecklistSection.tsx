import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { StageId } from "@/data/pipelineData";

interface ChecklistItem {
  id: string;
  label: string;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
}

interface Props {
  candidateDbId: string;
  stage: StageId;
  kind: "homework" | "process";
  seedLabels: string[];
  addPlaceholder?: string;
  emptyText?: string;
}

/**
 * Persisted, per-candidate checklist backed by `candidate_checklist_items`.
 * Reused for stage homework (kind="homework") and process roadmap (kind="process").
 */
export function ChecklistSection({
  candidateDbId,
  stage,
  kind,
  seedLabels,
  addPlaceholder = "Add an item…",
  emptyText = "No items yet.",
}: Props) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("candidate_checklist_items")
        .select("id, label, is_completed, completed_at, completed_by")
        .eq("candidate_id", candidateDbId)
        .eq("stage", stage as any)
        .eq("kind", kind)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error("Failed to load checklist", error);
        toast.error("Couldn't load checklist", { description: error.message });
        setItems([]);
        setLoading(false);
        return;
      }

      if ((data?.length ?? 0) === 0 && seedLabels.length > 0) {
        const seedRows = seedLabels.map((label) => ({
          candidate_id: candidateDbId,
          stage: stage as any,
          label,
          is_completed: false,
          kind,
        }));
        const { data: inserted, error: insertErr } = await supabase
          .from("candidate_checklist_items")
          .insert(seedRows)
          .select("id, label, is_completed, completed_at, completed_by");
        if (cancelled) return;
        if (insertErr) {
          console.error("Failed to seed checklist", insertErr);
          toast.error("Couldn't seed checklist", { description: insertErr.message });
          setItems([]);
        } else {
          setItems(inserted ?? []);
        }
      } else {
        setItems(data ?? []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [candidateDbId, stage, kind, seedLabels]);

  const handleToggle = async (item: ChecklistItem, checked: boolean) => {
    const previous = items;
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, is_completed: checked, completed_at: checked ? new Date().toISOString() : null }
          : i,
      ),
    );
    const { data: sess } = await supabase.auth.getUser();
    const email = sess?.user?.email ?? null;
    const { error } = await supabase
      .from("candidate_checklist_items")
      .update({
        is_completed: checked,
        completed_at: checked ? new Date().toISOString() : null,
        completed_by: checked ? email : null,
      })
      .eq("id", item.id);
    if (error) {
      setItems(previous);
      toast.error("Couldn't update item", { description: error.message });
    }
  };

  const handleAdd = async () => {
    const label = newLabel.trim();
    if (!label) return;
    setAdding(true);
    const { data, error } = await supabase
      .from("candidate_checklist_items")
      .insert({
        candidate_id: candidateDbId,
        stage: stage as any,
        label,
        is_completed: false,
        kind,
      })
      .select("id, label, is_completed, completed_at, completed_by")
      .single();
    setAdding(false);
    if (error || !data) {
      toast.error("Couldn't add item", { description: error?.message });
      return;
    }
    setItems((prev) => [...prev, data]);
    setNewLabel("");
  };

  const handleDelete = async (item: ChecklistItem) => {
    const previous = items;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    const { error } = await supabase
      .from("candidate_checklist_items")
      .delete()
      .eq("id", item.id);
    if (error) {
      setItems(previous);
      toast.error("Couldn't delete item", { description: error.message });
    }
  };

  if (loading) {
    return <p className="text-xs" style={{ color: "#6c757d" }}>Loading…</p>;
  }

  return (
    <>
      {items.length === 0 ? (
        <p className="text-xs mb-3" style={{ color: "#6c757d" }}>{emptyText}</p>
      ) : (
        <div className="space-y-2 mb-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 group">
              <label className="flex items-center gap-2 cursor-pointer flex-1">
                <Checkbox
                  checked={item.is_completed}
                  onCheckedChange={(v) => handleToggle(item, !!v)}
                />
                <span className="text-sm">{item.label}</span>
              </label>
              <button
                type="button"
                onClick={() => handleDelete(item)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
                aria-label={`Delete ${item.label}`}
                title="Delete item"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: "#dee2e6" }}>
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder={addPlaceholder}
          className="h-8 text-sm"
          disabled={adding}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleAdd}
          disabled={adding || !newLabel.trim()}
          className="h-8"
        >
          <Plus size={14} className="mr-1" />
          Add
        </Button>
      </div>
    </>
  );
}
