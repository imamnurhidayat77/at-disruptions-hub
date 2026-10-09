import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Crumbs, Section } from '../../components/chrome.js';
import { KpiCard } from '../../components/KpiCard.js';
import { OpStatusBadge } from '../../components/badges.js';
import { FioriButton } from '../../components/Button.js';
import { DataTable, type DataColumn } from '../../components/DataTable.js';
import { formatNzdtShort, formatMmSs, queueKpis } from '../../domain/kpi.js';
import { operationalStatusLabel } from '../../domain/operations.js';
import type { Incident } from '../../domain/types.js';
import { useAppStore } from '../../state/AppStore.js';

/**
 * Operations Overview — Figma "03 AT Operations" frame.
 * Monitoring only: alert strip, KPI cards (comms cards drill into
 * Analytics) and a filter-free "Needs attention" preview. Accept &
 * assess happens in one place only: the Incoming worklist.
 */
export function OperationsOverview(): React.JSX.Element {
  const { state, setRole } = useAppStore();

  useEffect(() => {
    setRole('OPERATIONS');
  }, [setRole]);

  const kpis = queueKpis(state.incidents);
  const highCritical = state.incidents.filter(
    (i) => (i.severity === 'HIGH' || i.severity === 'CRITICAL') && i.operationalStatus !== 'CLOSED',
  ).length;
  const reported = state.incidents.filter((i) => i.operationalStatus === 'REPORTED');
  const unlinkedSap = state.sapCandidates.filter((c) => c.linkedIncidentId === null).length;
  const highAwaiting = reported.filter((i) => i.passengerImpact === 'HIGH').length;

  const attention: Incident[] = reported.slice(0, 5);

  const columns: Array<DataColumn<Incident>> = [
    {
      key: 'incident',
      label: 'Incident',
      sortable: true,
      sortValue: (i) => i.id,
      render: (i) => <Link to={`/operations/incident/${i.id}`}>{i.id}</Link>,
    },
    {
      key: 'route',
      label: 'Route',
      sortable: true,
      filter: 'select',
      filterValue: (i) => `Route ${i.route}`,
      sortValue: (i) => i.route,
      render: (i) => i.route,
    },
    {
      key: 'operator',
      label: 'Operator/Source',
      sortable: true,
      sortValue: (i) => i.operator,
      render: (i) => i.operator,
    },
    {
      key: 'location',
      label: 'Location',
      sortable: true,
      sortValue: (i) => i.location,
      render: (i) => i.location,
    },
    {
      key: 'reported',
      label: 'Reported',
      sortable: true,
      sortValue: (i) => Date.parse(i.detectedAt),
      render: (i) => formatNzdtShort(i.detectedAt),
    },
    {
      key: 'delay',
      label: 'Estimated Delay',
      sortable: true,
      sortValue: (i) => i.estimatedDelayMinutes,
      render: (i) => `${i.estimatedDelayMinutes} min`,
    },
    {
      key: 'impact',
      label: 'Passenger Impact',
      sortable: true,
      filter: 'select',
      filterValue: (i) =>
        i.passengerImpact.charAt(0) + i.passengerImpact.slice(1).toLowerCase(),
      sortValue: (i) => i.passengerImpact,
      render: (i) =>
        i.passengerImpact === 'HIGH' ? (
          <span className="badge tg-warn">▲ High</span>
        ) : (
          <span className="muted">
            {i.passengerImpact.charAt(0) + i.passengerImpact.slice(1).toLowerCase()}
          </span>
        ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      filter: 'select',
      filterValue: (i) =>
        i.operationalStatus === 'REPORTED'
          ? 'Awaiting AT Assessment'
          : operationalStatusLabel(i.operationalStatus),
      sortValue: (i) => i.operationalStatus,
      render: (i) =>
        i.operationalStatus === 'REPORTED' ? (
          <span className="badge st-idle">○ Awaiting AT Assessment</span>
        ) : (
          <OpStatusBadge status={i.operationalStatus} />
        ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (i) => (
        <FioriButton small icon="view" to={`/operations/incident/${i.id}`}>
          View
        </FioriButton>
      ),
    },
  ];

  return (
    <div>
      <div className="pagehead">
        <Crumbs trail={['Operations', 'Overview']} />
        <h1>Operations Overview</h1>
        <p className="lede">
          Monitor incoming disruptions, prioritise incidents and coordinate service recovery.
        </p>
      </div>

      {highAwaiting > 0 && (
        <div className="note warn" role="note">
          {highAwaiting} high-impact incident{highAwaiting === 1 ? '' : 's'} awaiting
          assessment.
        </div>
      )}

      <div className="kpi-grid">
        <KpiCard title="Active Incidents" value={kpis.active} context="Including incoming notifications" />
        <KpiCard
          title="High / Critical"
          value={highCritical}
          context="High passenger impact reported"
        />
        <KpiCard
          title="Average First Communication"
          value={kpis.averageFirstCommMs === null ? '—' : formatMmSs(kpis.averageFirstCommMs)}
          context={
            kpis.publishedCount === 0
              ? 'No first publication yet'
              : `Across ${kpis.publishedCount} published update${kpis.publishedCount === 1 ? '' : 's'}`
          }
          linkTo="/operations/analytics"
          linkLabel="View analytics"
        />
        <KpiCard
          title="Within 10-Min Target"
          value={kpis.achievedPct === null ? '—' : `${kpis.achievedPct}%`}
          context={
            kpis.publishedCount === 0
              ? 'Awaiting first publication'
              : `${kpis.achievedCount} of ${kpis.publishedCount} within 10 min`
          }
          linkTo="/operations/analytics"
          linkLabel="View analytics"
        />
      </div>

      <Section
        title="Needs attention"
        count={`${reported.length} awaiting assessment`}
      >
        <DataTable<Incident>
          rows={attention}
          columns={columns}
          rowKey={(i) => i.id}
          showFilterBar={false}
          pageSize={5}
          emptyTitle="All caught up"
          emptyDescription="No notifications awaiting assessment."
        />
        <p className="muted small">
          {reported.length} operator notification · {unlinkedSap} SAP source candidates —
          review and accept in the <Link to="/operations/incoming">Incoming worklist</Link>.
          SAP source candidates are not active AT incidents.
        </p>
        <div className="actions-bar">
          <FioriButton icon="detail" to="/operations/incoming">
            Open Incoming Worklist
          </FioriButton>
        </div>
      </Section>
    </div>
  );
}
