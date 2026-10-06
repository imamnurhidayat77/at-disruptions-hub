import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { IncidentCard } from '../../components/IncidentCard.js';
import { Section } from '../../components/chrome.js';
import { Field } from '../../components/forms.js';
import { formatNzdtTime } from '../../domain/kpi.js';
import { validateOperatorUpdate } from '../../domain/reporting.js';
import { assessSeverity } from '../../domain/severity.js';
import { SeverityBadge } from '../../components/badges.js';
import { useAppStore } from '../../state/AppStore.js';

/**
 * Contractor incident detail + submission success + confirmed updates.
 * Success banner shows only right after creation (?fresh via location
 * state). Updates append to the shared timeline — visible to all roles.
 */
export function IncidentDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { setRole, getIncident, addOperatorUpdate } = useAppStore();
  const [detail, setDetail] = useState('');
  const [delay, setDelay] = useState('');
  const [errors, setErrors] = useState<{ detail?: string; estimatedDelayMinutes?: string }>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setRole('CONTRACTOR');
  }, [setRole]);

  const fresh = (location.state as { fresh?: boolean } | null)?.fresh === true;
  const incident = id ? getIncident(id) : undefined;

  if (!incident) {
    return (
      <div>
        <h1>Incident not found</h1>
        <p className="muted">No shared record with ID {id ?? '(unknown)'} in this demo state.</p>
        <Link className="btn btn-link" to="/contractor">
          Back to overview
        </Link>
      </div>
    );
  }

  const closed = incident.operationalStatus === 'CLOSED';
  const recommendation = assessSeverity({
    estimatedDelayMinutes: incident.estimatedDelayMinutes,
    passengerImpact: incident.passengerImpact,
    majorInterchangeAffected: incident.majorInterchangeAffected,
    disruptionType: incident.disruptionType,
  });
  const timeline = [...incident.timeline].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  function onUpdate(e: FormEvent): void {
    e.preventDefault();
    const found = validateOperatorUpdate({ detail, estimatedDelayMinutes: delay });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    addOperatorUpdate(
      incident!.id,
      detail.trim(),
      delay.trim() === '' ? null : Number.parseInt(delay, 10),
    );
    setDetail('');
    setDelay('');
    setSaved(true);
  }

  return (
    <div>
      <div className="pagehead">
        <span className="eyebrow">Bus Contractor</span>
        <h1>Incident {incident.id}</h1>
        <p>
          <Link to="/contractor">← Back to overview</Link>
        </p>
      </div>

      {fresh && (
        <div className="success" role="status">
          <strong>Disruption notification submitted to AT.</strong>
          <div>
            {incident.id} is now in the AT Operations incoming queue as REPORTED. Severity
            assessment and owner assignment follow in Phase 3 — no action needed from the
            operator unless facts change.
          </div>
        </div>
      )}

      <Section title="Shared incident record">
        <IncidentCard incident={incident} />
      </Section>

      <div className="grid-2">
        <Section title="AT assessment (read-only)">
          <p>
            Severity:{' '}
            {incident.severity ? (
              <SeverityBadge level={incident.severity} />
            ) : (
              <>
                <span className="badge sev-none">◌ Not assessed</span>{' '}
                <span className="muted small">
                  (system recommendation: {recommendation.level}, score {recommendation.score})
                </span>
              </>
            )}
          </p>
          <p className="muted">
            Owner: {incident.owner ?? '— unassigned (AT Operations assigns the owner)'}
          </p>
          <div className="note">
            Contractors cannot set final severity, assign the owner or publish passenger
            information.
          </div>
        </Section>

        <Section title="Send confirmed update">
          {closed ? (
            <p className="muted">This incident is closed — no further operator updates.</p>
          ) : (
            <form onSubmit={onUpdate} noValidate>
              {saved && (
                <p className="success-inline" role="status">
                  Update recorded in the shared timeline — visible to all roles.
                </p>
              )}
              <Field
                id="u-detail"
                label="Confirmed update"
                required
                error={errors.detail}
                hint="Only send facts already confirmed with the depot or driver."
              >
                <textarea
                  id="u-detail"
                  className="input"
                  rows={3}
                  value={detail}
                  onChange={(e) => {
                    setDetail(e.target.value);
                    setSaved(false);
                  }}
                  aria-invalid={Boolean(errors.detail)}
                />
              </Field>
              <Field
                id="u-delay"
                label="Revised estimated delay (minutes)"
                error={errors.estimatedDelayMinutes}
                hint="Leave blank to keep the current estimate."
              >
                <input
                  id="u-delay"
                  className="input"
                  inputMode="numeric"
                  value={delay}
                  onChange={(e) => {
                    setDelay(e.target.value);
                    setSaved(false);
                  }}
                  aria-invalid={Boolean(errors.estimatedDelayMinutes)}
                />
              </Field>
              <button className="btn btn-primary" type="submit">
                Send update to AT
              </button>
            </form>
          )}
        </Section>
      </div>

      {(incident.rootCause !== null ||
        incident.reviewRequired ||
        incident.correctiveActions.length > 0) && (
        <Section title="Review & corrective actions (read-only)">
          {incident.rootCause && <p>Root cause: {incident.rootCause}</p>}
          <p className="muted small">
            Review required: {incident.reviewRequired ? 'Yes' : 'No'}
          </p>
          {incident.correctiveActions.map((c) => (
            <p key={c.id}>
              {c.action} — {c.owner}, due {c.dueDate} ({c.status})
            </p>
          ))}
        </Section>
      )}

      <Section title="Audit timeline (newest first)">        <ul className="timeline">
          {timeline.map((e) => (
            <li key={e.id}>
              <span className="t-at">{formatNzdtTime(e.at)}</span>
              <span className="t-action">{e.action}</span>
              <div className="t-detail">
                {e.actorRole} · {e.detail}
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
