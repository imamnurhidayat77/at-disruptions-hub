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
/** Parse guard: an Invalid Date throws inside Intl formatting and would
 * blank the whole view — return null so callers can render a placeholder. */
function safeDate(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d : null;
}

export function formatNzdtTime(iso: string): string {
  const at = safeDate(iso);
  if (!at) return '—';
  const parts = new Intl.DateTimeFormat('en-NZ', {
    timeZone: 'Pacific/Auckland',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(at);
  return `${parts} NZDT`;
}

/** Short NZDT time, e.g. "09:08" (the footer carries the NZDT disclaimer). */
export function formatNzdtShort(iso: string): string {
  const at = safeDate(iso);
  if (!at) return '—';
  return new Intl.DateTimeFormat('en-NZ', {
    timeZone: 'Pacific/Auckland',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(at);
}

/** Short NZDT date, e.g. "07 Oct 2026". */
export function formatNzdtDate(iso: string): string {
  const at = safeDate(iso);
  if (!at) return '—';
  return new Intl.DateTimeFormat('en-NZ', {
    timeZone: 'Pacific/Auckland',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(at);
}

/** Remaining ms under 3 minutes counts as "due soon" (UI-kit convention). */
export const DUE_SOON_MS = 3 * 60 * 1000;

export interface QueueKpis {
  active: number;
  activeCritical: number;
  activeHigh: number;
  activeOther: number;
  awaiting: number;
  breached: number;
  dueSoon: number;
  /** Published records with a met target, over published records. Null when none published. */
  achievedPct: number | null;
  achievedCount: number;
  publishedCount: number;
  /** Mean confirmation → first-publication ms across published records. Null when none. */
  averageFirstCommMs: number | null;
}

/** Dashboard KPIs derived from the shared records — never hard-coded. */
export function queueKpis(incidents: Incident[], nowIso?: string): QueueKpis {
  const active = incidents.filter(
    (i) => i.operationalStatus !== 'CLOSED' && i.operationalStatus !== 'RESTORED',
  );
  let awaiting = 0;
  let breached = 0;
  let dueSoon = 0;
  let achievedCount = 0;
  let publishedCount = 0;
  let elapsedTotal = 0;

  for (const i of incidents) {
    const kpi = firstCommunicationKpi(i, nowIso);
    if (kpi.state === 'MET') {
      achievedCount += 1;
      publishedCount += 1;
      elapsedTotal += kpi.elapsedMs ?? 0;
    } else if (kpi.state === 'EXCEEDED') {
      publishedCount += 1;
      elapsedTotal += kpi.elapsedMs ?? 0;
      breached += 1;
    } else if (kpi.state === 'COUNTING') {
      awaiting += 1;
      const remaining = kpi.remainingMs ?? 0;
      if (remaining <= 0) breached += 1;
      else if (remaining <= DUE_SOON_MS) dueSoon += 1;
    } else if (kpi.state === 'AWAITING_CONFIRMATION' && i.operationalStatus === 'REPORTED') {
      awaiting += 1;
    }
  }

  return {
    active: active.length,
    activeCritical: active.filter((i) => i.severity === 'CRITICAL').length,
    activeHigh: active.filter((i) => i.severity === 'HIGH').length,
    activeOther: active.filter((i) => i.severity !== 'CRITICAL' && i.severity !== 'HIGH').length,
    awaiting,
    breached,
    dueSoon,
    achievedPct: publishedCount === 0 ? null : Math.round((achievedCount / publishedCount) * 100),
    achievedCount,
    publishedCount,
    averageFirstCommMs: publishedCount === 0 ? null : Math.round(elapsedTotal / publishedCount),
  };
}
