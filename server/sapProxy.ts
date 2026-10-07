import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Server-side SAP proxy (dev server only).
 *
 * Keeps SAP_API_KEY server-side: the browser only ever talks to
 * same-origin /api/sap/* endpoints. No SAP secret is bundled, logged,
 * or sent to the client. This module runs in Node (via vite.config.ts)
 * and is never imported by frontend code.
 *
 * Evidence base (no guessed shapes):
 * - Service path pattern `<host>/sap/opu/odata/sap/API_EHS_REPORT_INCIDENT_SRV/`
 *   from SAP's official EHS incident integration guide.
 * - Entity set `A_Incident` with navigation `to_Persons` / `to_Attachments`
 *   from the same guide. Exact properties are NOT assumed — the frontend
 *   mapper normalises whatever the sandbox actually returns.
 */

const SERVICE_PATH = '/sap/opu/odata/sap/API_EHS_REPORT_INCIDENT_SRV';
const DEMO_MAX_RECORDS = 5;

interface ProxyEnv {
  SAP_API_BASE_URL?: string;
  SAP_API_KEY?: string;
  SAP_API_ENTITY_SET?: string;
}

interface SyncMemory {
  lastSync: string | null;
  lastResult: 'ok' | 'error' | null;
  lastCount: number | null;
  lastError: string | null;
}

const memory: SyncMemory = { lastSync: null, lastResult: null, lastCount: null, lastError: null };

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function countRecords(payload: unknown): number | null {
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

export function sapProxyPlugin(env: ProxyEnv): Plugin {
  const base = (env.SAP_API_BASE_URL ?? '').replace(/\/+$/, '');
  const key = env.SAP_API_KEY ?? '';
  const entitySet = env.SAP_API_ENTITY_SET ?? 'A_Incident';
  const configured = base.length > 0 && key.length > 0;

  return {
    name: 'at-disruption-hub-sap-proxy',
    configureServer(server) {
      server.middlewares.use('/api/sap/status', (_req: IncomingMessage, res: ServerResponse) => {
        sendJson(res, 200, {
          api: 'API_EHS_REPORT_INCIDENT_SRV',
          configured,
          state: !configured ? 'not-configured' : memory.lastResult === 'ok' ? 'connected' : memory.lastResult === 'error' ? 'unavailable' : 'not-configured',
          lastSync: memory.lastSync,
          lastCount: memory.lastCount,
          lastError: memory.lastError,
        });
      });

      server.middlewares.use('/api/sap/incidents', async (_req: IncomingMessage, res: ServerResponse) => {
        if (!configured) {
          sendJson(res, 503, {
            code: 'NOT_CONFIGURED',
            message: 'SAP Incident Service is not configured — set SAP_API_BASE_URL and SAP_API_KEY.',
          });
          return;
        }
        const url = `${base}${SERVICE_PATH}/${entitySet}?$top=${DEMO_MAX_RECORDS}`;
        try {
          const upstream = await fetch(url, {
            headers: { APIKey: key, Accept: 'application/json' },
          });
          if (!upstream.ok) {
            memory.lastResult = 'error';
            memory.lastError = `Upstream responded with HTTP ${upstream.status}.`;
            memory.lastSync = new Date().toISOString();
            sendJson(res, 502, {
              code: 'UPSTREAM_ERROR',
              message: 'SAP Incident Service is temporarily unavailable.',
            });
            return;
          }
          const data: unknown = await upstream.json();
          memory.lastResult = 'ok';
          memory.lastError = null;
          memory.lastCount = countRecords(data);
          memory.lastSync = new Date().toISOString();
          sendJson(res, 200, { data, syncedAt: memory.lastSync });
        } catch {
          memory.lastResult = 'error';
          memory.lastError = 'Network or fetch failure reaching the SAP host.';
          memory.lastSync = new Date().toISOString();
          sendJson(res, 502, {
            code: 'UPSTREAM_UNREACHABLE',
            message: 'SAP Incident Service is temporarily unavailable.',
          });
        }
      });
    },
  };
}

export const SAP_PROXY_CONSTANTS = { SERVICE_PATH, DEMO_MAX_RECORDS };
