import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ReviewBadge, SeverityBadge, reviewDisplay } from '../../components/badges.js';
import { Crumbs, Section } from '../../components/chrome.js';
import { EmptyState } from '../../components/EmptyState.js';
import { FioriButton } from '../../components/Button.js';
import { DataTable, type DataColumn } from '../../components/DataTable.js';
import type { Incident } from '../../domain/types.js';
import { useAppStore } from '../../state/AppStore.js';

/**
 * Reviews — Figma "05 Incident Closure & Review" worklist. Tracks
 * post-incident reviews and corrective action completion, separately
 * from service recovery.
 */
export function Reviews(): React.JSX.Element {
  const { state, setRole, startReview, markCorrectiveDone } = useAppStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('incident');

  function selectReview(nextId: string): void {
    setSearchParams({ incident: nextId });
  }

  useEffect(() => {
    setRole('OPERATIONS');
  }, [setRole]);

  const reviews = state.incidents.filter((i) => i.reviewRequired);
  const rows = reviews;
  const selected = rows.find((i) => i.id === selectedId) ?? rows[0] ?? null;

  const columns: Array<DataColumn<Incident>> = [
    {
      key: 'incident',
      label: 'Incident',
      sortable: true,
      sortValue: (i) => i.id,
      render: (i) => (
        <FioriButton
          small
          design="transparent"
          icon="detail"
          onClick={() => selectReview(i.id)}
          ariaLabel={`Select review ${i.id}`}
        >
          {i.id}
        </FioriButton>
      ),
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
      key: 'review',
      label: 'Review Status',
      sortable: true,
      filter: 'select',
      filterValue: (i) => reviewDisplay(i),
      sortValue: (i) => reviewDisplay(i),
      render: (i) => <ReviewBadge status={reviewDisplay(i)} />,
    },
    {
      key: 'actions',
      label: 'Corrective Actions',
      sortable: true,
      sortValue: (i) => i.correctiveActions.filter((c) => c.status === 'OPEN').length,
      render: (i) => {
        const open = i.correctiveActions.filter((c) => c.status === 'OPEN');
        return open.length > 0
          ? `${open.length} open action${open.length === 1 ? '' : 's'}`
          : 'All complete';
      },
    },
    {
      key: 'owner',
      label: 'Owner',
      sortable: true,
      sortValue: (i) => i.correctiveActions.find((c) => c.status === 'OPEN')?.owner ?? '',
      render: (i) => i.correctiveActions.find((c) => c.status === 'OPEN')?.owner ?? '—',
    },
    {
      key: 'due',
      label: 'Due Date',
      sortable: true,
      sortValue: (i) => i.correctiveActions.find((c) => c.status === 'OPEN')?.dueDate ?? '',
      render: (i) => i.correctiveActions.find((c) => c.status === 'OPEN')?.dueDate ?? '—',
    },
  ];

  return (
    <div>
      <div className="pagehead">
        <Crumbs trail={['Operations', 'Reviews']} />
        <h1>Reviews</h1>
        <p className="lede">Track post-incident reviews and corrective action completion.</p>
      </div>

      <Section
        title="Post-Incident Reviews"
        count={`${rows.length} record${rows.length === 1 ? '' : 's'}`}
      >
        {rows.length === 0 ? (
          <EmptyState
            illustration="✓"
            title="No reviews to track"
            description="Closed incidents with a required post-incident review appear here."
          />
        ) : (
          <DataTable<Incident>
            rows={rows}
            columns={columns}
            rowKey={(i) => i.id}
            searchText={(i) => `${i.id} ${i.route} ${i.location} ${i.severity ?? ''}`}
            searchPlaceholder="Search reviews"
            pageSize={8}
            emptyTitle="No reviews to track"
            emptyDescription="Closed incidents with a required post-incident review appear here."
          />
        )}
        <p className="table-foot">Showing all records</p>
      </Section>

      {selected && (
        <Section title={`${selected.id} · Corrective Action`}>
          {selected.correctiveActions.length === 0 ? (
            <p className="muted">No corrective actions recorded for this review.</p>
          ) : (
            <>
              {selected.correctiveActions.map((c) => (
                <div key={c.id}>
                  <p>
                    <strong>{c.action}</strong>
                  </p>
                  <dl className="facts-grid">
                    <div className="fact">
                      <dt>Owner</dt>
                      <dd>{c.owner}</dd>
                    </div>
                    <div className="fact">
                      <dt>Due Date</dt>
                      <dd>{c.dueDate}</dd>
                    </div>
                    <div className="fact">
                      <dt>Status</dt>
                      <dd>
                        {c.status === 'OPEN' ? (
                          <>
                            <span className="badge tg-warn">▲ Open</span>{' '}
                            <FioriButton
                              small
                              design="transparent"
                              icon="check"
                              onClick={() => markCorrectiveDone(selected.id, c.id)}
                            >
                              Mark done
                            </FioriButton>
                          </>
                        ) : (
                          <span className="badge tg-good">✓ Done</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>
              ))}
            </>
          )}
          <div className="actions-bar">
            <FioriButton small icon="view" to={`/operations/incident/${selected.id}`}>
              Open workspace
            </FioriButton>
            {reviewDisplay(selected) === 'OPEN' && (
              <FioriButton design="emphasized" icon="check" onClick={() => startReview(selected.id)}>
                Start Review
              </FioriButton>
            )}
            <span className="badge tg-warn">▲ Open</span>
            <span className="badge st-ops">◈ In Progress</span>
            <span className="badge tg-good">✓ Completed</span>
          </div>
          <p className="muted small">
            The incident is closed. The review tracks learning and follow-through separately
            from service recovery.
          </p>
        </Section>
      )}
    </div>
  );
}
