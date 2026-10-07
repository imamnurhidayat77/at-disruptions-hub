import { useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog.js';
import { Section } from '../../components/chrome.js';
import { Field } from '../../components/forms.js';
import { formatNzdtTime } from '../../domain/kpi.js';
import type { Incident } from '../../domain/types.js';
import { useAppStore } from '../../state/AppStore.js';

/**
 * Closure & incident review (Phase 6). Available once service is
 * restored: records root cause, the review decision and corrective
 * actions, then closes the incident through a confirmation dialog.
 * Closure does not remove follow-up actions — they stay visible.
 */
export function CloseReviewPanel({ incident }: { incident: Incident }): React.JSX.Element {
  const { setReview, addCorrective, closeIncident, reopenIncident } = useAppStore();
  const [rootCause, setRootCause] = useState(incident.rootCause ?? '');
  const [reviewRequired, setReviewRequired] = useState(incident.reviewRequired);
  const [reviewError, setReviewError] = useState<string | undefined>(undefined);
  const [caAction, setCaAction] = useState('');
  const [caOwner, setCaOwner] = useState('Operations Performance Manager');
  const [caDue, setCaDue] = useState('2026-10-07');
  const [caError, setCaError] = useState<string | undefined>(undefined);
  const [confirming, setConfirming] = useState(false);

  const closed = incident.operationalStatus === 'CLOSED';
  const closedEvent = incident.timeline.find((e) => e.action === 'Incident closed');
  const openActions = incident.correctiveActions.filter((c) => c.status === 'OPEN').length;

  function onSaveReview(): void {
    if (rootCause.trim().length < 10) {
      setReviewError('Root cause needs at least 10 characters.');
      return;
    }
    setReviewError(undefined);
    setReview(incident.id, rootCause.trim(), reviewRequired);
  }

  function onAddCorrective(): void {
    if (caAction.trim().length < 10) {
      setCaError('Corrective action needs at least 10 characters.');
      return;
    }
    if (caOwner.trim().length === 0 || caDue.trim() === '') {
      setCaError('Owner and due date are required.');
      return;
    }
    setCaError(undefined);
    addCorrective(incident.id, { action: caAction.trim(), owner: caOwner.trim(), dueDate: caDue });
    setCaAction('');
  }

  const canClose =
    incident.operationalStatus === 'RESTORED' &&
    (incident.rootCause !== null && incident.rootCause.trim() !== '');

  return (
    <div>
      <Section title="Closure & incident review">
        {closed && closedEvent && (
          <div className="success" role="status">
            <strong>Incident closed · {formatNzdtTime(closedEvent.at)}.</strong>
            <div>
              Service restoration confirmed
              {incident.restoredAt ? ` at ${formatNzdtTime(incident.restoredAt)}` : ''}. The
              record is retained for review; {openActions} follow-up action
              {openActions === 1 ? '' : 's'} remain{openActions === 1 ? 's' : ''} open.
            </div>
          </div>
        )}

        <div className="form-grid">
          <Field id={`rc-${incident.id}`} label="Root cause" required error={reviewError}>
            <input
              id={`rc-${incident.id}`}
              className="input"
              value={rootCause}
              disabled={closed}
              onChange={(e) => setRootCause(e.target.value)}
              placeholder="e.g. Vehicle mechanical failure"
            />
          </Field>
          <div className="field field-check">
            <input
              id={`rr-${incident.id}`}
              type="checkbox"
              checked={reviewRequired}
              disabled={closed}
              onChange={(e) => setReviewRequired(e.target.checked)}
            />
            <label htmlFor={`rr-${incident.id}`}>Review required</label>
          </div>
        </div>
        {!closed && (
          <button className="btn" type="button" onClick={onSaveReview}>
            ✓ Save review details
          </button>
        )}

        <h3>Corrective actions ({incident.correctiveActions.length})</h3>
        {incident.correctiveActions.length === 0 ? (
          <p className="muted">No corrective actions recorded yet.</p>
        ) : (
          <table className="records">
            <thead>
              <tr>
                <th>Action</th>
                <th>Owner</th>
                <th>Due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {incident.correctiveActions.map((c) => (
                <tr key={c.id}>
                  <td>{c.action}</td>
                  <td>{c.owner}</td>
                  <td>{c.dueDate}</td>
                  <td>
                    <span className={`badge ${c.status === 'OPEN' ? 'tg-warn' : 'tg-good'}`}>
                      {c.status === 'OPEN' ? '⚠ Open' : '✓ Done'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!closed && (
          <div>
            <Field id={`ca-${incident.id}`} label="New corrective action" error={caError}>
              <input
                id={`ca-${incident.id}`}
                className="input"
                value={caAction}
                onChange={(e) => setCaAction(e.target.value)}
                placeholder="e.g. Review operator early-notification procedure"
              />
            </Field>
            <div className="form-grid">
              <Field id={`cao-${incident.id}`} label="Action owner">
                <input
                  id={`cao-${incident.id}`}
                  className="input"
                  value={caOwner}
                  onChange={(e) => setCaOwner(e.target.value)}
                />
              </Field>
              <Field id={`cad-${incident.id}`} label="Due date">
                <input
                  id={`cad-${incident.id}`}
                  className="input"
                  type="date"
                  value={caDue}
                  onChange={(e) => setCaDue(e.target.value)}
                />
              </Field>
            </div>
            <button className="btn" type="button" onClick={onAddCorrective}>
              + Add follow-up action
            </button>
          </div>
        )}
      </Section>

      {!closed && (
        <Section title="Close incident">
          {canClose ? (
            <div>
              <p className="muted">
                Restoration confirmed, root cause recorded
                {reviewRequired ? ', review required' : ''}, {openActions} open follow-up
                action{openActions === 1 ? '' : 's'} (they stay open after closure).
              </p>
              <button className="btn btn-primary" type="button" onClick={() => setConfirming(true)}>
                ✓ Confirm & close incident
              </button>
            </div>
          ) : (
            <p className="muted">
              Closing is available once service is restored and the root cause is
              recorded.
            </p>
          )}
        </Section>
      )}

      {closed && (
        <Section title="Reopen">
          <button className="btn" type="button" onClick={() => reopenIncident(incident.id)}>
            ↺ Reopen incident
          </button>{' '}
          <span className="muted small">Closure reverses on the same record; history is kept.</span>
        </Section>
      )}

      {confirming && (
        <ConfirmDialog
          title="Close this incident?"
          summary={[
            `Service restored${incident.restoredAt ? ` ${formatNzdtTime(incident.restoredAt)}` : ''} — operator verified.`,
            `Root cause: ${incident.rootCause}`,
            `${openActions} follow-up action${openActions === 1 ? '' : 's'} assigned${openActions > 0 ? ' (stay open after closure)' : ''}.`,
          ]}
          checkLabel="Restoration evidence and resolution details are recorded"
          disclaimer="Closure does not remove follow-up actions. The record remains available for review."
          confirmLabel="Confirm & close incident"
          onConfirm={() => {
            closeIncident(incident.id);
            setConfirming(false);
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
