import type { Incident } from '../domain/types.js';

/**
 * Per-incident "last viewed" timestamps (demo convenience, localStorage).
 * Powers the "New update" badge: contractor updates newer than the last
 * view count as unread; opening the incident detail marks it read.
 */
const STORAGE_KEY = 'at-disruption-hub/viewed-state/v1';

function load(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === 'string') out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function getLastViewed(incidentId: string): string | null {
  return load()[incidentId] ?? null;
}

export function markViewed(incidentId: string, at?: string): void {
  try {
    const map = load();
    map[incidentId] = at ?? new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Demo convenience only.
  }
}

/** IDs of contractor-authored updates newer than the last view (empty when none). */
export function unreadOperatorUpdates(incident: Incident): string[] {
  const seen = getLastViewed(incident.id);
  return incident.timeline
    .filter((e) => e.action === 'Operator sent confirmed update')
    .filter((e) => (seen === null ? true : Date.parse(e.at) > Date.parse(seen)))
    .map((e) => e.id);
}
