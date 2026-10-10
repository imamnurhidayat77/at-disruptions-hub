import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SeverityBadge } from '../../components/badges.js';
import { Crumbs, Section } from '../../components/chrome.js';
import { Field, SapSelect } from '../../components/forms.js';
import { FioriButton } from '../../components/Button.js';
import { Timeline } from '../../components/Timeline.js';
import { assessSeverity, validateSeverityOverride } from '../../domain/severity.js';
import { OWNER_ROSTER, OWNER_TITLES } from '../../domain/operations.js';
import { formatNzdtShort } from '../../domain/kpi.js';
import type { Severity } from '../../domain/types.js';
import { useAppStore } from '../../state/AppStore.js';

const LEVELS: Severity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

interface PendingSeverity {
  level: Severity;
  reason: string;
  overrideReason: string | null;
}

/**
 * Severity + Owner intake wizard — Figma "03 AT Operations" dedicated page.
 * Step 1: confirm the severity recommendation (or override with a mandatory
 * reason), Step 2: assign the incident owner. Severity is confirmed in the
 * shared store on Assign, in the same order as the former two-page flow.
 */
export function SeverityPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setRole, getIncident, confirmSeverity, assignOwner } = useAppStore();
  const [step, setStep] = useState<1 | 2>(1);
  const [overriding, setOverriding] = useState(false);
  const [pending, setPending] = useState<PendingSeverity | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);

  useEffect(() => {
    setRole('OPERATIONS');
  }, [setRole]);

  const incident = id ? getIncident(id) : undefined;

  if (!incident) {
    return (
      <div>
        <div className="pagehead">
          <Crumbs trail={['Operations', 'Incoming', 'Severity Assessment']} />
          <h1>Incident not found</h1>
          <p className="lede">No record found with ID {id ?? '(unknown)'}.</p>
        </div>
        <div className="actions-bar">
          <FioriButton icon="back" to="/operations/incoming">
            Back to incoming
          </FioriButton>
        </div>
      </div>
    );
  }

  if (incident.operationalStatus === 'REPORTED') {
    return (
      <div>
        <div className="pagehead">
          <Crumbs trail={['Operations', 'Incoming', 'Severity Assessment']} />
          <h1>Severity Assessment</h1>
          <p className="lede">
            {incident.id} · Route {incident.route} — {incident.disruptionType} ·{' '}
            {incident.location}
          </p>
        </div>
        <Section title="Accept the notification first">
          <p className="muted">
            Severity assessment opens after AT Operations accepts the notification.
          </p>
          <div className="actions-bar">
            <FioriButton design="emphasized" icon="detail" to={`/operations/incoming/${incident.id}`}>
              Open incoming notification
            </FioriButton>
          </div>
        </Section>
      </div>
    );
  }

  const recommendation = assessSeverity({
    estimatedDelayMinutes: incident.estimatedDelayMinutes,
    passengerImpact: incident.passengerImpact,
    majorInterchangeAffected: incident.majorInterchangeAffected,
    disruptionType: incident.disruptionType,
    recoveryActionRequired: incident.recoveryTasks.length > 0,
  });

  const ownerOptions =
    incident.owner && !OWNER_ROSTER.includes(incident.owner)
      ? [incident.owner, ...OWNER_ROSTER]
      : OWNER_ROSTER;
  const effectiveOwner = ownerName ?? incident.owner ?? OWNER_ROSTER[0];
  const pendingLevel = pending?.level ?? recommendation.level;
  const seniorHint = pendingLevel === 'HIGH' || pendingLevel === 'CRITICAL';

  function onConfirmRecommendation(): void {
    setPending({ level: recommendation.level, reason: '', overrideReason: null });
    setStep(2);
  }

  function onOverrideDone(level: Severity, reason: string): void {
    setPending({ level, reason: reason.trim(), overrideReason: reason.trim() });
    setOverriding(false);
    setStep(2);
  }

  function onAssign(): void {
    const sealed: PendingSeverity = pending ?? {
      level: recommendation.level,
      reason: '',
      overrideReason: null,
    };
    confirmSeverity(incident!.id, sealed.level, sealed.reason, sealed.overrideReason);
    assignOwner(incident!.id, effectiveOwner);
    navigate(`/operations/incident/${incident!.id}`);
  }

  return (
    <div>
      <div className="pagehead">
        <Crumbs trail={['Operations', 'Incoming', 'Severity Assessment']} />
        <h1>{step === 1 ? 'Severity Assessment' : 'Owner Assignment'}</h1>
        <p className="lede">
          {incident.id} · Route {incident.route} — {incident.disruptionType} ·{' '}
          {incident.location}
        </p>
        <p>
          <SeverityBadge level={step === 1 ? recommendation.level : pendingLevel} />
          {step === 2 && (
            <>
              {' '}
              <span className="badge tg-warn">▲ Owner assignment required</span>
            </>
          )}
        </p>
        <p className="muted small">
          Step {step} of 2 — {step === 1 ? 'Severity' : 'Owner'}
        </p>
      </div>

      {step === 1 && (
        <>
          <div className="note" role="note">
            Recommended severity based on assessment rules.
          </div>

          <Section title="Assessment Factors">
            <ul>
              {recommendation.factors.map((factor) => (
                <li key={factor}>{factor}</li>
              ))}
            </ul>
            <p className="muted small">Decision support only · AT Operations confirms the final severity.</p>
          </Section>

          <Section title={`Severity Score: ${recommendation.score} / 10`}>
            <div className="score-bar" role="progressbar" aria-valuenow={recommendation.score} aria-valuemin={0} aria-valuemax={10} aria-label={`Severity score ${recommendation.score} of 10, ${recommendation.level} recommended`}>
              {LEVELS.map((level) => (
                <div
                  key={level}
                  className={`score-seg${level === recommendation.level ? ' recommended' : ''}`}
                >
                  {level.charAt(0) + level.slice(1).toLowerCase()}
                  {level === recommendation.level ? ' · Recommended' : ''}
                </div>
              ))}
            </div>
            <div className="note" role="note">
              <strong>Recommended action:</strong> {recommendation.recommendedAction}
            </div>
            <p className="muted small">{recommendation.prototypeNote}</p>
            <p className="muted">
              Confirm the recommendation or record an override reason. Your decision is
              retained in the shared incident audit trail.
            </p>
            <div className="actions-bar">
              <FioriButton design="transparent" icon="back" onClick={() => navigate(-1)}>
                Back
              </FioriButton>
              <FioriButton icon="edit" onClick={() => setOverriding(true)}>
                Override Severity
              </FioriButton>
              <FioriButton design="emphasized" icon="check" onClick={onConfirmRecommendation}>
                Confirm {recommendation.level}
              </FioriButton>
            </div>
          </Section>
        </>
      )}

      {step === 2 && (
        <>
          <Section title="Incident Owner">
            <SapSelect
              id={`owner-${incident.id}`}
              label="Incident Owner"
              required
              value={ownerOptions.includes(effectiveOwner) ? effectiveOwner : ownerOptions[0]}
              onChange={setOwnerName}
              options={ownerOptions.map((o) => ({
                value: o,
                label: OWNER_TITLES[o] ? `${o} — ${OWNER_TITLES[o]}` : o,
              }))}
            />
            {seniorHint && <p className="muted">Senior owner recommended</p>}
            <div className="note" role="note">
              Assigning an owner adds a timeline event to the shared incident record.
            </div>
          </Section>

          <Section title="Assessment audit">
            <Timeline
              events={[...incident.timeline].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))}
            />
            <p className="muted small">
              Next: coordinate operational recovery and passenger communication in parallel.
            </p>
            <div className="actions-bar">
              <FioriButton design="transparent" icon="back" onClick={() => setStep(1)}>
                Back
              </FioriButton>
              <FioriButton design="emphasized" icon="user" onClick={onAssign}>
                Assign Owner
              </FioriButton>
            </div>
          </Section>
        </>
      )}

      {step === 1 && (
        <Section title="Assessment audit">
          <Timeline events={[...incident.timeline].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))} />
          {incident.detectedAt ? (
            <p className="muted small">Detected {formatNzdtShort(incident.detectedAt)}</p>
          ) : null}
        </Section>
      )}

      {overriding && (
        <OverrideDialog
          incidentId={incident.id}
          calculated={recommendation.level}
          score={recommendation.score}
          onDone={onOverrideDone}
          onCancel={() => setOverriding(false)}
        />
      )}
    </div>
  );
}

function OverrideDialog({
  incidentId,
  calculated,
  score,
  onDone,
  onCancel,
}: {
  incidentId: string;
  calculated: Severity;
  score: number;
  onDone: (level: Severity, reason: string) => void;
  onCancel: () => void;
}): React.JSX.Element {
  const [level, setLevel] = useState<Severity>(calculated);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  function onSubmit(): void {
    const err = validateSeverityOverride(reason);
    if (err) {
      setError(err);
      return;
    }
    onDone(level, reason);
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
        <h2>
          <span className="dialog-icon" aria-hidden="true">
            ⚠
          </span>{' '}
          Override Severity
        </h2>
        <p className="muted small">
          {incidentId} · Recommended severity {calculated} · Score {score} / 10
        </p>
        <button className="dialog-close" type="button" onClick={onCancel} aria-label="Close dialog">
          ×
        </button>
        <div className="note" role="note">
          This decision will be recorded in the incident audit trail.
        </div>
        <SapSelect
          id="ov-level"
          label="New Severity"
          required
          value={level}
          onChange={(v) => setLevel(v as Severity)}
          options={LEVELS.map((l) => ({
            value: l,
            label: l.charAt(0) + l.slice(1).toLowerCase(),
          }))}
        />
        {level === calculated && (
          <p className="muted">Same as recommendation — confirm instead?</p>
        )}
        <Field id="ov-reason" label="Reason for Override" required error={error}>
          <textarea
            id="ov-reason"
            className="input"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter value"
          />
        </Field>
        <p className="muted small">
          Overrides are recorded in the audit trail with your reason.
        </p>
        <div className="dialog-actions">
          <FioriButton icon="decline" onClick={onCancel}>
            Cancel
          </FioriButton>
          <FioriButton
            design="positive"
            icon="check"
            disabled={reason.trim() === ''}
            onClick={onSubmit}
          >
            Confirm Override
          </FioriButton>
        </div>
      </div>
    </div>
  );
}
