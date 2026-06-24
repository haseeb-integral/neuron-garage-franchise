import { useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, Trash2, Upload, Bookmark } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  useSavedSites,
  type SavedSiteRow,
} from "@/hooks/useSavedSites";
import { recomputeSiteScores } from "@/lib/sasMath";


const NAVY = "#07142f";
const MUTED = "#526078";
const BORDER = "#eef2f7";
const BLUE = "#174be8";

const VERDICT_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  strong: { bg: "#e3f3e7", fg: "#1d6b32", label: "Strong" },
  high: { bg: "#eaf5ec", fg: "#2f7a3f", label: "High" },
  medium: { bg: "#fff8d9", fg: "#7a5800", label: "Medium" },
  low: { bg: "#fce7ec", fg: "#a3142b", label: "Low" },
};

function verdictChip(v?: string | null) {
  if (!v) return null;
  return VERDICT_STYLE[v] ?? null;
}


function initials(name?: string | null, email?: string | null) {
  const src = (name && name.trim()) || (email && email.split("@")[0]) || "?";
  return src
    .split(/[ ._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

const EXACT_FMT = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
function exactTime(iso: string) {
  try {
    return EXACT_FMT.format(new Date(iso));
  } catch {
    return iso;
  }
}

function displayName(name?: string | null, email?: string | null) {
  if (name && name.trim()) return name.trim();
  if (email) return email.split("@")[0];
  return "Unknown user";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoad: (row: SavedSiteRow) => void;
  savedSites: ReturnType<typeof useSavedSites>;
}

export function SavedSitesDrawer({ open, onOpenChange, onLoad, savedSites }: Props) {
  const { rows, loading, removeSite, currentUserId, refresh } = savedSites;
  const [filter, setFilter] = useState<"all" | "mine" | "team">("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Refresh when drawer opens to ensure fresh data
  useEffect(() => {
    if (open) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const visible = useMemo(() => {
    if (filter === "mine") return rows.filter((r) => r.user_id === currentUserId);
    if (filter === "team") return rows.filter((r) => r.user_id !== currentUserId);
    return rows;
  }, [rows, filter, currentUserId]);

  const handleRemove = async (row: SavedSiteRow) => {
    setBusyId(row.id);
    try {
      await removeSite(row.id);
      toast.success("Removed from Saved Sites");
    } catch (e) {
      toast.error(`Couldn't remove: ${(e as Error).message}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
        <SheetHeader className="border-b px-5 py-4" style={{ borderColor: BORDER }}>
          <SheetTitle className="flex items-center gap-2" style={{ color: NAVY }}>
            <Bookmark size={16} style={{ color: BLUE }} />
            Saved Sites
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-bold"
              style={{ backgroundColor: "#eef2ff", color: BLUE }}
            >
              {rows.length}
            </span>
          </SheetTitle>
          <SheetDescription style={{ color: MUTED }}>
            Sites your team saved. Click any one to load it back into a card.
          </SheetDescription>
          <div className="mt-3 flex gap-1.5">
            {(["all", "mine", "team"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className="rounded-full border px-3 py-1 text-[11px] font-semibold capitalize"
                style={{
                  borderColor: filter === f ? BLUE : BORDER,
                  backgroundColor: filter === f ? BLUE : "#fff",
                  color: filter === f ? "#fff" : NAVY,
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </SheetHeader>

        <div className="px-5 py-4 space-y-3">
          {loading && (
            <div className="flex items-center gap-2 text-[12px]" style={{ color: MUTED }}>
              <Loader2 size={12} className="animate-spin" /> Loading saved sites…
            </div>
          )}
          {!loading && visible.length === 0 && (
            <div
              className="rounded-lg border border-dashed p-6 text-center text-[12px]"
              style={{ borderColor: BORDER, color: MUTED }}
            >
              {filter === "mine"
                ? "You haven't saved any sites yet."
                : filter === "team"
                ? "No saved sites from teammates yet."
                : "No saved sites yet. Click the bookmark on any site to save it."}
            </div>
          )}
          {visible.map((row) => {
            const snap = row.snapshot_json ?? {};
            const liveComposite =
              snap.pillars ? recomputeSiteScores(snap.pillars).composite : snap.composite ?? null;
            const savedComposite = snap.composite ?? null;
            const band = verdictChip((snap as { verdict?: string | null }).verdict);
            const drift =
              liveComposite != null && savedComposite != null && liveComposite !== savedComposite
                ? liveComposite - savedComposite
                : 0;
            const isMine = row.user_id === currentUserId;
            const canDelete = isMine; // admin override handled by RLS server-side
            return (
              <div
                key={row.id}
                className="rounded-lg border bg-white p-3"
                style={{ borderColor: BORDER }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-1.5">
                      <MapPin size={12} style={{ color: BLUE, marginTop: 3 }} className="shrink-0" />
                      <h4 className="text-[13px] font-bold leading-snug" style={{ color: NAVY }}>
                        {row.site_name}
                      </h4>
                    </div>
                    {row.address && (
                      <p className="mt-0.5 text-[11px]" style={{ color: MUTED }}>
                        {row.address}
                      </p>
                    )}
                    <p className="mt-0.5 text-[10px]" style={{ color: MUTED }}>
                      Inputs: {row.site_type ?? "—"}
                      {row.grade_band ? ` · ${row.grade_band}` : ""}
                      {row.enrollment != null ? ` · enroll ${row.enrollment}` : ""}
                    </p>
                  </div>
                  {liveComposite != null && (
                    <div className="flex shrink-0 flex-col items-end">
                      <div
                        className="text-[22px] font-black leading-none tabular-nums"
                        style={{ color: NAVY }}
                      >
                        {liveComposite}
                      </div>
                      {band && (
                        <span
                          className="mt-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
                          style={{ backgroundColor: band.bg, color: band.fg }}
                        >
                          {band.label}
                        </span>
                      )}
                    </div>
                  )}

                </div>

                {drift !== 0 && (
                  <div className="mt-1.5">
                    <span
                      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        backgroundColor: drift > 0 ? "#e3f3e7" : "#fce7ec",
                        color: drift > 0 ? "#1d6b32" : "#a3142b",
                      }}
                      title="Score changed since you saved it"
                    >
                      Was {savedComposite} → Now {liveComposite} {drift > 0 ? "▲" : "▼"}
                    </span>
                  </div>
                )}

                <div className="mt-2.5 flex items-start gap-2">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: isMine ? BLUE : "#64748b" }}
                    title={displayName(row.saver_name, row.saver_email)}
                  >
                    {initials(row.saver_name, row.saver_email)}
                  </span>
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="text-[11px] font-semibold" style={{ color: isMine ? NAVY : BLUE }}>
                      Saved by {isMine ? "you" : displayName(row.saver_name, row.saver_email)}
                    </div>
                    <div className="text-[10px]" style={{ color: MUTED }} title={new Date(row.created_at).toISOString()}>
                      {exactTime(row.created_at)} <span className="opacity-70">({timeAgo(row.created_at)})</span>
                    </div>
                    {row.updated_at && new Date(row.updated_at).getTime() - new Date(row.created_at).getTime() > 60000 && (
                      <div className="text-[10px]" style={{ color: MUTED }} title={new Date(row.updated_at).toISOString()}>
                        Last re-scored {timeAgo(row.updated_at)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onLoad(row);
                      onOpenChange(false);
                      toast.success(`Loaded "${row.site_name}" into a card`);
                    }}
                    className="inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-semibold"
                    style={{ borderColor: BLUE, color: BLUE }}
                  >
                    <Upload size={11} /> Load into card
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleRemove(row)}
                      disabled={busyId === row.id}
                      className="inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] disabled:opacity-50"
                      style={{ borderColor: BORDER, color: "#a3142b" }}
                    >
                      {busyId === row.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                      Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
