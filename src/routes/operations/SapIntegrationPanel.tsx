import { useEffect, useState } from 'react';
import { Section } from '../../components/chrome.js';
import {
  SapNotConfiguredError,
  fetchSapIncidents,
  fetchSapStatus,
  type SapIncidentReference,
  type SapStatusInfo,
} from '../../services/sap/sapIncidentService.ts';
import { formatNzdtTime } from '../../domain/kpi.js';

type Phase = 'idle' | 'loading' | 'ok' | 'error';

function statusBadge(state: SapStatusInfo['state']): React.JSX.Element {
  if (state === 'connected') return <span className="badge tg-good">● Connected</span>;
  if (state === 'unavailable') return <span className="badge tg-bad">⚠ Unavailable</span>;
  return <span className="badge tg-idle">○ Not configured</span>;
}

/**
 * SAP Integration panel (Operations → Analytics). Syncs up to 5 incident
 * references from API_EHS_REPORT_INCIDENT_SRV through the protected
 * server-side proxy and displays them normalised. Sandbox records are
 * never presented as Auckland Transport incidents, and sync never touches
 * the shared AT incident store.
 */
export function SapIntegrationPanel(): React.JSX.Element {
  const [status, setStatus] = useState<SapStatusInfo | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [refs, setRefs] = useState<SapIncidentReference[]>([]);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSapStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  async function onSync(): Promise<void> {
    setPhase('loading');
    setMessage(null);
    try {
      const result = await fetchSapIncidents();
      setRefs(result.references);
      setSyncedAt(result.syncedAt);
      setPhase('ok');
      setMessage(
        result.references.length === 0
          ? 'SAP sync completed — no incident records returned.'
          : `SAP sync completed — ${result.references.length} SAP incident record${result.references.length === 1 ? '' : 's'} retrieved.`,
      );
      const next = await fetchSapStatus().catch(() => null);
      if (next) setStatus(next);
    } catch (err) {
      setPhase('error');
      setMessage(
        err instanceof SapNotConfiguredError
          ? 'SAP Incident Service is not configured — set SAP_API_BASE_URL and SAP_API_KEY.'
          : 'SAP Incident Service is temporarily unavailable.',
      );
    }
  }

  return (
    <Section title="SAP Integration">
      <dl className="facts">
        <dt>API</dt>
        <dd>API_EHS_REPORT_INCIDENT_SRV (EHS / Compliance — partial fit, Option 2)</dd>
        <dt>Status</dt>
        <dd>{status ? statusBadge(status.state) : <span className="badge tg-idle">○ Checking…</span>}</dd>
        <dt>Last Sync</dt>
        <dd>{syncedAt ?? status?.lastSync ? formatNzdtTime((syncedAt ?? status?.lastSync) as string) : '—'}</dd>
        <dt>Records Retrieved</dt>
        <dd>{refs.length === 0 ? (status?.lastCount ?? '—') : refs.length}</dd>
      </dl>
      <p>
        <button className="btn btn-primary" type="button" onClick={() => void onSync()} disabled={phase === 'loading'}>
          {phase === 'loading' ? '↻ Connecting to SAP Incident Service…' : '↻ Sync SAP Incidents'}
        </button>
      </p>
      {phase === 'loading' && <p className="muted">Connecting to SAP Incident Service…</p>}
      {message && (
        <p className={phase === 'error' ? 'field-error' : 'success-inline'} role="status">
          {message}
        </p>
      )}
      {refs.length > 0 && (
        <table className="records">
          <thead>
            <tr>
              <th>SAP Incident</th>
              <th>Description</th>
              <th>Status</th>
              <th>Created</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {refs.map((r) => (
              <tr key={r.sapId}>
                <td>
                  <strong>{r.sapId}</strong>
                  {r.title && <div className="muted small">{r.title}</div>}
                </td>
                <td>{r.description ?? '—'}</td>
                <td>{r.status ?? '—'}</td>
                <td>{r.createdAt ?? '—'}</td>
                <td>
                  <span className="badge tg-idle">SAP</span>{' '}
                  <details className="sap-details">
                    <summary>View SAP Details</summary>
                    <dl className="facts">
                      <dt>Title</dt>
                      <dd>{r.title ?? 'Unavailable'}</dd>
                      <dt>Description</dt>
                      <dd>{r.description ?? 'Unavailable'}</dd>
                      <dt>Status</dt>
                      <dd>{r.status ?? 'Unavailable'}</dd>
                      <dt>Created</dt>
                      <dd>{r.createdAt ?? 'Unavailable'}</dd>
                      <dt>Updated</dt>
                      <dd>{r.updatedAt ?? 'Unavailable'}</dd>
                    </dl>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="note">
        Sandbox records are SAP EHS references only — not Auckland Transport
        operational incidents. Sync never modifies the shared AT incident record.
      </div>
    </Section>
  );
}
