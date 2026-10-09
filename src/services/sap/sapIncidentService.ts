import { mergeCandidates, normalizeEnvelope, normalizeEntry, referenceToCandidate } from './sapIncidentMapper.ts';
import {
  SapNotConfiguredError,
  SapUnavailableError,
  type SapIncidentReference,
  type SapStatusInfo,
  type SapSyncResult,
} from './types.ts';
import type { SapCandidate } from '../../domain/types.ts';

/**
 * SAP incident service — talks ONLY to the same-origin application proxy
 * (/api/sap/*). Never contacts SAP hosts directly, never holds credentials.
 * Sync results are normalised references kept outside the AT incident
 * store: a failed or successful sync never mutates shared demo incidents.
 */

const INCIDENTS_ENDPOINT = '/api/sap/incidents';
const STATUS_ENDPOINT = '/api/sap/status';

export { SapNotConfiguredError, SapUnavailableError } from './types.ts';
export type { SapIncidentReference, SapStatusInfo, SapSyncResult } from './types.ts';

async function readJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new SapUnavailableError();
  }
}

/** Current proxy-reported SAP connection state (cheap — no SAP call). */
export async function fetchSapStatus(endpoint: string = STATUS_ENDPOINT): Promise<SapStatusInfo> {
  let response: Response;
  try {
    response = await fetch(endpoint);
  } catch {
    throw new SapUnavailableError();
  }
  if (!response.ok) throw new SapUnavailableError();
  const body = (await readJson(response)) as Partial<SapStatusInfo>;
  return {
    api: typeof body.api === 'string' ? body.api : 'API_EHS_REPORT_INCIDENT_SRV',
    configured: body.configured === true,
    state:
      body.state === 'connected' || body.state === 'unavailable' || body.state === 'not-configured'
        ? body.state
        : 'unavailable',
    lastSync: typeof body.lastSync === 'string' ? body.lastSync : null,
    lastCount: typeof body.lastCount === 'number' ? body.lastCount : null,
    lastError: typeof body.lastError === 'string' ? body.lastError : null,
  };
}

/** Sync up to 5 SAP incident references through the protected proxy. */
export async function fetchSapIncidentsFrom(url: string): Promise<SapSyncResult> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new SapUnavailableError();
  }
  if (response.status === 503) {
    const body = (await readJson(response)) as { code?: unknown };
    if (body.code === 'NOT_CONFIGURED') throw new SapNotConfiguredError();
    throw new SapUnavailableError();
  }
  if (!response.ok) throw new SapUnavailableError();
  const body = (await readJson(response)) as { data?: unknown; syncedAt?: unknown };
  const references: SapIncidentReference[] = normalizeEnvelope(body.data).map((entry, i) =>
    normalizeEntry(entry, i),
  );
  return {
    references,
    syncedAt: typeof body.syncedAt === 'string' ? body.syncedAt : new Date().toISOString(),
  };
}

export function fetchSapIncidents(): Promise<SapSyncResult> {
  return fetchSapIncidentsFrom(INCIDENTS_ENDPOINT);
}

export interface SapAutoSyncResult {
  /** Merged candidate list (live records enriched, linked history kept). */
  candidates: SapCandidate[];
  /** ISO timestamp of the successful fetch. */
  syncedAt: string;
  /** How many live SAP records were retrieved. */
  count: number;
}

export interface LiveEnriched {
  /** Fresh auto-enriched candidates (unmerged — intake decides). */
  candidates: SapCandidate[];
  syncedAt: string;
  count: number;
}

/** Last successful automatic fetch in this page load (null when none yet). */
let lastAutoSync: { at: string; count: number } | null = null;
/** In-flight automatic fetch — shared so mount effects never double-fetch. */
let inflightAutoSync: Promise<SapAutoSyncResult | null> | null = null;

export function getLastAutoSync(): { at: string; count: number } | null {
  return lastAutoSync;
}

/**
 * Fetch + auto-enrich only (no merge). Returns the fresh live candidates
 * or null when SAP is not configured / unreachable.
 */
export async function fetchLiveEnriched(): Promise<LiveEnriched | null> {
  try {
    const result = await fetchSapIncidents();
    const candidates = result.references.map((ref) =>
      referenceToCandidate(ref, result.syncedAt),
    );
    lastAutoSync = { at: result.syncedAt, count: candidates.length };
    return { candidates, syncedAt: result.syncedAt, count: candidates.length };
  } catch {
    return null;
  }
}
/**
 * Automatic SAP intake merge (kept for compatibility). New code should
 * use fetchLiveEnriched + the store auto-intake instead.
 */
export function autoFetchSapCandidates(
  existing: SapCandidate[],
): Promise<SapAutoSyncResult | null> {
  if (inflightAutoSync) return inflightAutoSync;
  inflightAutoSync = (async () => {
    try {
      const live = await fetchLiveEnriched();
      if (!live) return null;
      return {
        candidates: mergeCandidates(existing, live.candidates),
        syncedAt: live.syncedAt,
        count: live.count,
      };
    } catch {
      return null;
    } finally {
      inflightAutoSync = null;
    }
  })();
  return inflightAutoSync;
}
