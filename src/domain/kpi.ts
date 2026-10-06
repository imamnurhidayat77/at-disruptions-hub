import type { Incident } from './types.js';

/**
 * First-communication KPI derivations. All values are computed from
 * incident timestamps — never hard-coded in UI text.
 *
 * KPI clock: confirmedAt (start) → firstPublishedAt (stop).
 * Target: 10 minutes or less.
 */

export const FIRST_COMM_TARGET_MINUTES = 10;
export const FIRST_COMM_TARGET_MS = FIRST_COMM_TARGET_MINUTES * 60 * 1000;

export type FirstCommState =
  | 'AWAITING_CONFIRMATION'
  | 'COUNTING'
  | 'MET'
  | 'EXCEEDED';

export interface FirstCommKpi {
  state: FirstCommState;
  targetMinutes: number;
  /** Elapsed ms (confirmedAt → published, or confirmedAt → now). Null before confirmation. */
  elapsedMs: number | null;
  /** Remaining ms while unpublished. Null once published or unconfirmed. */
  remainingMs: number | null;
  /** True when the published result met the ≤10 min target. */
  targetMet: boolean | null;
  confirmedAt: string | null;
  firstPublishedAt: string | null;
}

export function firstCommunicationKpi(incident: Incident, nowIso?: string): FirstCommKpi {
  const base = {
    targetMinutes: FIRST_COMM_TARGET_MINUTES,
    confirmedAt: incident.confirmedAt,
    firstPublishedAt: incident.firstPublishedAt,
  };

  if (incident.confirmedAt === null) {
    return {
      ...base,
      state: 'AWAITING_CONFIRMATION',
      elapsedMs: null,
      remainingMs: null,
      targetMet: null,
    };
  }

  const confirmedMs = Date.parse(incident.confirmedAt);

  if (incident.firstPublishedAt !== null) {
    const elapsedMs = Date.parse(incident.firstPublishedAt) - confirmedMs;
    const targetMet = elapsedMs <= FIRST_COMM_TARGET_MS;
    return {
      ...base,
      state: targetMet ? 'MET' : 'EXCEEDED',
      elapsedMs,
      remainingMs: null,
      targetMet,
    };
  }

  const nowMs = nowIso ? Date.parse(nowIso) : Date.now();
  const elapsedMs = Math.max(0, nowMs - confirmedMs);
  return {
    ...base,
    state: 'COUNTING',
    elapsedMs,
    remainingMs: FIRST_COMM_TARGET_MS - elapsedMs,
    targetMet: null,
  };
}

/** Format a millisecond duration as mm:ss (for countdown/elapsed display). */
export function formatMmSs(ms: number): string {
  const clamped = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(clamped / 60);
  const ss = clamped % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/** Format an ISO timestamp for NZDT display, e.g. "09:08 NZDT". */
export function formatNzdtTime(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-NZ', {
    timeZone: 'Pacific/Auckland',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
  return `${parts} NZDT`;
}
