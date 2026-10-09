/**
 * SAP integration types — the boundary between the SAP incident service
 * and the AT Disruption Hub domain. SAP data never enters Incident
 * objects directly; it is normalised into SapIncidentReference first.
 */

export type SapConnectionState = 'connected' | 'unavailable' | 'not-configured';

export interface SapIncidentReference {
  sapId: string;
  title: string | null;
  description: string | null;
  status: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  /** Incident category (A_Incident.IncidentCategory, max 3 chars). */
  category: string | null;
  /** Raw incident start timestamp (A_Incident.IncidentUTCDateTime). */
  incidentUtc: string | null;
  /** Extra location text (A_Incident.IncidentLocationDescription). */
  locationDescription: string | null;
  /** Complete original entry for audit — never rendered raw in normal UI. */
  rawSource: Record<string, unknown>;
}

export interface SapSyncResult {
  references: SapIncidentReference[];
  syncedAt: string;
}

export interface SapStatusInfo {
  api: string;
  configured: boolean;
  state: SapConnectionState;
  lastSync: string | null;
  lastCount: number | null;
  lastError: string | null;
}

export class SapNotConfiguredError extends Error {
  constructor() {
    super('SAP Incident Service is not configured — set SAP_API_BASE_URL and SAP_API_KEY.');
    this.name = 'SapNotConfiguredError';
  }
}

export class SapUnavailableError extends Error {
  constructor() {
    super('SAP Incident Service is temporarily unavailable.');
    this.name = 'SapUnavailableError';
  }
}
