import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { OpStatusBadge, SeverityBadge } from '../../components/badges.js';
import { FioriButton } from '../../components/Button.js';
import { Crumbs, Section } from '../../components/chrome.js';
import { DataTable, type DataColumn } from '../../components/DataTable.js';
import type { Incident } from '../../domain/types.js';
import {
  awaitingSeverityAssessment,
  needsFirstPublication,
} from '../../domain/comms.js';
import { firstCommunicationKpi, formatMmSs, formatNzdtShort } from '../../domain/kpi.js';
import { useAppStore } from '../../state/AppStore.js';

function useNowTick(active: boolean): string {
  const [now, setNow] = useState(() => new Date().toISOString());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(new Date().toISOString()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

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
 * first, with a readiness filter and the selected-incident card.
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
      render: (r) =>
        r.blocked ? (
          <span className="muted">{r.incident.id}</span>
        ) : (
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
      filterValue: (r) => (r.blocked ? 'Blocked' : 'Passenger Notice Required'),
      render: (r) =>
        r.blocked ? (
          <span className="muted">Blocked</span>
        ) : (
          <span className="badge tg-warn">▲ Passenger Notice Required</span>
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
      render: (r) =>
        r.blocked ? (
          <span className="muted">—</span>
        ) : (
          <Link to={`/comms/incident/${r.incident.id}`}>Prepare Update</Link>
        ),
    },
  ];

  const selected = queue[0] ?? null;
  const selectedKpi = selected ? firstCommunicationKpi(selected, nowIso) : null;

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

      {selected && selectedKpi && (
        <Section title={`Selected incident · ${selected.id}`}>
          <dl className="facts-grid">
            <div className="fact">
              <dt>Estimated Delay</dt>
              <dd>{selected.estimatedDelayMinutes} min</dd>
            </div>
            <div className="fact">
              <dt>Estimated Restoration</dt>
              <dd>
                {selected.estimatedRestorationAt
                  ? formatNzdtShort(selected.estimatedRestorationAt)
                  : 'Not yet confirmed'}
              </dd>
            </div>
            <div className="fact">
              <dt>Owner</dt>
              <dd>{selected.owner ?? '— unassigned'}</dd>
            </div>
            <div className="fact">
              <dt>Time Remaining</dt>
              <dd>
                {selectedKpi.remainingMs === null
                  ? '—'
                  : `${formatMmSs(Math.max(0, selectedKpi.remainingMs))}`}
              </dd>
            </div>
          </dl>
          <div className="note" role="note">
            First Publication: Not yet published · Target: ≤10 min
          </div>
          <div className="actions-bar">
            <FioriButton
              design="emphasized"
              icon="arrowRight"
              to={`/comms/incident/${selected.id}`}
            >
              Prepare Update
            </FioriButton>
          </div>
        </Section>
      )}
    </div>
  );
}
