import {
  buildUpstreamUrl,
  countRecords,
  isGet,
  loadConfig,
  sendJson,
  type ApiRequest,
  type ApiResponse,
} from './_lib.js';

/**
 * GET /api/sap/status — connection state without moving demo data.
 * Stateless (serverless has no shared memory): when configured, a cheap
 * $top=1 probe decides between connected / unavailable. Always HTTP 200 —
 * failures are reported in the body, mirroring the local dev plugin.
 */
export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (!isGet(req)) {
    sendJson(res, 405, { code: 'METHOD_NOT_ALLOWED', message: 'Use GET.' });
    return;
  }
  const cfg = loadConfig();
  if (!cfg.configured) {
    sendJson(res, 200, {
      api: 'API_EHS_REPORT_INCIDENT_SRV',
      configured: false,
      state: 'not-configured',
      lastSync: null,
      lastCount: null,
      lastError: null,
    });
    return;
  }
  try {
    const upstream = await fetch(buildUpstreamUrl(cfg, 1), {
      headers: { APIKey: cfg.key, Accept: 'application/json' },
    });
    if (!upstream.ok) {
      sendJson(res, 200, {
        api: 'API_EHS_REPORT_INCIDENT_SRV',
        configured: true,
        state: 'unavailable',
        lastSync: new Date().toISOString(),
        lastCount: null,
        lastError: `Upstream responded with HTTP ${upstream.status}.`,
      });
      return;
    }
    const data: unknown = await upstream.json();
    sendJson(res, 200, {
      api: 'API_EHS_REPORT_INCIDENT_SRV',
      configured: true,
      state: 'connected',
      lastSync: new Date().toISOString(),
      lastCount: countRecords(data),
      lastError: null,
    });
  } catch {
    sendJson(res, 200, {
      api: 'API_EHS_REPORT_INCIDENT_SRV',
      configured: true,
      state: 'unavailable',
      lastSync: new Date().toISOString(),
      lastCount: null,
      lastError: 'Network or fetch failure reaching the SAP host.',
    });
  }
}
