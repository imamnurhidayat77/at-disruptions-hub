import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { CommsTargetBadge, OpStatusBadge, SeverityBadge } from '../../components/badges.js';
import { Crumbs, Section } from '../../components/chrome.js';
import { Field } from '../../components/forms.js';
import { lastOperatorUpdateAt } from '../../domain/contractor.js';
import { firstCommunicationKpi, formatMmSs, formatNzdtTime } from '../../domain/kpi.js';
import {
  OWNER_ROSTER,
  OWNER_TITLES,
  canAssess,
  canMarkActive,
  canValidate,
  operationalStatusLabel,
  recoveryOpen,
  workflowStage,
} from '../../domain/operations.js';
import { assessSeverity, validateSeverityOverride } from '../../domain/severity.js';
import type { Incident, Severity } from '../../domain/types.js';
import { useAppStore } from '../../state/AppStore.js';
import { RecoveryPanel } from './RecoveryPanel.js';
import { CloseReviewPanel } from './CloseReviewPanel.js';
import { OpsNav } from './OpsNav.js';

const STEPS = ['Assess & assign', 'Coordinate recovery', 'Passenger update', 'Active monitoring', 'Close & review'];

const SEVERITY_DESCRIPTIONS: Record<Severity, string> = {
  CRITICAL: 'Major network / safety impact',
  HIGH: 'Significant service impact',
  MEDIUM: 'Limited service impact',
  LOW: 'Minor local impact',
};

const SEVERITY_SUPPORT: Record<Severity, string> = {
  CRITICAL: 'This incident requires immediate operational response and passenger communication.',
  HIGH: 'This incident requires priority operational response and passenger communication.',
  MEDIUM: 'This incident requires close monitoring and timely passenger information.',
  LOW: 'Routine monitoring; passenger advice as needed.',
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

function IncomingDetail({ incident }: { incident: Incident }): React.JSX.Element {
  const { requestInfo, validateIncident } = useAppStore();
  const navigate = useNavigate();
  const lastUpdate = lastOperatorUpdateAt(incident);

  if (!canValidate(incident)) return <></>;

  function onAccept(): void {
    validateIncident(incident.id);
    navigate(`/operations/incident/${incident.id}#severity-assessment`);
  }

  return (
    <Section title="Incoming notification">
      <dl className="facts">
        <dt>Incident ID</dt>
        <dd>{incident.id}</dd>
        <dt>Operator</dt>
        <dd>{incident.operator}</dd>
        <dt>Route</dt>
        <dd>{incident.route}</dd>
        <dt>Vehicle / Service ID</dt>
        <dd>{incident.vehicleOrServiceId}</dd>
        <dt>Location</dt>
        <dd>{incident.location}</dd>
        <dt>Disruption Type</dt>
        <dd>{incident.disruptionType}</dd>
        <dt>Detection Time</dt>
        <dd>{formatNzdtTime(incident.detectedAt)}</dd>
        <dt>Estimated Delay</dt>
        <dd>{incident.estimatedDelayMinutes} minutes</dd>
        <dt>Passenger Impact</dt>
        <dd>{incident.passengerImpact}</dd>
        <dt>Major Interchange Affected</dt>
        <dd>{incident.majorInterchangeAffected ? 'Yes' : 'No'}</dd>
        <dt>Description</dt>
        <dd>{incident.description}</dd>
        <dt>Operator Update Status</dt>
        <dd>{lastUpdate ? `Last operator update ${formatNzdtTime(lastUpdate)}` : 'Initial notification only'}</dd>
      </dl>
      <div className="note">Information provided by Bus Contractor.</div>
      {incident.infoRequested ? (
        <p>
          <span className="badge tg-warn">More Information Requested</span>{' '}
          <span className="muted">Awaiting Operator Update.</span>
        </p>
      ) : (
        <p>
          <button className="btn" type="button" onClick={() => requestInfo(incident.id)}>
            ? Request More Information
          </button>{' '}
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              onAccept();
            }}
          >
            ✓ Accept & Assess
          </button>
        </p>
      )}
    </Section>
  );
}

function OverrideModal({
  incident,
  calculated,
  initialLevel,
  initialReason,
  onConfirm,
  onCancel,
}: {
  incident: Incident;
  calculated: Severity;
  initialLevel: Severity;
  initialReason: string;
  onConfirm: (level: Severity, reason: string) => void;
  onCancel: () => void;
}): React.JSX.Element {
  const [level, setLevel] = useState<Severity>(initialLevel);
  const [reason, setReason] = useState(initialReason);
  const [error, setError] = useState<string | undefined>(undefined);

  function onSubmit(): void {
    const err = validateSeverityOverride(reason);
    if (err) {
      setError(err);
      return;
    }
    onConfirm(level, reason.trim());
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Override severity"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Override Severity</h2>
        <p className="muted small">
          Calculated severity for {incident.id} is {calculated}. Overriding records the
          reason and an AT Operations audit event.
        </p>
        <Field id="ov-level" label="New Severity" required>
          <select
            id="ov-level"
            className="input"
            value={level}
            onChange={(e) => setLevel(e.target.value as Severity)}
          >
            {(Object.keys(SEVERITY_DESCRIPTIONS) as Severity[]).map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field id="ov-reason" label="Reason for Override" required error={error}>
          <textarea
            id="ov-reason"
            className="input"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        <div className="note">Severity rules are a prototype assumption, not official Auckland Transport policy.</div>
        <div className="dialog-actions">
          <button className="btn" type="button" onClick={onCancel}>
            × Cancel
          </button>
          <button className="btn btn-primary" type="button" onClick={onSubmit}>
            ⚠ Confirm Override
          </button>
        </div>
      </div>
    </div>
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
  const [overriding, setOverriding] = useState(false);

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
    if (isOverride) {
      setOverriding(true);
      return;
    }
    if (rationale.trim().length < 10) {
      setError('Severity rationale needs at least 10 characters.');
      return;
    }
    setError(undefined);
    confirmSeverity(incident.id, selected, rationale.trim(), null);
    setRationale('');
  }

  const severityBadgeClass =
    recommendation.level === 'CRITICAL'
      ? 'sev-critical'
      : recommendation.level === 'HIGH'
        ? 'sev-high'
        : recommendation.level === 'MEDIUM'
          ? 'sev-medium'
          : 'sev-low';

  return (
    <Section title="Severity assessment" id="severity-assessment">
      <p>
        <span className={`badge ${severityBadgeClass} sev-display`}>{recommendation.level} SEVERITY</span>
      </p>
      <p>
        <strong>{SEVERITY_SUPPORT[recommendation.level]}</strong>
      </p>
      <h3>Why this severity?</h3>
      <ul>
        <li>Estimated delay: {incident.estimatedDelayMinutes} minutes</li>
        <li>
          Passenger impact:{' '}
          {incident.passengerImpact.charAt(0) + incident.passengerImpact.slice(1).toLowerCase()}
        </li>
        <li>
          {incident.majorInterchangeAffected
            ? 'Major interchange affected'
            : 'No major interchange affected'}
        </li>
        <li>Recovery action required</li>
      </ul>
      <p className="muted small">
        Severity score: {recommendation.score}. Severity rules are a prototype
        decision-support rule, not official Auckland Transport policy.
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
        label="Severity rationale"
        required
        error={error}
        hint="Assessment notes (required). Differing from the recommendation opens the override dialog."
      >
        <textarea
          id={`rationale-${incident.id}`}
          className="input"
          rows={3}
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
        />
      </Field>
      <p>
        <button className="btn btn-primary" type="button" onClick={onConfirm}>
          ✓ Confirm Severity
        </button>{' '}
        <button className="btn" type="button" onClick={() => setOverriding(true)}>
          ⚠ Override Severity
        </button>
      </p>
      <div className="note">{recommendation.prototypeNote}</div>
      {overriding && (
        <OverrideModal
          incident={incident}
          calculated={recommendation.level}
          initialLevel={selected}
          initialReason={rationale}
          onConfirm={(level, reason) => {
            confirmSeverity(incident.id, level, reason, reason);
            setRationale('');
            setError(undefined);
            setOverriding(false);
          }}
          onCancel={() => setOverriding(false)}
        />
      )}
    </Section>
  );
}

function OwnerSection({ incident }: { incident: Incident }): React.JSX.Element {
  const { assignOwner } = useAppStore();
  const [name, setName] = useState(incident.owner ?? 'Sarah Chen');
  const options = incident.owner && !OWNER_ROSTER.includes(incident.owner)
    ? [incident.owner, ...OWNER_ROSTER]
    : OWNER_ROSTER;

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
        <Field id={`owner-${incident.id}`} label="Incident Owner" required>
          <select
            id={`owner-${incident.id}`}
            className="input"
            value={options.includes(name) ? name : options[0]}
            onChange={(e) => setName(e.target.value)}
          >
            {options.map((o) => (
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
        + Assign Owner
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

function CommsPanel({ incident }: { incident: Incident }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const kpi = firstCommunicationKpi(incident);

  return (
    <Section title="Passenger Communication">
      <p className="muted small">Operations sees communication status only — no editing or publishing here.</p>
      <p>
        <CommsTargetBadge incident={incident} />
      </p>
      <dl className="facts">
        <dt>Passenger notice</dt>
        <dd>{incident.communicationStatus === 'PUBLISHED' ? 'Published' : 'Required'}</dd>
        <dt>Publication</dt>
        <dd>{incident.firstPublishedAt ? formatNzdtTime(incident.firstPublishedAt) : 'Not yet published'}</dd>
        <dt>First communication time</dt>
        <dd>
          {incident.firstPublishedAt !== null && kpi.elapsedMs !== null
            ? `${formatMmSs(kpi.elapsedMs)} · Target ${kpi.targetMet ? 'met' : 'exceeded'}`
            : 'Not yet published'}
        </dd>
        <dt>Communication timer</dt>
        <dd>{kpi.elapsedMs === null ? '—' : `${formatMmSs(kpi.elapsedMs)} elapsed`}</dd>
        <dt>Remaining</dt>
        <dd>{kpi.remainingMs === null ? '—' : formatMmSs(kpi.remainingMs)}</dd>
        <dt>Target</dt>
        <dd>10 minutes</dd>
      </dl>
      <button className="btn" type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? '▴' : '▾'} View Communication Status
      </button>
      {open && (
        <dl className="facts" style={{ marginTop: 12 }}>
          <dt>Channels</dt>
          <dd>{incident.selectedChannels.length > 0 ? incident.selectedChannels.join(' + ') : '—'}</dd>
          <dt>Draft</dt>
          <dd>{incident.commsDraft ? `Saved ${formatNzdtTime(incident.commsDraft.updatedAt)}` : 'No draft yet'}</dd>
        </dl>
      )}
      <div className="note">
        Operational recovery and passenger communication are parallel workflows on
        this shared record. Editing, approval and publishing belong to AT Customer
        Information.
      </div>
    </Section>
  );
}

/**
 * AT Operations incident workspace — validate → assess severity → assign
 * owner → coordinate recovery, with passenger communication visible as a
 * read-only parallel track.
 */
export function IncidentWorkspace(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { setRole, getIncident, markActive } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setRole('OPERATIONS');
  }, [setRole]);

  useEffect(() => {
    if (location.hash) {
      document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash]);

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
  const ownerAssignedEvent = [...incident.timeline]
    .reverse()
    .find((e) => e.action === 'Incident owner assigned');

  return (
    <div>
      <div className="pagehead">
        <Crumbs trail={['Operations', 'Incidents', incident.id]} />
        <span className="eyebrow">AT Operations</span>
        <h1>{incident.id}</h1>
        <p className="lede">
          Route {incident.route} — {incident.disruptionType}
          <br />
          {incident.location}
        </p>
        <p>
          <Link to="/operations">← Back to overview</Link>
        </p>
      </div>

      <OpsNav />

      <Section title="Incident summary">
        <p>
          <SeverityBadge level={incident.severity} />{' '}
          <OpStatusBadge status={incident.operationalStatus} />{' '}
          <CommsTargetBadge incident={incident} />
        </p>
        <dl className="facts">
          <dt>Incident Owner</dt>
          <dd>
            {incident.owner
              ? `${incident.owner}${OWNER_TITLES[incident.owner] ? ` — ${OWNER_TITLES[incident.owner]}` : ''}${
                  ownerAssignedEvent ? ` (assigned ${formatNzdtTime(ownerAssignedEvent.at)})` : ''
                }`
              : '— unassigned'}
          </dd>
          <dt>Operational Status</dt>
          <dd>{operationalStatusLabel(incident.operationalStatus)}</dd>
          <dt>Detected</dt>
          <dd>{formatNzdtTime(incident.detectedAt)}</dd>
          <dt>Confirmed</dt>
          <dd>{incident.confirmedAt ? formatNzdtTime(incident.confirmedAt) : '— awaiting validation'}</dd>
          <dt>Estimated Restoration</dt>
          <dd>
            {incident.estimatedRestorationAt
              ? formatNzdtTime(incident.estimatedRestorationAt)
              : 'Not yet confirmed'}
          </dd>
        </dl>
        <Stepper stage={stage} />
      </Section>

      <div className="form-layout">
        <div>
          <IncomingDetail incident={incident} />
          <SeveritySection incident={incident} />
          <OwnerSection incident={incident} />

          {canMarkActive(incident) && (
            <Section title="Begin active management">
              <p className="muted">
                Severity {incident.severity} confirmed and owner {incident.owner} assigned.
              </p>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => {
                  markActive(incident.id);
                  navigate(`/operations/incident/${incident.id}#recovery`);
                }}
              >
                → Mark active — open Incident Workspace recovery
              </button>
            </Section>
          )}

          {showRecovery && (
            <div id="recovery">
              <RecoveryPanel incident={incident} />
            </div>
          )}

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
          <CommsPanel incident={incident} />
        </aside>
      </div>
    </div>
  );
}
