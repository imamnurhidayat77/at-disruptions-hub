import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ReviewBadge, SeverityBadge, reviewDisplay } from '../../components/badges.js';
import { Crumbs, Section } from '../../components/chrome.js';
import { FioriButton } from '../../components/Button.js';
import { DataTable, type DataColumn } from '../../components/DataTable.js';
import { Field, SapSelect } from '../../components/forms.js';
import { OWNER_ROSTER } from '../../domain/operations.js';
import type { Incident } from '../../domain/types.js';
import { useAppStore } from '../../state/AppStore.js';

/**
 * Reviews: Figma "05 Incident Closure & Review" worklist. Tracks
 * post-incident reviews and corrective action completion, separately
 * from service recovery.
 *
 * Flow per review (shown as a wizard stepper on the detail route):
 * 1. Start Review → 2. Complete corrective actions (add more if needed)
 * → 3. Completed automatically once all are done.
 */
export function Reviews(): React.JSX.Element {
  const { state, setRole } = useAppStore();

  useEffect(() => {
    setRole('OPERATIONS');
  }, [setRole]);

  const reviews = state.incidents.filter((i) => i.reviewRequired);
  const rows = reviews;

  function doneCount(i: Incident): number {
    return i.correctiveActions.filter((c) => c.status === 'DONE').length;
  }

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
          to={`/operations/reviews/${i.id}`}
          ariaLabel={`Open review ${i.id}`}
        >
          {i.id}
        </FioriButton>
      ),
    },
    {
      key: 'route',
      label: 'Route',
      sortable: true,
      sortValue: (i) => i.route,
      render: (i) => (
        <span>
          {i.route} <span className="muted small">· {i.location}</span>
        </span>
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
      key: 'progress',
      label: 'Corrective Progress',
      sortable: true,
      sortValue: (i) =>
        i.correctiveActions.length === 0 ? -1 : doneCount(i) / i.correctiveActions.length,
      render: (i) => {
        if (i.correctiveActions.length === 0) return <span className="muted">No actions yet</span>;
        const done = doneCount(i);
        return (
          <span>
            {done} of {i.correctiveActions.length} done
          </span>
        );
      },
    },
  ];

  return (
    <div>
      <div className="pagehead">
        <Crumbs trail={['Operations', 'Reviews']} />
        <h1>Reviews</h1>
        <p className="lede">
          Work through each closed incident: start the review, complete the corrective
          actions, and it completes automatically.
        </p>
      </div>

      <Section
        title="Post-Incident Reviews"
        count={`${rows.length} record${rows.length === 1 ? '' : 's'}`}
      >
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
      </Section>
    </div>
  );
}

function doneCountFor(i: Incident): number {
  return i.correctiveActions.filter((c) => c.status === 'DONE').length;
}

/** Review detail: stepper, corrective table, add-corrective form, review actions. */
export function ReviewDetail(): React.JSX.Element {
  const { state, setRole, startReview, markCorrectiveDone, addCorrective } = useAppStore();
  const { id } = useParams();

  const [caAction, setCaAction] = useState('');
  const [caOwner, setCaOwner] = useState(OWNER_ROSTER[0]);
  const [caDue, setCaDue] = useState(() =>
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
  const [caError, setCaError] = useState<string | undefined>(undefined);

  useEffect(() => {
    setRole('OPERATIONS');
  }, [setRole]);

  const selected = state.incidents.find((i) => i.id === id) ?? null;

  function onAddCorrective(e: FormEvent): void {
    e.preventDefault();
    if (!selected) return;
    if (caAction.trim() === '') {
      setCaError('Describe the corrective action.');
      return;
    }
    if (caDue.trim() === '' || Number.isNaN(Date.parse(caDue))) {
      setCaError('Pick a due date.');
      return;
    }
    setCaError(undefined);
    addCorrective(selected.id, {
      action: caAction.trim(),
      owner: caOwner,
      dueDate: caDue,
    });
    setCaAction('');
  }

  if (!selected) {
    return (
      <div>
        <div className="pagehead">
          <Crumbs trail={['Operations', 'Reviews']} />
          <h1>Review not found</h1>
          <p className="lede">No post-incident review matches this incident.</p>
        </div>
        <Section title="Review not found">
          <p className="muted">
            No review found for “{id ?? 'unknown'}”. Closed incidents with a required
            post-incident review appear on the worklist.
          </p>
          <div className="actions-bar">
            <FioriButton icon="chevronLeft" to="/operations/reviews">
              Back to reviews
            </FioriButton>
          </div>
        </Section>
      </div>
    );
  }

  const display = reviewDisplay(selected);
  const started = selected.reviewStatus !== 'OPEN';
  const allDone =
    selected.correctiveActions.length > 0 &&
    doneCountFor(selected) === selected.correctiveActions.length;
  const completed = display === 'COMPLETED';

  return (
    <div>
      <div className="pagehead">
        <Crumbs trail={['Operations', 'Reviews', selected.id]} />
        <h1>Review · {selected.id}</h1>
        <p className="lede">
          Work through each closed incident: start the review, complete the corrective
          actions, and it completes automatically.
        </p>
        <div className="actions-bar">
          <FioriButton icon="chevronLeft" design="transparent" to="/operations/reviews">
            Back to reviews
          </FioriButton>
        </div>
      </div>

      <Section title={`Review · ${selected.id}`}>
        <p>
          <ReviewBadge status={reviewDisplay(selected)} />{' '}
          <span className="muted small">
            Route {selected.route} · {selected.location} ·{' '}
            <Link to={`/operations/incident/${selected.id}`}>Open workspace</Link>
          </span>
        </p>

        <ol className="steps" aria-label="Review progress">
          <li className={`step${started || completed ? ' done' : ' current'}`}>
            <span className="step-n">{started || completed ? '✓' : 1}</span> Start review
          </li>
          <li className={`step${allDone || completed ? ' done' : started ? ' current' : ''}`}>
            <span className="step-n">{allDone || completed ? '✓' : 2}</span> Complete corrective
            actions
          </li>
          <li className={`step${completed ? ' done' : allDone && started ? ' current' : ''}`}>
            <span className="step-n">{completed ? '✓' : 3}</span> Completed
          </li>
        </ol>

        {selected.correctiveActions.length === 0 ? (
          <p className="muted">No corrective actions recorded yet: add the first one below.</p>
        ) : (
          <div className="table-scroll">
            <table className="records">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Owner</th>
                  <th>Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {selected.correctiveActions.map((c) => (
                  <tr key={c.id}>
                    <td>{c.action}</td>
                    <td>{c.owner}</td>
                    <td>{c.dueDate}</td>
                    <td>
                      {c.status === 'OPEN' ? (
                        <span className="actions-bar" style={{ margin: 0 }}>
                          <span className="badge tg-warn">▲ Open</span>
                          <FioriButton
                            small
                            design="transparent"
                            icon="check"
                            onClick={() => markCorrectiveDone(selected.id, c.id)}
                          >
                            Mark done
                          </FioriButton>
                        </span>
                      ) : (
                        <span className="badge tg-good">✓ Done</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!completed && (
          <form onSubmit={onAddCorrective} noValidate>
            <h3>Add corrective action</h3>
            <div className="form-grid">
              <Field id="ca-action" label="Action" required error={caError}>
                <input
                  id="ca-action"
                  className="input"
                  value={caAction}
                  onChange={(e) => setCaAction(e.target.value)}
                  placeholder="e.g. Review standby fleet availability"
                />
              </Field>
              <div className="form-grid">
                <SapSelect
                  id="ca-owner"
                  label="Owner"
                  value={caOwner}
                  onChange={setCaOwner}
                  options={OWNER_ROSTER.map((o) => ({ value: o, label: o }))}
                />
                <Field id="ca-due" label="Due Date" required>
                  <input
                    id="ca-due"
                    className="input"
                    type="date"
                    value={caDue}
                    onChange={(e) => setCaDue(e.target.value)}
                  />
                </Field>
              </div>
            </div>
            <div className="actions-bar">
              <FioriButton icon="plus" type="submit">
                Add action
              </FioriButton>
            </div>
          </form>
        )}

        <div className="actions-bar">
          {display === 'OPEN' && (
            <FioriButton design="emphasized" icon="check" onClick={() => startReview(selected.id)}>
              Start Review
            </FioriButton>
          )}
        </div>
        <p className="muted small">
          The incident is closed. The review tracks learning and follow-through separately
          from service recovery.
        </p>
      </Section>
    </div>
  );
}
