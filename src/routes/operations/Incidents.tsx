import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CommsTargetBadge, OpStatusBadge, SeverityBadge } from '../../components/badges.js';
import { Crumbs, Section } from '../../components/chrome.js';
import { FioriButton } from '../../components/Button.js';
import { DataTable, type DataColumn } from '../../components/DataTable.js';
import { formatNzdtShort } from '../../domain/kpi.js';
import { operationalStatusLabel } from '../../domain/operations.js';
import type { Incident } from '../../domain/types.js';
import { useAppStore } from '../../state/AppStore.js';

/**
 * Incidents — Figma "03 AT Operations" worklist. Status and ownership
 * overview with drill-through to the workspace; no inline editing here.
 */
export function Incidents(): React.JSX.Element {
  const { state, setRole } = useAppStore();

  useEffect(() => {
    setRole('OPERATIONS');
  }, [setRole]);

  const rows: Incident[] = state.incidents;

  const selected = rows[0] ?? null;

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
      filter: 'select',
      filterValue: (i) => i.severity ?? 'Not assessed',
      sortValue: (i) => i.severity ?? '',
      render: (i) => <SeverityBadge level={i.severity} />,
    },
    {
      key: 'status',
      label: 'Operational Status',
      sortable: true,
      filter: 'select',
      filterValue: (i) => operationalStatusLabel(i.operationalStatus),
      sortValue: (i) => i.operationalStatus,
      render: (i) => <OpStatusBadge status={i.operationalStatus} />,
    },
    {
      key: 'comms',
      label: 'Communication',
      sortable: true,
      sortValue: (i) => i.communicationStatus,
      render: (i) =>
        i.communicationStatus === 'PUBLISHED' ? (
          <CommsTargetBadge incident={i} />
        ) : (
          <span className="muted">
            {i.communicationStatus.charAt(0) +
              i.communicationStatus
                .slice(1)
                .toLowerCase()
                .replace(/_/g, ' ')}
          </span>
        ),
    },
    {
      key: 'owner',
      label: 'Owner',
      sortable: true,
      sortValue: (i) => i.owner ?? '',
      render: (i) => i.owner ?? 'Unassigned',
    },
    {
      key: 'action',
      label: 'Action',
      render: (i) => (
        <FioriButton small icon="view" to={`/operations/incident/${i.id}`}>
          View Incident
        </FioriButton>
      ),
    },
  ];

  return (
    <div>
      <div className="pagehead">
        <Crumbs trail={['Operations', 'Incidents']} />
        <h1>Incidents</h1>
        <p className="lede">Manage shared disruption records and operational ownership.</p>
      </div>

      <Section
        title="Incidents"
        count={`${rows.length} record${rows.length === 1 ? '' : 's'}`}
      >
        <DataTable<Incident>
          rows={rows}
          columns={columns}
          rowKey={(i) => i.id}
          searchText={(i) => `${i.id} ${i.route} ${i.location} ${i.owner ?? ''} ${i.disruptionType}`}
          searchPlaceholder="Search incidents"
          pageSize={10}
          emptyTitle="No incidents match"
          emptyDescription="Try changing the filter criteria."
        />
        <p className="table-foot">Showing all records</p>
      </Section>

      {selected && (
        <Section title={`Selected incident · ${selected.id}`}>
          <dl className="facts-grid">
            <div className="fact">
              <dt>Disruption Type</dt>
              <dd>{selected.disruptionType}</dd>
            </div>
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
              <dt>First Communication</dt>
              <dd>
                {selected.firstPublishedAt ? (
                  <CommsTargetBadge incident={selected} />
                ) : (
                  <span className="muted">Not yet published</span>
                )}
              </dd>
            </div>
          </dl>
          <p className="muted small">
            Operational status: {operationalStatusLabel(selected.operationalStatus)} ·
            Owner: {selected.owner ?? 'Unassigned'}
          </p>
          <div className="actions-bar">
            <FioriButton design="emphasized" icon="view" to={`/operations/incident/${selected.id}`}>
              View Incident
            </FioriButton>
            <FioriButton icon="wrench" to="/operations/recovery">
              Update Recovery
            </FioriButton>
          </div>
        </Section>
      )}
    </div>
  );
}
