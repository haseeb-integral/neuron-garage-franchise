import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Check, Loader2, StickyNote } from "lucide-react";

interface Props {
  cityId: string | null | undefined;
}

type SaveState = "idle" | "loading" | "saving" | "saved" | "error";

export function CityNotesEditor({ cityId }: Props) {
  const [value, setValue] = useState("");
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);
  const lastSavedRef = useRef<string>("");

  // Load notes when cityId changes
  useEffect(() => {
    if (!cityId) {
      setValue("");
      lastSavedRef.current = "";
      setState("idle");
      return;
    }
    let cancelled = false;
    setState("loading");
    setError(null);
    (async () => {
      const { data, error } = await supabase
        .from("us_cities_scored")
        .select("notes")
        .eq("id", cityId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setState("error");
        return;
      }
      const next = (data as any)?.notes ?? "";
      setValue(next);
      lastSavedRef.current = next;
      setState("idle");
    })();
    return () => {
      cancelled = true;
    };
  }, [cityId]);

  // Debounced save
  useEffect(() => {
    if (!cityId) return;
    if (state === "loading") return;
    if (value === lastSavedRef.current) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setState("saving");
      setError(null);
      const { error } = await supabase
        .from("us_cities_scored")
        .update({ notes: value })
        .eq("id", cityId);
      if (error) {
        setError(error.message);
        setState("error");
        return;
      }
      lastSavedRef.current = value;
      setState("saved");
      window.setTimeout(() => setState((s) => (s === "saved" ? "idle" : s)), 1500);
    }, 700);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [value, cityId, state]);

  return (
    <div className="mb-4 rounded-lg border border-[#eef2f7] bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-[#eef2f7] bg-[#f8fafe] px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <StickyNote size={12} className="text-[#526078]" />
          <h5 className="text-[12px] font-bold text-[#07142f]">Notes</h5>
        </div>
        <span className="text-[10px] font-semibold text-[#8794ab] flex items-center gap-1">
          {state === "loading" && (<><Loader2 size={10} className="animate-spin" /> Loading…</>)}
          {state === "saving" && (<><Loader2 size={10} className="animate-spin" /> Saving…</>)}
          {state === "saved" && (<><Check size={10} className="text-[#1f9d55]" /> Saved</>)}
          {state === "error" && <span className="text-[#c03434]">Error</span>}
        </span>
      </div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add research notes for this city. Auto-saved."
        className="min-h-[88px] border-0 rounded-none rounded-b-lg text-[12px] resize-y focus-visible:ring-0 focus-visible:ring-offset-0"
        disabled={!cityId || state === "loading"}
      />
      {error && (
        <p className="px-3 pb-2 text-[10px] text-[#c03434]">{error}</p>
      )}
    </div>
  );
}
