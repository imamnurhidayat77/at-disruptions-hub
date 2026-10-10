import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Crumbs, Section } from '../../components/chrome.js';
import { DataTable, type DataColumn } from '../../components/DataTable.js';
import { KpiCard } from '../../components/KpiCard.js';
import { CommsTargetBadge } from '../../components/badges.js';
import { communicationCoverage } from '../../domain/comms.js';
import { firstCommunicationKpi, formatMmSs, formatNzdtShort, queueKpis } from '../../domain/kpi.js';
import type { Incident } from '../../domain/types.js';
import { useAppStore } from '../../state/AppStore.js';

/** Analytics — communication performance derived from shared timestamps. */
export function AnalyticsPage(): React.JSX.Element {
  const { state, setRole } = useAppStore();

  useEffect(() => {
    setRole('CUSTOMER_INFORMATION');
  }, [setRole]);

  const kpis = queueKpis(state.incidents);
  const coverage = communicationCoverage(state.incidents);
  const published = state.incidents.filter((i) => i.communicationStatus === 'PUBLISHED');

  const columns: Array<DataColumn<Incident>> = [
    {
      key: 'incident',
      label: 'Incident',
      sortable: true,
      sortValue: (i) => i.id,
      render: (i) => (
        <Link to={`/comms/incident/${i.id}`}>
          <strong>{i.id}</strong>
        </Link>
      ),
    },
    {
      key: 'confirmed',
      label: 'Confirmed',
      sortable: true,
      sortValue: (i) => i.confirmedAt ?? '',
      render: (i) => (i.confirmedAt ? formatNzdtShort(i.confirmedAt) : '—'),
    },
    {
      key: 'firstPublished',
      label: 'First published',
      sortable: true,
      sortValue: (i) => i.firstPublishedAt ?? '',
      render: (i) => (i.firstPublishedAt ? formatNzdtShort(i.firstPublishedAt) : '—'),
    },
    {
      key: 'firstComm',
      label: 'First communication',
      sortable: true,
      sortValue: (i) => firstCommunicationKpi(i).elapsedMs,
      render: (i) => {
        const elapsed = firstCommunicationKpi(i).elapsedMs;
        return elapsed === null ? '—' : formatMmSs(elapsed);
      },
    },
    {
      key: 'target',
      label: 'Target',
      filter: 'select',
      filterValue: (i) => (firstCommunicationKpi(i).targetMet ? 'Achieved' : 'Breached'),
      render: (i) => <CommsTargetBadge incident={i} />,
    },
  ];

  return (
    <div>
      <div className="pagehead">
        <Crumbs trail={['Customer Information', 'Reports']} />
        <h1>Communication Reports</h1>
        <p className="lede">
          Communication performance derived from confirmation and publication
          timestamps — never hard-coded.
        </p>
      </div>


      <div className="kpi-grid">
        <KpiCard
          title="Average First Publication"
          value={kpis.averageFirstCommMs === null ? '—' : formatMmSs(kpis.averageFirstCommMs)}
          context={`Confirmation → first publication (${kpis.publishedCount} published)`}
        />
        <KpiCard
          title="Communication Coverage"
          value={coverage.pct === null ? '—' : `${coverage.pct}%`}
          context={`${coverage.published} of ${coverage.inScope} updates published`}
        />
        <KpiCard
          title="Within 10-Minute Target"
          value={kpis.achievedPct === null ? '—' : `${kpis.achievedPct}%`}
          tone={kpis.achievedPct !== null && kpis.achievedPct >= 100 ? 'good' : undefined}
          context={`${kpis.achievedCount} of ${kpis.publishedCount} initial updates within 10 min`}
        />
        <KpiCard
          title="Awaiting Initial Update"
          value={kpis.awaiting}
          context="Initial passenger update not published"
        />
      </div>

      <Section title={`First-publication record (${published.length})`}>
        <DataTable<Incident>
          rows={published}
          columns={columns}
          rowKey={(i) => i.id}
          searchText={(i) => `${i.id} ${i.route}`}
          searchPlaceholder="Search records"
          pageSize={10}
          emptyTitle="No publications yet"
          emptyDescription="Figures above show — until the first publish."
        />
        <div className="note">
          The first-communication clock stops at first publication; follow-up
          publications never reset it.
        </div>
      </Section>
    </div>
  );
}
