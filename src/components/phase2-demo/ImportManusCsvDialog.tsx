// Import from Manus CSV — writes to the standalone `mvs_manus_cities`
// reference table. Does NOT touch the human shortlist (mvs_shortlist_cities)
// and does NOT trigger the pipeline. Pure reference data.

import { useCallback, useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { Upload, Loader2, CheckCircle2, SkipForward, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type ParsedRow = {
  city: string;
  state: string;
  manus_csi_score: number | null;
  rank: number | null;
};

type RowStatus = "will_add" | "duplicate" | "duplicate_in_file" | "unknown_city" | "below_threshold" | "invalid";

type PreviewRow = ParsedRow & {
  status: RowStatus;
  reason?: string;
};

interface Props {
  onImported: () => void; // parent refresh
}

const STATE_NAMES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO",
  montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", ohio: "OH",
  oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
  "district of columbia": "DC",
};

function normState(raw: string): string {
  const t = raw.trim();
  if (t.length === 2) return t.toUpperCase();
  const code = STATE_NAMES[t.toLowerCase()];
  return code ?? t.toUpperCase();
}

function normNum(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(String(raw).replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function ImportManusCsvDialog({ onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [existing, setExisting] = useState<Set<string>>(new Set()); // "city|ST"
  const [knownCities, setKnownCities] = useState<Set<string>>(new Set()); // "city|ST" from us_cities_scored
  const [threshold, setThreshold] = useState<number>(0);
  const [importing, setImporting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setFileName(null);
    setRows([]);
    setThreshold(0);
    setParseError(null);
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  // Load lookups when dialog opens
  useEffect(() => {
    if (!open) return;
    void (async () => {
      const [{ data: existingData }, { data: cityData }] = await Promise.all([
        supabase.from("mvs_manus_cities").select("city, state"),
        supabase.from("us_cities_scored").select("city_name, state_abbr").limit(50000),
      ]);
      const ex = new Set<string>();
      (existingData ?? []).forEach((r: { city: string; state: string }) => {
        ex.add(`${r.city.toLowerCase()}|${r.state.toUpperCase()}`);
      });
      setExisting(ex);
      const known = new Set<string>();
      (cityData ?? []).forEach((r: { city_name: string; state_abbr: string }) => {
        known.add(`${r.city_name.toLowerCase()}|${r.state_abbr.toUpperCase()}`);
      });
      setKnownCities(known);
    })();
  }, [open]);

  const handleFile = (file: File) => {
    setParsing(true);
    setParseError(null);
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
      complete: (result) => {
        setParsing(false);
        try {
          const parsed: ParsedRow[] = [];
          for (const raw of result.data) {
            const city = (raw.city ?? "").trim();
            const stateRaw = (raw.state ?? "").trim();
            if (!city || !stateRaw) continue;
            parsed.push({
              city,
              state: normState(stateRaw),
              manus_csi_score: normNum(raw.manus_csi_score ?? raw.csi_score ?? raw.csi),
              rank: normNum(raw.rank),
            });
          }
          if (parsed.length === 0) {
            setParseError("No valid rows found. Make sure the CSV has 'city' and 'state' headers.");
          }
          setRows(parsed);
        } catch (e) {
          setParseError((e as Error).message);
        }
      },
      error: (err) => {
        setParsing(false);
        setParseError(err.message);
      },
    });
  };

  const preview: PreviewRow[] = useMemo(() => {
    const seenInFile = new Set<string>();
    return rows.map((r) => {
      if (r.state.length !== 2) {
        return { ...r, status: "invalid", reason: "Invalid state code" };
      }
      const key = `${r.city.toLowerCase()}|${r.state}`;
      if (seenInFile.has(key)) {
        return { ...r, status: "duplicate_in_file", reason: "Repeated row in CSV" };
      }
      if (knownCities.size > 0 && !knownCities.has(key)) {
        seenInFile.add(key);
        return { ...r, status: "unknown_city", reason: "Not in US cities DB" };
      }
      if (r.manus_csi_score !== null && r.manus_csi_score < threshold) {
        seenInFile.add(key);
        return { ...r, status: "below_threshold" };
      }
      seenInFile.add(key);
      if (existing.has(key)) return { ...r, status: "duplicate" }; // will refresh
      return { ...r, status: "will_add" };
    });
  }, [rows, existing, knownCities, threshold]);

  const counts = useMemo(() => {
    const c = { will_add: 0, duplicate: 0, duplicate_in_file: 0, unknown_city: 0, below_threshold: 0, invalid: 0 };
    preview.forEach((r) => { c[r.status]++; });
    return c;
  }, [preview]);

  const toWriteCount = counts.will_add + counts.duplicate;

  const handleImport = async () => {
    const rowsToWrite = preview.filter((r) => r.status === "will_add" || r.status === "duplicate");
    if (rowsToWrite.length === 0) return;
    setImporting(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;
      if (!uid) throw new Error("You must be signed in.");
      const payload = rowsToWrite.map((r) => ({
        city: r.city,
        state: r.state,
        manus_csi_score: r.manus_csi_score,
        rank: r.rank,
        imported_by: uid,
        imported_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from("mvs_manus_cities")
        .upsert(payload, { onConflict: "city,state" });
      if (error) throw new Error(error.message);
      toast.success("Manus reference table updated", {
        description: `${counts.will_add} added, ${counts.duplicate} refreshed.`,
      });
      onImported();
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const statusBadge = (s: RowStatus) => {
    switch (s) {
      case "will_add":
        return <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700"><CheckCircle2 className="h-3 w-3" />Will add</span>;
      case "duplicate":
        return <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700"><CheckCircle2 className="h-3 w-3" />Will refresh</span>;
      case "duplicate_in_file":
        return <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"><SkipForward className="h-3 w-3" />Duplicate in file</span>;
      case "unknown_city":
        return <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"><AlertTriangle className="h-3 w-3" />Unknown city</span>;
      case "below_threshold":
        return <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">Below CSI</span>;
      case "invalid":
        return <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700"><X className="h-3 w-3" />Invalid</span>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-[#174be8] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#174be8] shadow-sm hover:bg-[#f0f4ff]"
        >
          <Upload className="h-3.5 w-3.5" /> Import from Manus CSV
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import cities from Manus CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV with <code>city</code>, <code>state</code>, and optional <code>manus_csi_score</code>.
            Rows are saved to a separate Manus reference table — the human shortlist and the pipeline are not touched.
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 && (
          <div className="rounded-lg border-2 border-dashed border-slate-300 p-6 text-center">
            <Upload className="mx-auto mb-2 h-8 w-8 text-slate-400" />
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <span className="rounded-md bg-[#174be8] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#1240c8]">
                {parsing ? "Parsing…" : "Choose CSV file"}
              </span>
            </label>
            <p className="mt-2 text-[11px] text-slate-500">
              Required headers: <code>city</code>, <code>state</code> (2-letter). Optional: <code>manus_csi_score</code>, <code>rank</code>.
            </p>
            {parseError && <p className="mt-2 text-[12px] text-rose-600">{parseError}</p>}
          </div>
        )}

        {rows.length > 0 && (
          <>
            {/* Summary */}
            <div className="flex flex-wrap items-center gap-3 rounded-md bg-slate-50 px-3 py-2 text-[12px]">
              <span className="font-semibold text-slate-700">{fileName}</span>
              <span className="text-slate-400">•</span>
              {counts.will_add > 0 && <span className="text-emerald-700">{counts.will_add} new</span>}
              {counts.duplicate > 0 && <span className="text-blue-700">{counts.duplicate} will refresh</span>}
              {counts.duplicate_in_file > 0 && <span className="text-slate-600">{counts.duplicate_in_file} duplicates in file</span>}
              {counts.unknown_city > 0 && <span className="text-amber-700">{counts.unknown_city} unknown</span>}
              {counts.below_threshold > 0 && <span className="text-slate-500">{counts.below_threshold} below CSI</span>}
              {counts.invalid > 0 && <span className="text-rose-600">{counts.invalid} invalid</span>}
              <button
                type="button"
                onClick={reset}
                className="ml-auto text-[11px] text-slate-500 underline hover:text-slate-700"
              >
                Choose different file
              </button>
            </div>

            {/* CSI threshold */}
            <div className="flex items-center gap-3 text-[12px]">
              <label className="font-medium text-slate-700">Only import if Manus CSI ≥</label>
              <Input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value) || 0)}
                className="h-7 w-20 text-[12px]"
                min={0}
                max={100}
                step={1}
              />
              <span className="text-slate-500">(set to 0 to import all)</span>
            </div>

            {/* Preview table */}
            <div className="max-h-[360px] overflow-auto rounded-md border border-slate-200">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase text-slate-500">
                  <tr>
                    <th className="px-2 py-1.5 text-left">City</th>
                    <th className="px-2 py-1.5 text-left">State</th>
                    <th className="px-2 py-1.5 text-right">Manus CSI</th>
                    <th className="px-2 py-1.5 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-2 py-1">{r.city}</td>
                      <td className="px-2 py-1">{r.state}</td>
                      <td className="px-2 py-1 text-right tabular-nums text-slate-600">
                        {r.manus_csi_score ?? "—"}
                      </td>
                      <td className="px-2 py-1">{statusBadge(r.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <DialogFooter className="gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={importing}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={importing || counts.will_add === 0}
          >
            {importing && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Confirm import ({counts.will_add})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
