import { Candidate } from "@/data/pipelineData";
import { supabase } from "@/integrations/supabase/client";
import { STAGES } from "@/data/pipelineData";

const stageLabel = (id: string) => STAGES.find((s) => s.id === id)?.label ?? id;

const esc = (v: unknown) => {
  if (v == null) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
};

const fmtDate = (d?: string | null) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleString(); } catch { return d; }
};

const PILLAR_LABELS: Record<string, string> = {
  teaching: "Teaching Experience",
  leadership: "Leadership",
  financial: "Financial Readiness",
  marketFit: "Market Fit",
  cultureFit: "Culture Fit",
};

export async function exportResearchPacket(candidate: Candidate): Promise<void> {
  const dbId = (candidate as any).dbId as string | undefined;

  // Fetch supplemental DB data in parallel (best-effort).
  const [votesRes, stageRes, profileRes, checklistRes] = dbId
    ? await Promise.all([
        supabase.from("candidate_votes").select("*").eq("candidate_id", dbId).order("updated_at", { ascending: false }),
        supabase.from("candidate_stage_history").select("*").eq("candidate_id", dbId).order("changed_at", { ascending: true }),
        supabase.from("candidate_profiles").select("*").eq("candidate_id", dbId).maybeSingle(),
        supabase.from("candidate_checklist_items").select("*").eq("candidate_id", dbId).order("created_at", { ascending: true }),
      ])
    : [{ data: [] as any[] }, { data: [] as any[] }, { data: null as any }, { data: [] as any[] }];

  const votes = (votesRes.data ?? []) as any[];
  const stageHistory = (stageRes.data ?? []) as any[];
  const profile = (profileRes.data ?? null) as any;
  const checklist = (checklistRes.data ?? []) as any[];

  const scores = candidate.qualificationScores;
  const composite = scores
    ? Math.round(
        ((scores.teaching + scores.leadership + scores.financial + scores.marketFit + scores.cultureFit) / 25) * 100,
      )
    : 0;

  const pillarRows = Object.entries(scores ?? {})
    .map(([k, v]) => `<tr><td>${esc(PILLAR_LABELS[k] ?? k)}</td><td class="num">${esc(v)} / 5</td></tr>`)
    .join("");

  const voteRows = votes.length
    ? votes
        .map(
          (v) => `<tr>
            <td>${esc(v.voter)}${v.recorded_by ? ` <span class="tag">PROXY</span>` : ""}</td>
            <td>${esc((v.vote ?? "").replace("_", " "))}</td>
            <td>${esc(v.comment ?? "")}</td>
            <td>${esc(fmtDate(v.updated_at))}${v.recorded_by ? `<br/><span class="muted">recorded by ${esc(v.recorded_by)}</span>` : ""}</td>
          </tr>`,
        )
        .join("")
    : `<tr><td colspan="4" class="muted">No votes recorded.</td></tr>`;

  const stageRows = stageHistory.length
    ? stageHistory
        .map(
          (s) => `<tr>
            <td>${esc(fmtDate(s.changed_at))}</td>
            <td>${esc(stageLabel(s.from_stage ?? "")) || "—"}</td>
            <td>${esc(stageLabel(s.to_stage))}</td>
            <td>${esc(s.changed_by ?? "")}</td>
            <td>${esc(s.notes ?? "")}</td>
          </tr>`,
        )
        .join("")
    : `<tr><td colspan="5" class="muted">No stage history.</td></tr>`;

  const checklistRows = checklist.length
    ? checklist
        .map(
          (c) => `<tr>
            <td>${c.is_completed ? "✓" : "☐"}</td>
            <td>${esc(stageLabel(c.stage))}</td>
            <td>${esc(c.label)}</td>
            <td>${esc(c.is_completed ? fmtDate(c.completed_at) : "")}</td>
          </tr>`,
        )
        .join("")
    : `<tr><td colspan="4" class="muted">No checklist items.</td></tr>`;

  const activityRows = (candidate.activity ?? []).length
    ? candidate.activity
        .map(
          (a) => `<tr>
            <td>${esc(a.timestamp)}</td>
            <td>${esc(a.type)}</td>
            <td>${esc(a.author)}</td>
            <td>${esc(a.content)}</td>
          </tr>`,
        )
        .join("")
    : `<tr><td colspan="4" class="muted">No notes or activity.</td></tr>`;

  const profileBlock = profile
    ? `
      <table class="kv">
        <tr><th>Background</th><td>${esc(profile.background ?? "—")}</td></tr>
        <tr><th>Motivation</th><td>${esc(profile.motivation ?? "—")}</td></tr>
        <tr><th>Liquid Capital</th><td>${profile.liquid_capital != null ? "$" + Number(profile.liquid_capital).toLocaleString() : "—"}</td></tr>
        <tr><th>Net Worth</th><td>${profile.net_worth != null ? "$" + Number(profile.net_worth).toLocaleString() : "—"}</td></tr>
        <tr><th>Timeline</th><td>${esc(profile.timeline ?? "—")}</td></tr>
        <tr><th>Desired Markets</th><td>${esc(profile.location_preferences ?? "—")}</td></tr>
        <tr><th>Additional Notes</th><td>${esc(profile.additional_notes ?? "—")}</td></tr>
      </table>`
    : `<p class="muted">No extended profile on file.</p>`;

  const generatedAt = new Date().toLocaleString();
  const title = `Research Packet — ${candidate.name}`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #07142f; margin: 32px; line-height: 1.4; }
  h1 { color: #003c7e; font-size: 22px; margin: 0 0 4px; }
  h2 { color: #003c7e; font-size: 14px; margin: 24px 0 8px; border-bottom: 1px solid #dee2e6; padding-bottom: 4px; }
  .meta { color: #6c757d; font-size: 11px; margin-bottom: 16px; }
  .summary { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin: 12px 0 4px; }
  .card { border: 1px solid #dee2e6; border-radius: 8px; padding: 10px 12px; }
  .card .label { font-size: 10px; text-transform: uppercase; color: #6c757d; letter-spacing: 0.5px; }
  .card .value { font-size: 18px; font-weight: 700; color: #07142f; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #eef2f7; vertical-align: top; }
  th { background: #f8fafe; color: #526078; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; }
  table.kv th { width: 180px; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .muted { color: #8794ab; font-style: italic; }
  .tag { display: inline-block; background: #eef2f7; color: #526078; font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 3px; letter-spacing: 0.5px; }
  .toolbar { position: fixed; top: 12px; right: 12px; }
  .toolbar button { background: #174be8; color: #fff; border: 0; padding: 8px 14px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 12px; }
  @media print { .toolbar { display: none; } body { margin: 18mm; } }
</style>
</head>
<body>
  <div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button></div>
  <h1>${esc(candidate.name)}</h1>
  <div class="meta">
    ${esc(candidate.city)}, ${esc(candidate.state)} · ${esc(candidate.email)}${candidate.phone ? " · " + esc(candidate.phone) : ""}<br/>
    Owner: ${esc(candidate.assignedTo)} · Source: ${esc(candidate.source)} · Created: ${esc(candidate.createdDate)}<br/>
    Packet generated: ${esc(generatedAt)}
  </div>

  <div class="summary">
    <div class="card"><div class="label">Stage</div><div class="value">${esc(stageLabel(candidate.stage))}</div></div>
    <div class="card"><div class="label">Fit Score</div><div class="value">${esc(candidate.fitScore)}</div></div>
    <div class="card"><div class="label">Qualification Composite</div><div class="value">${esc(composite)}</div></div>
  </div>

  <h2>Qualification Scores</h2>
  <table>
    <thead><tr><th>Pillar</th><th class="num">Score</th></tr></thead>
    <tbody>${pillarRows}<tr><td><strong>Composite</strong></td><td class="num"><strong>${composite} / 100</strong></td></tr></tbody>
  </table>

  <h2>Candidate Profile</h2>
  ${profileBlock}

  <h2>Committee Votes</h2>
  <table>
    <thead><tr><th>Voter</th><th>Vote</th><th>Comment</th><th>Updated</th></tr></thead>
    <tbody>${voteRows}</tbody>
  </table>

  <h2>Stage History</h2>
  <table>
    <thead><tr><th>When</th><th>From</th><th>To</th><th>By</th><th>Notes</th></tr></thead>
    <tbody>${stageRows}</tbody>
  </table>

  <h2>Confirmation Checklist</h2>
  <table>
    <thead><tr><th>Done</th><th>Stage</th><th>Item</th><th>Completed</th></tr></thead>
    <tbody>${checklistRows}</tbody>
  </table>

  <h2>Notes &amp; Activity</h2>
  <table>
    <thead><tr><th>When</th><th>Type</th><th>By</th><th>Content</th></tr></thead>
    <tbody>${activityRows}</tbody>
  </table>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) {
    // Popup blocked — fall back to download.
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const slug = candidate.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    a.href = url;
    a.download = `research-packet-${slug}-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
