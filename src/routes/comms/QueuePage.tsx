import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { OpStatusBadge, SeverityBadge } from '../../components/badges.js';
import { Crumbs, Section } from '../../components/chrome.js';
import { DataTable, type DataColumn } from '../../components/DataTable.js';
import type { Incident } from '../../domain/types.js';
import {
  awaitingSeverityAssessment,
  needsFirstPublication,
} from '../../domain/comms.js';
import { firstCommunicationKpi, formatMmSs } from '../../domain/kpi.js';
import { useNowTick } from '../../components/useNowTick.js';
import { useAppStore } from '../../state/AppStore.js';

function opStatusText(status: Incident['operationalStatus']): string {
  return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');
}

interface QueueRow {
  incident: Incident;
  /** True for REPORTED / not-yet-assessed incidents that cannot be published yet. */
  blocked: boolean;
}
/**
 * Communication Queue — Figma "04 Customer Information". Validated and
 * severity-assessed incidents needing a first publication, riskiest
 * first, with a readiness filter. Every row navigates to its composer.
 */
export function QueuePage(): React.JSX.Element {
  const { state, setRole } = useAppStore();

  useEffect(() => {
    setRole('CUSTOMER_INFORMATION');
  }, [setRole]);

  const queue = state.incidents
    .filter(needsFirstPublication)
    .sort((a, b) => {
      const ra = firstCommunicationKpi(a).remainingMs ?? Number.POSITIVE_INFINITY;
      const rb = firstCommunicationKpi(b).remainingMs ?? Number.POSITIVE_INFINITY;
      return ra - rb;
    });
  const reported = state.incidents.filter((i) => i.operationalStatus === 'REPORTED');
  const awaitingSeverity = state.incidents.filter(awaitingSeverityAssessment);
  const nowIso = useNowTick(queue.length > 0);

  const actionable: QueueRow[] = queue.map((incident) => ({ incident, blocked: false }));
  const stalled: QueueRow[] = [...reported, ...awaitingSeverity].map((incident) => ({
    incident,
    blocked: true,
  }));
  const allRows: QueueRow[] = [...actionable, ...stalled];

  const columns: Array<DataColumn<QueueRow>> = [
    {
      key: 'incident',
      label: 'Incident',
      sortable: true,
      sortValue: (r) => r.incident.id,
      render: (r) => (
        <Link to={`/comms/incident/${r.incident.id}`}>{r.incident.id}</Link>
      ),
    },
    {
      key: 'route',
      label: 'Route',
      sortable: true,
      sortValue: (r) => r.incident.route,
      render: (r) => r.incident.route,
    },
    {
      key: 'location',
      label: 'Location',
      sortable: true,
      sortValue: (r) => r.incident.location,
      render: (r) => r.incident.location,
    },
    {
      key: 'severity',
      label: 'Severity',
      sortable: true,
      sortValue: (r) => r.incident.severity ?? '',
      filter: 'select',
      filterValue: (r) => r.incident.severity ?? 'Not assessed',
      render: (r) => <SeverityBadge level={r.incident.severity} />,
    },
    {
      key: 'opStatus',
      label: 'Operational Status',
      filter: 'select',
      filterValue: (r) => opStatusText(r.incident.operationalStatus),
      render: (r) =>
        r.blocked ? (
          <span className="muted">{opStatusText(r.incident.operationalStatus)}</span>
        ) : (
          <OpStatusBadge status={r.incident.operationalStatus} />
        ),
    },
    {
      key: 'commStatus',
      label: 'Communication Status',
      filter: 'select',
      filterValue: (r) =>
        r.blocked
          ? 'Blocked'
          : r.incident.commsRequestedAt !== null
            ? 'Requested by Operations'
            : 'Passenger Notice Required',
      render: (r) =>
        r.blocked ? (
          <span className="muted">Blocked</span>
        ) : (
          <span>
            <span className="badge tg-warn">▲ Passenger Notice Required</span>{' '}
            {r.incident.commsRequestedAt !== null && (
              <span className="badge st-ops">◈ Requested by Operations</span>
            )}
          </span>
        ),
    },
    {
      key: 'timer',
      label: 'Timer',
      sortable: true,
      sortValue: (r) => firstCommunicationKpi(r.incident, nowIso).elapsedMs,
      render: (r) => {
        const kpi = firstCommunicationKpi(r.incident, nowIso);
        return kpi.elapsedMs === null ? '—' : formatMmSs(kpi.elapsedMs);
      },
    },
    {
      key: 'action',
      label: 'Action',
      render: (r) => (
        <Link to={`/comms/incident/${r.incident.id}`}>Prepare Update</Link>
      ),
    },
  ];

  return (
    <div>
      <div className="pagehead">
        <Crumbs trail={['Customer Information', 'Communication Queue']} />
        <h1>Communication Queue</h1>
        <p className="lede">
          Prioritise passenger notices using incident severity and the first-publication
          target.
        </p>
      </div>

      <Section
        title="Communication Queue"
        count={`${allRows.length} record${allRows.length === 1 ? '' : 's'}`}
      >
        <DataTable<QueueRow>
          rows={allRows}
          columns={columns}
          rowKey={(r) => r.incident.id}
          searchText={(r) => `${r.incident.id} ${r.incident.route} ${r.incident.location}`}
          searchPlaceholder="Incident, route or location"
          pageSize={8}
          emptyTitle="Nothing needs a first publication"
          emptyDescription="Validated incidents appear here while the communication clock is running."
        />
      </Section>
    </div>
  );
}
