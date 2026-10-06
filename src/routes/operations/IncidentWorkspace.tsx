import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CommsTargetBadge, OpStatusBadge, SeverityBadge } from '../../components/badges.js';
import { Section } from '../../components/chrome.js';
import { Field } from '../../components/forms.js';
import { firstCommunicationKpi, formatMmSs, formatNzdtTime } from '../../domain/kpi.js';
import {
  OWNER_ROSTER,
  canAssess,
  canMarkActive,
  canValidate,
  recoveryOpen,
  workflowStage,
} from '../../domain/operations.js';
import { assessSeverity, validateSeverityOverride } from '../../domain/severity.js';
import type { Incident, Severity } from '../../domain/types.js';
import { useAppStore } from '../../state/AppStore.js';
import { RecoveryPanel } from './RecoveryPanel.js';
import { CloseReviewPanel } from './CloseReviewPanel.js';

const STEPS = ['Assess & assign', 'Coordinate recovery', 'Passenger update', 'Active monitoring', 'Close & review'];

const SEVERITY_DESCRIPTIONS: Record<Severity, string> = {
  CRITICAL: 'Major network / safety impact',
  HIGH: 'Significant service impact',
  MEDIUM: 'Limited service impact',
  LOW: 'Minor local impact',
};

function Stepper({ stage }: { stage: number }): React.JSX.Element {
  return (
    <ol className="steps" aria-label="Incident workflow stage">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const cls = n < stage ? 'step done' : n === stage ? 'step current' : 'step';
        return (
          <li key={label} className={cls}>
            <span className="step-n">{n < stage ? '✓' : n}</span> {label}
          </li>
        );
      })}
    </ol>
  );
}

function SeveritySection({ incident }: { incident: Incident }): React.JSX.Element {
  const { confirmSeverity } = useAppStore();
  const recommendation = assessSeverity({
    estimatedDelayMinutes: incident.estimatedDelayMinutes,
    passengerImpact: incident.passengerImpact,
    majorInterchangeAffected: incident.majorInterchangeAffected,
    disruptionType: incident.disruptionType,
  });
  const [selected, setSelected] = useState<Severity>(incident.severity ?? recommendation.level);
  const [rationale, setRationale] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);

  if (!canAssess(incident)) {
    return (
      <Section title="Severity assessment">
        {incident.severity ? (
          <p>
            Final severity: <SeverityBadge level={incident.severity} />{' '}
            <span className="muted small">{incident.severityReason}</span>
          </p>
        ) : (
          <p className="muted">Validate the notification to open severity assessment.</p>
        )}
      </Section>
    );
  }

  const isOverride = selected !== recommendation.level;

  function onConfirm(): void {
    if (rationale.trim().length < 10) {
      setError('Severity rationale needs at least 10 characters.');
      return;
    }
    if (isOverride) {
      const overrideError = validateSeverityOverride(rationale);
      if (overrideError) {
        setError(overrideError);
        return;
      }
    }
    setError(undefined);
    confirmSeverity(incident.id, selected, rationale.trim(), isOverride ? rationale.trim() : null);
    setRationale('');
  }

  return (
    <Section title="Severity assessment">
      <p className="muted small">
        Severity reflects operational impact; it is separate from communication-target
        risk. System recommendation: <SeverityBadge level={recommendation.level} />{' '}
        (score {recommendation.score}).
      </p>
      {incident.severity && (
        <p>
          Current: <SeverityBadge level={incident.severity} />{' '}
          <span className="muted small">{incident.severityReason}</span>
          {incident.severityOverrideReason && (
            <span className="muted small"> Override: {incident.severityOverrideReason}</span>
          )}
        </p>
      )}
      <div className="sev-cards" role="radiogroup" aria-label="Severity level">
        {(Object.keys(SEVERITY_DESCRIPTIONS) as Severity[]).map((level) => (
          <label key={level} className={`sev-card${selected === level ? ' selected' : ''}`}>
            <input
              type="radio"
              name={`severity-${incident.id}`}
              checked={selected === level}
              onChange={() => setSelected(level)}
            />
            <SeverityBadge level={level} />
            <span className="muted small">{SEVERITY_DESCRIPTIONS[level]}</span>
          </label>
        ))}
      </div>
      <Field
        id={`rationale-${incident.id}`}
        label={isOverride ? 'Override reason (differs from recommendation)' : 'Severity rationale'}
        required
        error={error}
      >
        <textarea
          id={`rationale-${incident.id}`}
          className="input"
          rows={3}
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
        />
      </Field>
      <button className="btn btn-primary" type="button" onClick={onConfirm}>
        Confirm {selected.charAt(0) + selected.slice(1).toLowerCase()} severity
      </button>
      <div className="note">{recommendation.prototypeNote}</div>
    </Section>
  );
}

function OwnerSection({ incident }: { incident: Incident }): React.JSX.Element {
  const { assignOwner } = useAppStore();
  const [name, setName] = useState(incident.owner ?? 'Sarah Chen');

  if (incident.operationalStatus === 'REPORTED') {
    return (
      <Section title="Accountable ownership">
        <p className="muted">Validate the notification before assigning an owner.</p>
      </Section>
    );
  }

  return (
    <Section title="Accountable ownership">
      <p className="muted small">
        The owner coordinates recovery and keeps passenger communication on track.
      </p>
      <div className="form-grid">
        <Field id={`owner-${incident.id}`} label="Incident owner" required>
          <select
            id={`owner-${incident.id}`}
            className="input"
            value={OWNER_ROSTER.includes(name) ? name : 'Sarah Chen'}
            onChange={(e) => setName(e.target.value)}
          >
            {OWNER_ROSTER.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </Field>
      </div>
      <button
        className="btn btn-primary"
        type="button"
        onClick={() => assignOwner(incident.id, name)}
        disabled={incident.owner === name}
      >
        Assign owner
      </button>
      {incident.owner && (
        <div className="success" role="status" style={{ marginTop: 12 }}>
          <strong>Owner accepted.</strong> {incident.owner} is accountable for the incident
          through restoration and closure.
        </div>
      )}
    </Section>
  );
}

function CommsRail({ incident }: { incident: Incident }): React.JSX.Element {
  const kpi = firstCommunicationKpi(incident);
  return (
    <div>
      <Section title="Passenger communication (read-only)">
        <p>
          <CommsTargetBadge incident={incident} />
        </p>
        {kpi.state === 'AWAITING_CONFIRMATION' && (
          <p className="muted small">Clock starts when the notification is validated.</p>
        )}
        {kpi.state === 'COUNTING' && (
          <p className="muted small">
            Elapsed {kpi.elapsedMs === null ? '–' : formatMmSs(kpi.elapsedMs)} · remaining{' '}
            {kpi.remainingMs === null ? '–' : formatMmSs(kpi.remainingMs)} of 10:00.
          </p>
        )}
        {(kpi.state === 'MET' || kpi.state === 'EXCEEDED') && (
          <p className="muted small">
            Published {kpi.firstPublishedAt ? formatNzdtTime(kpi.firstPublishedAt) : '–'} · target{' '}
            {kpi.targetMet ? 'met' : 'exceeded'}.
          </p>
        )}
        <div className="note">
          Communicate before recovery is complete — an unknown recovery time does not
          block an initial update. Operations cannot edit published messages.
        </div>
        <p>
          <button className="btn" type="button" disabled title="Available in Phase 4">
            Prepare passenger update
          </button>{' '}
          <span className="phase-tag">Phase 4</span>
        </p>
      </Section>
    </div>
  );
}

/**
 * Operations incident workspace — validate → assess severity → assign
 * owner → coordinate recovery, with passenger communication visible as a
 * read-only parallel track. Publishing itself arrives in Phase 4.
 */
export function IncidentWorkspace(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { setRole, getIncident, validateIncident, markActive } = useAppStore();

  useEffect(() => {
    setRole('OPERATIONS');
  }, [setRole]);

  const incident = id ? getIncident(id) : undefined;

  if (!incident) {
    return (
      <div>
        <h1>Incident not found</h1>
        <p className="muted">No shared record with ID {id ?? '(unknown)'} in this demo state.</p>
        <Link className="btn btn-link" to="/operations">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const stage = workflowStage(incident);
  const timeline = [...incident.timeline].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const showRecovery = recoveryOpen(incident) || incident.operationalStatus === 'RESTORED';

  return (
    <div>
      <div className="pagehead">
        <span className="eyebrow">AT Operations</span>
        <h1>{stage <= 1 ? 'Assess severity & assign ownership' : 'Coordinate operational recovery'}</h1>
        <p>
          <Link to="/operations">← Back to dashboard</Link>
        </p>
      </div>

      <Section title={`${incident.disruptionType} · ${incident.location}`}>
        <p className="muted small">
          {incident.id} · Route {incident.route} · Detected {formatNzdtTime(incident.detectedAt)}
          {incident.confirmedAt && <> · Confirmed {formatNzdtTime(incident.confirmedAt)}</>}
        </p>
        <p>
          <SeverityBadge level={incident.severity} />{' '}
          <OpStatusBadge status={incident.operationalStatus} />{' '}
          <CommsTargetBadge incident={incident} />
        </p>
        <p className="muted small">Accountable owner: {incident.owner ?? '— unassigned'}</p>
        <Stepper stage={stage} />
      </Section>

      <div className="form-layout">
        <div>
          {canValidate(incident) && (
            <Section title="Validate notification">
              <p>
                {incident.operator} reported: {incident.description}
              </p>
              <button className="btn btn-primary" type="button" onClick={() => validateIncident(incident.id)}>
                Validate & accept notification
              </button>
            </Section>
          )}

          <SeveritySection incident={incident} />
          <OwnerSection incident={incident} />

          {canMarkActive(incident) && (
            <Section title="Begin active management">
              <p className="muted">
                Severity {incident.severity} confirmed and owner {incident.owner} assigned.
              </p>
              <button className="btn btn-primary" type="button" onClick={() => markActive(incident.id)}>
                Mark active — open recovery & comms tracks
              </button>
            </Section>
          )}

          {showRecovery && <RecoveryPanel incident={incident} />}

          {(incident.operationalStatus === 'RESTORED' ||
            incident.operationalStatus === 'CLOSED') && (
            <CloseReviewPanel incident={incident} />
          )}

          <Section title="Audit timeline (newest first)">
            <ul className="timeline">
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
        <aside>
          <CommsRail incident={incident} />
        </aside>
      </div>
    </div>
  );
}
