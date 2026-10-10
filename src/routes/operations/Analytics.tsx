import { useEffect } from 'react';
import { Crumbs, Section } from '../../components/chrome.js';
import { EmptyState } from '../../components/EmptyState.js';
import { KpiCard } from '../../components/KpiCard.js';
import { SeverityBadge } from '../../components/badges.js';
import { DataTable, type DataColumn } from '../../components/DataTable.js';
import { formatMmSs, queueKpis } from '../../domain/kpi.js';
import type { Severity } from '../../domain/types.js';
import { useAppStore } from '../../state/AppStore.js';

const LEVELS: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

interface SeverityPerfRow {
  level: Severity;
  published: number;
  met: number;
}

/** Analytics — prototype communication performance, derived from records. */
export function Analytics(): React.JSX.Element {
  const { state, setRole } = useAppStore();

  useEffect(() => {
    setRole('OPERATIONS');
  }, [setRole]);

  const kpis = queueKpis(state.incidents);
  const published = state.incidents.filter((i) => i.firstPublishedAt !== null);

  const perfRows: SeverityPerfRow[] = LEVELS.flatMap((level) => {
    const levelRows = published.filter((i) => i.severity === level);
    if (levelRows.length === 0) return [];
    const met = levelRows.filter((i) => {
      if (!i.confirmedAt || !i.firstPublishedAt) return false;
      return Date.parse(i.firstPublishedAt) - Date.parse(i.confirmedAt) <= 10 * 60 * 1000;
    }).length;
    return [{ level, published: levelRows.length, met }];
  });

  const perfColumns: Array<DataColumn<SeverityPerfRow>> = [
    {
      key: 'severity',
      label: 'Severity',
      sortable: true,
      filter: 'select',
      filterValue: (r) => r.level.charAt(0) + r.level.slice(1).toLowerCase(),
      sortValue: (r) => r.level,
      render: (r) => <SeverityBadge level={r.level} />,
    },
    {
      key: 'published',
      label: 'Published',
      sortable: true,
      sortValue: (r) => r.published,
      render: (r) => r.published,
    },
    {
      key: 'within',
      label: 'Within target',
      sortable: true,
      sortValue: (r) => (r.published === 0 ? 0 : r.met / r.published),
      render: (r) => `${r.met} of ${r.published}`,
    },
  ];

  return (
    <div>
      <div className="pagehead">
        <Crumbs trail={['Operations', 'Analytics']} />
        <h1>Analytics</h1>
        <p className="lede">
          Communication performance — derived from confirmation and
          publication timestamps.
        </p>
      </div>

      <div className="kpi-grid">
        <KpiCard
          title="Average First Communication"
          value={kpis.averageFirstCommMs === null ? '—' : formatMmSs(kpis.averageFirstCommMs)}
          context={`Across ${kpis.publishedCount} published updates`}
        />
        <KpiCard
          title="Within 10-Min Target"
          value={kpis.achievedPct === null ? '—' : `${kpis.achievedPct}%`}
          tone="good"
          context={`${kpis.achievedCount} of ${kpis.publishedCount} within target`}
        />
        <KpiCard
          title="Active Incidents"
          value={kpis.active}
          context="Not closed or restored"
        />
        <KpiCard
          title="Awaiting Initial Update"
          value={kpis.awaiting}
          context="Not yet published"
        />
      </div>

      <Section title="Performance by severity">
        {published.length === 0 ? (
          <EmptyState
            illustration="✓"
            title="No publications yet"
            description="Figures appear here after the first passenger publication."
          />
        ) : (
          <DataTable<SeverityPerfRow>
            rows={perfRows}
            columns={perfColumns}
            rowKey={(r) => r.level}
            searchText={(r) => r.level}
            searchPlaceholder="Search severities"
            pageSize={8}
            emptyTitle="No publications yet"
            emptyDescription="Figures appear here after the first passenger publication."
          />
        )}
      </Section>
    </div>
  );
}
