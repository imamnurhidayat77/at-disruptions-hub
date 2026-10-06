import { normalizeIncident } from '../domain/operations.js';
import type { Incident } from '../domain/types.js';
import { buildDemoSeed } from './demoSeed.js';

/**
 * Incident repository — the adapter boundary between the UI/store and
 * data sources (AGENTS.md: "API Architecture").
 *
 * Phase 1: demo-backed only (localStorage persistence + seed). No SAP
 * integration exists — see sapConnectionStatus(). A future SAP adapter
 * plugs in here without touching UI or domain code.
 */

const STORAGE_KEY = 'at-disruption-hub/demo-state/v2';

function isIncident(value: unknown): value is Incident {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['id'] === 'string' &&
    typeof v['route'] === 'string' &&
    Array.isArray(v['timeline'])
  );
}

/** Load persisted demo state; returns null when absent or corrupt. */
export function loadDemoState(): Incident[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isIncident)) return null;
    // Backfill records persisted before newer fields existed.
    return parsed.map(normalizeIncident);
  } catch {
    return null;
  }
}

export function saveDemoState(incidents: Incident[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(incidents));
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

export function freshDemoState(): Incident[] {
  return buildDemoSeed();
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
      'SAP incident service is temporarily unavailable — no course API confirmed. Continuing with labelled demo data.',
  };
}
