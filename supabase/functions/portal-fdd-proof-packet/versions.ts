export type ProofVersion = { id: string; file_name: string; fdd_issuance_date: string | null; file_sha256: string | null };

/** Match saved receipt/event evidence, never today's staff selection. */
export function evidenceVersion(id: string | null | undefined, versions: ProofVersion[]) {
  return id ? versions.find((version) => version.id === id) ?? null : null;
}

export function proofVersionIds(current: string | null, events: Array<{ fdd_file_id: string | null }>, receipts: Array<{ fdd_file_id: string | null }>) {
  return [...new Set([current, ...events.map((e) => e.fdd_file_id), ...receipts.map((r) => r.fdd_file_id)].filter((id): id is string => !!id))];
}