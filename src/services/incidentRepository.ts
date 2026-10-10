import { normalizeIncident } from '../domain/operations.js';
import type { Incident, SapCandidate } from '../domain/types.js';
import { buildDemoSeed, buildSapSeed } from './demoSeed.js';

/**
 * Incident repository — the adapter boundary between the UI/store and
 * data sources (AGENTS.md: "API Architecture").
 *
 * Demo-backed (localStorage persistence + seed). SAP intake candidates
 * are labelled demo records, explicitly synthetic — never presented as
 * live SAP data. A future SAP adapter plugs in here without touching
 * UI or domain code.
 */

const STORAGE_KEY = 'at-disruption-hub/demo-state/v8';

export interface DemoState {
  incidents: Incident[];
  sapCandidates: SapCandidate[];
}

function isIncident(value: unknown): value is Incident {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['id'] === 'string' &&
    typeof v['route'] === 'string' &&
    Array.isArray(v['timeline'])
  );
}

function isCandidate(value: unknown): value is SapCandidate {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v['sapId'] === 'string' && typeof v['title'] === 'string';
}

/** Load persisted demo state; returns null when absent or corrupt. */
export function loadDemoState(): DemoState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const v = parsed as Record<string, unknown>;
    if (!Array.isArray(v['incidents']) || !v['incidents'].every(isIncident)) return null;
    if (!Array.isArray(v['sapCandidates']) || !v['sapCandidates'].every(isCandidate)) return null;
    // Backfill records persisted before newer fields existed.
    return {
      incidents: (v['incidents'] as Incident[]).map(normalizeIncident),
      sapCandidates: v['sapCandidates'] as SapCandidate[],
    };
  } catch {
    return null;
  }
}

export function saveDemoState(state: DemoState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Demo convenience only: persistence failure must not break the app.
  }
}

export function clearDemoState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore — see above.
  }
}

export function freshDemoState(): DemoState {
  return { incidents: buildDemoSeed(), sapCandidates: buildSapSeed() };
}

export interface SapConnectionStatus {
  connected: boolean;
  /** User-facing message; shown wherever a live source would be expected. */
  message: string;
}

/** Phase 1: no confirmed SAP service — always reports unavailable. */
export function sapConnectionStatus(): SapConnectionStatus {
  return {
    connected: false,
    message:
      'SAP incident service is temporarily unavailable. Showing cached records.',
  };
}
