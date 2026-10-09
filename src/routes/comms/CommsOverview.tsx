import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { OpStatusBadge, SeverityBadge } from '../../components/badges.js';
import { FioriButton } from '../../components/Button.js';
import { Crumbs, Section } from '../../components/chrome.js';
import { DataTable, type DataColumn } from '../../components/DataTable.js';
import { KpiCard } from '../../components/KpiCard.js';
import {
  awaitingFirstUpdate,
  communicationCoverage,
  needsFirstPublication,
  oldestCountingElapsedMs,
} from '../../domain/comms.js';
import { firstCommunicationKpi, formatMmSs, queueKpis } from '../../domain/kpi.js';
import type { Incident } from '../../domain/types.js';
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

/**
 * Customer Information Overview — Figma "04 Customer Information".
 * Communication KPIs, queue preview and the validated-information
 * explainer. Publishing happens in the composer.
 */
export function CommsOverview(): React.JSX.Element {
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
  const counting = queue.length > 0;
  const nowIso = useNowTick(counting);
  const awaiting = awaitingFirstUpdate(state.incidents);
  const oldestMs = oldestCountingElapsedMs(state.incidents, nowIso);
  const kpis = queueKpis(state.incidents, nowIso);
  const coverage = communicationCoverage(state.incidents);
  const oldestRemaining =
    queue.length > 0 ? firstCommunicationKpi(queue[0], nowIso).remainingMs : null;

  const columns: Array<DataColumn<Incident>> = [
    {
      key: 'incident',
      label: 'Incident',
      sortable: true,
      sortValue: (i) => i.id,
      render: (i) => <Link to={`/comms/incident/${i.id}`}>{i.id}</Link>,
    },
    {
      key: 'route',
      label: 'Route',
      sortable: true,
      sortValue: (i) => i.route,
      render: (i) => i.route,
    },
    {
      key: 'location',
      label: 'Location',
      sortable: true,
      sortValue: (i) => i.location,
      render: (i) => i.location,
    },
    {
      key: 'severity',
      label: 'Severity',
      sortable: true,
      sortValue: (i) => i.severity ?? '',
      render: (i) => <SeverityBadge level={i.severity} />,
    },
    {
      key: 'opStatus',
      label: 'Operational Status',
      render: (i) => <OpStatusBadge status={i.operationalStatus} />,
    },
    {
      key: 'commStatus',
      label: 'Communication Status',
      render: () => <span className="badge tg-warn">▲ Passenger Notice Required</span>,
    },
    {
      key: 'timer',
      label: 'Timer',
      sortable: true,
      sortValue: (i) => firstCommunicationKpi(i, nowIso).elapsedMs,
      render: (i) => {
        const kpi = firstCommunicationKpi(i, nowIso);
        return kpi.elapsedMs === null ? '—' : formatMmSs(kpi.elapsedMs);
      },
    },
    {
      key: 'action',
      label: 'Action',
      render: (i) => <Link to={`/comms/incident/${i.id}`}>Prepare Update</Link>,
    },
  ];

  return (
    <div>
      <div className="pagehead">
        <Crumbs trail={['Customer Information', 'Overview']} />
        <h1>Customer Information Overview</h1>
        <p className="lede">
          Prepare timely and consistent passenger updates using validated disruption
          information.
        </p>
      </div>

      {awaiting.length > 0 && (
        <div className="note warn" role="note">
          {awaiting.map((i) => `Route ${i.route}`).join(', ')} requires a first passenger
          notice. The communication target is ≤10 minutes.
        </div>
      )}

      <div className="kpi-grid">
        <KpiCard
          title="Awaiting Passenger Update"
          value={awaiting.length}
          context="First publication required"
        />
        <KpiCard
          title="Oldest Communication Timer"
          value={oldestMs === null ? '—' : formatMmSs(oldestMs)}
          context={
            oldestMs === null
              ? 'No running timer'
              : `${oldestRemaining === null ? '—' : formatMmSs(Math.max(0, oldestRemaining))} remaining · Target ≤10 min`
          }
        />
        <KpiCard
          title="Average First Publication"
          value={kpis.averageFirstCommMs === null ? '—' : formatMmSs(kpis.averageFirstCommMs)}
          context="No publication yet"
        />
        <KpiCard
          title="Communication Coverage"
          value={`${coverage.published} / ${coverage.inScope}`}
          context={
            coverage.inScope === coverage.published
              ? 'All updates published'
              : 'Incident awaiting a notice'
          }
        />
      </div>

      <Section
        title="Passenger Communication Queue"
        count={`${queue.length} record${queue.length === 1 ? '' : 's'}`}
      >
        <DataTable<Incident>
          rows={queue.slice(0, 5)}
          columns={columns}
          rowKey={(i) => i.id}
          showFilterBar={false}
          pageSize={8}
          emptyTitle="Nothing needs a first publication right now."
          emptyDescription="Validated incidents appear here while the communication clock is running."
        />
      </Section>

      <Section title="Validated information, consistent updates">
        <p className="muted">
          Passenger notices use the same shared incident record as Operations. Recovery
          controls remain with AT Operations.
        </p>
        <div className="actions-bar">
          <FioriButton icon="inbox" to="/comms/queue">
            Communication Queue
          </FioriButton>
          {queue.length > 0 && (
            <FioriButton
              design="emphasized"
              icon="arrowRight"
              to={`/comms/incident/${queue[0].id}`}
            >
              Prepare Update
            </FioriButton>
          )}
        </div>
      </Section>
    </div>
  );
}
