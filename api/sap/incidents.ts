import {
  DEMO_MAX_RECORDS,
  buildUpstreamUrl,
  isGet,
  loadConfig,
  sendJson,
  type ApiRequest,
  type ApiResponse,
} from './_lib.js';

/**
 * GET /api/sap/incidents — fetch up to 5 SAP incident records through the
 * server-side proxy (API key never leaves the server). Mirrors the local
 * dev plugin (server/sapProxy.ts): 503 NOT_CONFIGURED when env is absent,
 * 502 when the upstream is unreachable, 200 { data, syncedAt } on success.
 */
export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (!isGet(req)) {
    sendJson(res, 405, { code: 'METHOD_NOT_ALLOWED', message: 'Use GET.' });
    return;
  }
  const cfg = loadConfig();
  if (!cfg.configured) {
    sendJson(res, 503, {
      code: 'NOT_CONFIGURED',
      message: 'SAP Incident Service is not configured — set SAP_API_BASE_URL and SAP_API_KEY.',
    });
    return;
  }
  try {
    const upstream = await fetch(buildUpstreamUrl(cfg, DEMO_MAX_RECORDS), {
      headers: { APIKey: cfg.key, Accept: 'application/json' },
    });
    if (!upstream.ok) {
      sendJson(res, 502, {
        code: 'UPSTREAM_ERROR',
        message: 'SAP Incident Service is temporarily unavailable.',
      });
      return;
    }
    const data: unknown = await upstream.json();
    sendJson(res, 200, { data, syncedAt: new Date().toISOString() });
  } catch {
    sendJson(res, 502, {
      code: 'UPSTREAM_UNREACHABLE',
      message: 'SAP Incident Service is temporarily unavailable.',
    });
  }
}
