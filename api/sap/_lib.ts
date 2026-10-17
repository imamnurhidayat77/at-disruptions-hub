/**
 * Shared server-side SAP proxy helpers for Vercel Functions (production).
 *
 * Local dev uses the Vite plugin (server/sapProxy.ts) with identical
 * behaviour: same paths, same status codes, same 5-record cap. Secrets
 * stay server-side; the browser only ever calls same-origin /api/sap/*.
 *
 * Grounded on API_EHS_REPORT_INCIDENT_SRV (v1.0.0, SAP_COM_0369):
 * entity set A_Incident, sandbox host configured via env.
 */

export const SERVICE_PATH = '/sap/opu/odata/sap/API_EHS_REPORT_INCIDENT_SRV';
export const DEMO_MAX_RECORDS = 5;
/** Spec-exact A_Incident fields requested from the sandbox. */
export const INCIDENT_SELECT = [
  'IncidentID',
  'IncidentUUID',
  'IncidentUTCDateTime',
  'IncidentTitle',
  'IncidentStatus',
  'IncidentLocationDescription',
  'IncidentDescriptionOfEvents',
  'IncidentCategory',
  'EHSLocationUUID',
].join(',');

/**
 * Minimal Vercel Node-function shapes (structural — no new dependency).
 * Compatible with the real VercelRequest/VercelResponse at runtime.
 */
export interface ApiRequest {
  method?: string;
}

export interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

export interface ProxyConfig {
  base: string;
  key: string;
  entitySet: string;
  configured: boolean;
}

export function loadConfig(): ProxyConfig {
  const base = (process.env.SAP_API_BASE_URL ?? '').replace(/\/+$/, '');
  const key = process.env.SAP_API_KEY ?? '';
  const entitySet = process.env.SAP_API_ENTITY_SET ?? 'A_Incident';
  return { base, key, entitySet, configured: base.length > 0 && key.length > 0 };
}

export function sendJson(res: ApiResponse, status: number, body: unknown): void {
  res.status(status).json(body);
}

export function buildUpstreamUrl(cfg: ProxyConfig, top: number): string {
  return (
    `${cfg.base}${SERVICE_PATH}/${cfg.entitySet}` +
    `?$top=${top}&$format=json&$select=${encodeURIComponent(INCIDENT_SELECT)}`
  );
}

export function countRecords(payload: unknown): number | null {
  if (Array.isArray(payload)) return payload.length;
  if (payload !== null && typeof payload === 'object') {
    const rec = payload as Record<string, unknown>;
    if (Array.isArray(rec['value'])) return rec['value'].length;
    const d = rec['d'];
    if (d !== null && typeof d === 'object' && Array.isArray((d as Record<string, unknown>)['results'])) {
      return ((d as Record<string, unknown>)['results'] as unknown[]).length;
    }
  }
  return null;
}

export function isGet(req: ApiRequest): boolean {
  return req.method === undefined || req.method === 'GET';
}
