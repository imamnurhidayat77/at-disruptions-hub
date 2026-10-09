import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CommsTargetBadge, SeverityBadge } from '../../components/badges.js';
import { FioriButton } from '../../components/Button.js';
import { Crumbs, Section } from '../../components/chrome.js';
import { DataTable, type DataColumn } from '../../components/DataTable.js';
import type { Incident } from '../../domain/types.js';
import { firstCommunicationKpi, formatMmSs, formatNzdtShort } from '../../domain/kpi.js';
import { operationalStatusLabel } from '../../domain/operations.js';
import { useAppStore } from '../../state/AppStore.js';

/**
 * Published Updates — Figma "04 Customer Information". Filterable record
 * of first publications with the selected-notice detail card.
 */
export function PublishedPage(): React.JSX.Element {
  const { state, setRole } = useAppStore();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setRole('CUSTOMER_INFORMATION');
  }, [setRole]);

  const published: Incident[] = [...state.incidents]
    .filter((i) => i.communicationStatus === 'PUBLISHED')
    .sort(
      (a, b) =>
        Date.parse(b.firstPublishedAt ?? b.detectedAt) -
        Date.parse(a.firstPublishedAt ?? a.detectedAt),
    );

  const columns: Array<DataColumn<Incident>> = [
    {
      key: 'incident',
      label: 'Incident',
      sortable: true,
      sortValue: (i) => i.id,
      render: (i) => (
        <button type="button" className="tbl-link" onClick={() => setSelectedId(i.id)}>
          <strong>{i.id}</strong>
        </button>
      ),
    },
    {
      key: 'title',
      label: 'Message Title',
      sortable: true,
      sortValue: (i) => i.commsDraft?.title ?? '',
      render: (i) => i.commsDraft?.title ?? '—',
    },
    {
      key: 'severity',
      label: 'Severity',
      sortable: true,
      sortValue: (i) => i.severity ?? '',
      filter: 'select',
      filterValue: (i) => i.severity ?? 'Not assessed',
      render: (i) => <SeverityBadge level={i.severity} />,
    },
    {
      key: 'channels',
      label: 'Channels',
      filter: 'select',
      filterValue: (i) => i.selectedChannels.join(' · ') || '—',
      render: (i) => i.selectedChannels.join(' · ') || '—',
    },
    {
      key: 'publishedAt',
      label: 'Published',
      sortable: true,
      sortValue: (i) => i.firstPublishedAt ?? '',
      render: (i) => (i.firstPublishedAt ? formatNzdtShort(i.firstPublishedAt) : '—'),
    },
    {
      key: 'firstComm',
      label: 'First Communication',
      sortable: true,
      sortValue: (i) => firstCommunicationKpi(i).elapsedMs,
      render: (i) => {
        const kpi = firstCommunicationKpi(i);
        return kpi.elapsedMs === null ? '—' : formatMmSs(kpi.elapsedMs);
      },
    },
    {
      key: 'target',
      label: 'Target',
      filter: 'select',
      filterValue: (i) => (firstCommunicationKpi(i).targetMet ? 'Achieved' : 'Breached'),
      render: (i) => <CommsTargetBadge incident={i} />,
    },
    {
      key: 'action',
      label: 'Action',
      render: (i) => (
        <button
          type="button"
          className="tbl-link"
          onClick={() => navigate(`/comms/incident/${i.id}`, { state: { followUp: true } })}
        >
          Publish Follow-Up
        </button>
      ),
    },
  ];
  const selected = published.find((i) => i.id === selectedId) ?? published[0] ?? null;

  return (
    <div>
      <div className="pagehead">
        <Crumbs trail={['Customer Information', 'Published Updates']} />
        <h1>Published Updates</h1>
        <p className="lede">
          Review published passenger notices and prepare follow-up communication.
        </p>
      </div>

      <Section
        title="Published Updates"
        count={`${published.length} record${published.length === 1 ? '' : 's'}`}
      >
        <DataTable<Incident>
          rows={published}
          columns={columns}
          rowKey={(i) => i.id}
          searchText={(i) => `${i.id} ${i.route} ${i.commsDraft?.title ?? ''}`}
          searchPlaceholder="Search published updates"
          pageSize={8}
          emptyTitle="No passenger updates published yet"
          emptyDescription="First publications appear here with timing and target results."
        />
      </Section>

      {selected?.commsDraft && (
        <Section title={selected.commsDraft.title}>
          <p>
            <span className="badge tg-good">✓ Published</span>
          </p>
          <p>{selected.commsDraft.message}</p>
          <dl className="facts-grid">
            <div className="fact">
              <dt>Next Update Time</dt>
              <dd>{selected.commsDraft.nextUpdateBy || '—'}</dd>
            </div>
            <div className="fact">
              <dt>Operational Status</dt>
              <dd>{operationalStatusLabel(selected.operationalStatus)}</dd>
            </div>
            <div className="fact">
              <dt>Estimated Restoration</dt>
              <dd>
                {selected.estimatedRestorationAt
                  ? formatNzdtShort(selected.estimatedRestorationAt)
                  : 'Not yet confirmed'}
              </dd>
            </div>
          </dl>
          <div className="actions-bar">
            <FioriButton
              design="emphasized"
              icon="send"
              onClick={() =>
                navigate(`/comms/incident/${selected.id}`, { state: { followUp: true } })
              }
            >
              Publish Follow-Up
            </FioriButton>
          </div>
        </Section>
      )}
    </div>
  );
}
