import { Link } from 'react-router-dom';
import { SeverityBadge } from '../../components/badges.js';
import { FioriButton } from '../../components/Button.js';
import { DataTable, type DataColumn } from '../../components/DataTable.js';
import {
  assessedByAT,
  lastOperatorUpdateAt,
  operatorStatusLabel,
} from '../../domain/contractor.js';
import { formatNzdtTime } from '../../domain/kpi.js';
import type { Incident } from '../../domain/types.js';

/**
 * Contractor incident table — business information only: ID, route,
 * location, disruption type, AT status (operator wording), AT severity
 * only once assessed, last operator update, action. No SLA timers, no
 * KPI analytics, no AT-internal fields.
 */
export function ContractorIncidentTable({
  rows,
  onFilteredCount,
}: {
  rows: Incident[];
  onFilteredCount?: (count: number) => void;
}): React.JSX.Element {
  const columns: Array<DataColumn<Incident>> = [
    {
      key: 'id',
      label: 'Incident',
      sortable: true,
      sortValue: (i) => i.id,
      render: (i) => <Link to={`/contractor/incident/${i.id}`}>{i.id}</Link>,
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
      key: 'type',
      label: 'Disruption Type',
      sortable: true,
      sortValue: (i) => i.disruptionType,
      filter: 'select',
      filterValue: (i) => i.disruptionType,
      render: (i) => i.disruptionType,
    },
    {
      key: 'status',
      label: 'AT Status',
      filter: 'select',
      filterValue: (i) => operatorStatusLabel(i),
      render: (i) => <span className="badge st-ops">◷ {operatorStatusLabel(i)}</span>,
    },
    {
      key: 'severity',
      label: 'AT Severity',
      sortable: true,
      sortValue: (i) => (assessedByAT(i) ? i.severity : ''),
      filter: 'select',
      filterValue: (i) => (assessedByAT(i) ? (i.severity ?? 'Awaiting AT Assessment') : 'Awaiting AT Assessment'),
      render: (i) =>
        assessedByAT(i) ? (
          <SeverityBadge level={i.severity} />
        ) : (
          <span className="muted">Awaiting AT Assessment</span>
        ),
    },
    {
      key: 'updated',
      label: 'Last Operator Update',
      sortable: true,
      sortValue: (i) => lastOperatorUpdateAt(i) ?? '',
      render: (i) => {
        const lastUpdate = lastOperatorUpdateAt(i);
        return lastUpdate ? formatNzdtTime(lastUpdate) : '—';
      },
    },
    {
      key: 'action',
      label: 'Action',
      render: (i) => (
        <FioriButton small icon="view" to={`/contractor/incident/${i.id}`}>
          View Incident
        </FioriButton>
      ),
    },
  ];

  return (
    <DataTable<Incident>
      rows={rows}
      columns={columns}
      rowKey={(i) => i.id}
      searchText={(i) => `${i.id} ${i.route} ${i.location} ${i.disruptionType}`}
      searchPlaceholder="Incident, route or location"
      pageSize={8}
      emptyTitle="No incidents to show"
      emptyDescription="Reports from this operator will appear here."
      onFilteredCount={onFilteredCount}
    />
  );
}
