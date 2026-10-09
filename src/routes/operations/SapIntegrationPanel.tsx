import { useEffect, useState } from 'react';
import { Section } from '../../components/chrome.js';
import { DataTable, type DataColumn } from '../../components/DataTable.js';
import {
  fetchSapStatus,
  getLastAutoSync,
  type SapStatusInfo,
} from '../../services/sap/sapIncidentService.ts';
import type { SapCandidate } from '../../domain/types.ts';
import { useAppStore } from '../../state/AppStore.js';
import { formatNzdtTime } from '../../domain/kpi.js';

function statusBadge(state: SapStatusInfo['state']): React.JSX.Element {
  if (state === 'connected') return <span className="badge tg-good">● Connected</span>;
  if (state === 'unavailable') return <span className="badge tg-bad">⚠ Unavailable</span>;
  return <span className="badge tg-idle">○ Not configured</span>;
}

/**
 * SAP Integration panel (Operations → Analytics). Up to 5 SAP incident
 * references load automatically when the Incoming worklist opens — no
 * manual sync. This panel reports the connection state and shows the
 * auto-enriched intake candidates. Sandbox records are never presented
 * as Auckland Transport incidents, and loading never touches the shared
 * AT incident store.
 */
export function SapIntegrationPanel(): React.JSX.Element {
  const { state } = useAppStore();
  const [status, setStatus] = useState<SapStatusInfo | null>(null);

  useEffect(() => {
    fetchSapStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  const autoSync = getLastAutoSync();
  const lastSyncLabel = autoSync?.at ?? status?.lastSync ?? null;
  const live = autoSync !== null;

  const columns: Array<DataColumn<SapCandidate>> = [
    {
      key: 'sap',
      label: 'SAP Incident',
      sortable: true,
      sortValue: (r) => r.sapId,
      render: (r) => (
        <span>
          <strong>{r.sapId}</strong>
          <div className="muted small">{r.title}</div>
        </span>
      ),
    },
    {
      key: 'desc',
      label: 'Description',
      sortable: true,
      sortValue: (r) => r.description,
      render: (r) => r.description,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      filter: 'select',
      filterValue: (r) => r.sapStatus,
      sortValue: (r) => r.sapStatus,
      render: (r) => r.sapStatus,
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      filter: 'select',
      filterValue: (r) => r.category,
      sortValue: (r) => r.category,
      render: (r) => r.category,
    },
    {
      key: 'date',
      label: 'Received',
      sortable: true,
      sortValue: (r) => r.receivedAt,
      render: (r) => r.receivedAt,
    },
    {
      key: 'source',
      label: 'Source',
      render: (r) => (
        <span>
          <span className="badge tg-idle">{live ? 'SAP connected' : 'SAP offline'}</span>{' '}
          <details className="sap-details">
            <summary>View Details</summary>
            <dl className="facts">
              <dt>Title</dt>
              <dd>{r.title}</dd>
              <dt>Description</dt>
              <dd>{r.description}</dd>
              <dt>Status</dt>
              <dd>{r.sapStatus}</dd>
              <dt>Category</dt>
              <dd>{r.category}</dd>
              <dt>Received</dt>
              <dd>{r.receivedAt}</dd>
              <dt>Location</dt>
              <dd>{r.locationDescription}</dd>
              <dt>Intake route</dt>
              <dd>{r.intakeRoute}</dd>
            </dl>
          </details>
        </span>
      ),
    },
  ];

  return (
    <Section
      title="SAP Integration"
      count={`${state.sapCandidates.length} record${state.sapCandidates.length === 1 ? '' : 's'}`}
    >
      <dl className="facts">
        <dt>API</dt>
        <dd>API_EHS_REPORT_INCIDENT_SRV (EHS / Compliance — partial fit, Option 2)</dd>
        <dt>Status</dt>
        <dd>{status ? statusBadge(status.state) : <span className="badge tg-idle">○ Checking…</span>}</dd>
        <dt>Last Sync</dt>
        <dd>{lastSyncLabel !== null ? formatNzdtTime(lastSyncLabel) : '—'}</dd>
        <dt>Records Retrieved</dt>
        <dd>
          {live
            ? `Live: ${autoSync.count}`
            : 'Unavailable — configure SAP_API_BASE_URL and SAP_API_KEY, then open Incoming.'}
        </dd>
      </dl>
      <p className="muted small">
        Candidates load automatically when the Incoming worklist opens — no manual sync.
      </p>
      <DataTable<SapCandidate>
        rows={state.sapCandidates}
        columns={columns}
        rowKey={(r) => r.sapId}
        searchText={(r) => `${r.sapId} ${r.title} ${r.description} ${r.sapStatus} ${r.category}`}
        searchPlaceholder="Search SAP incidents"
        pageSize={8}
        emptyTitle="No SAP records"
        emptyDescription="Open the Incoming worklist to load SAP incident candidates."
      />
      <div className="note">
        SAP records are references only. Records that should enter the AT workflow are reviewed as intake candidates in Incoming.
      </div>
    </Section>
  );
}
