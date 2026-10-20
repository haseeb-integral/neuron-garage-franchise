export const UNSUBSCRIBE_SYNC_COOLDOWN_MS = 60_000;

export function syncCooldownSeconds(lastAttempt: number | null, now: number): number {
  return lastAttempt === null ? 0 : Math.max(0, Math.ceil((lastAttempt + UNSUBSCRIBE_SYNC_COOLDOWN_MS - now) / 1000));
}

export type UnsubscribeSyncResult = {
  ok: boolean;
  new_suppressions_added: number;
  failed_campaigns: Array<{ campaign_id: string; error: string }>;
};

export function unsubscribeSyncMessage(result: UnsubscribeSyncResult): string {
  if (result.failed_campaigns.length > 0) {
    return `Added ${result.new_suppressions_added} new unsubscribes; ${result.failed_campaigns.length} campaigns could not be checked. Check the SmartLead connection and try again.`;
  }
  return `Synced ${result.new_suppressions_added} new unsubscribes`;
}