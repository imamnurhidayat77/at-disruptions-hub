/**
 * SAP incident service — adapter boundary (AGENTS.md: API Architecture).
 *
 * No course SAP API has been confirmed and no SAP examples exist in this
 * repository, so every operation reports the service as unavailable. When
 * a confirmed SAP sandbox becomes available, implement the adapter here
 * (behind this interface) plus a mapper into the Incident domain model —
 * UI and domain code must not change.
 */

export class SapUnavailableError extends Error {
  constructor() {
    super('SAP incident service is temporarily unavailable — no course API confirmed.');
    this.name = 'SapUnavailableError';
  }
}

export interface SapIncidentSummary {
  externalId: string;
  title: string;
}

/** Attempts a live fetch; currently always rejects with SapUnavailableError. */
export async function fetchLiveIncidents(): Promise<SapIncidentSummary[]> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  throw new SapUnavailableError();
}
