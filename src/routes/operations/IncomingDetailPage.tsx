import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Crumbs, Section } from '../../components/chrome.js';
import { FioriButton } from '../../components/Button.js';
import { ConfirmDialog } from '../../components/ConfirmDialog.js';
import { Timeline } from '../../components/Timeline.js';
import { lastOperatorUpdateAt, hasOperatorUpdates } from '../../domain/contractor.js';
import { formatNzdtShort, formatNzdtTime } from '../../domain/kpi.js';
import { useAppStore } from '../../state/AppStore.js';

/**
 * Incoming notification detail — Figma "03 AT Operations" frame.
 * Contractor fields are read-only; the only actions are requesting
 * more information or accepting into assessment.
 */
export function IncomingDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setRole, getIncident, requestInfo, validateIncident } = useAppStore();

  useEffect(() => {
    setRole('OPERATIONS');
  }, [setRole]);

  const [confirmingRequest, setConfirmingRequest] = useState(false);

  const incident = id ? getIncident(id) : undefined;

  if (!incident) {
    return (
      <div>
        <div className="pagehead">
          <Crumbs trail={['Operations', 'Incoming', 'Notification']} />
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

  if (incident.operationalStatus !== 'REPORTED') {
    return (
      <div>
        <div className="pagehead">
          <Crumbs trail={['Operations', 'Incoming', incident.id]} />
          <h1>{incident.id}</h1>
          <p className="lede">
            Route {incident.route} — {incident.disruptionType} · {incident.location}
          </p>
        </div>
        <Section title="Already accepted">
          <p className="muted">
            This notification is already accepted — continue in the incident workspace.
          </p>
          <div className="actions-bar">
            <FioriButton
              design="emphasized"
              icon="detail"
              to={`/operations/incident/${incident.id}`}
            >
              Open workspace
            </FioriButton>
          </div>
        </Section>
      </div>
    );
  }

  const lastUpdate = lastOperatorUpdateAt(incident);
  const updates = incident.timeline.filter(
    (e) => e.action === 'Operator sent confirmed update',
  ).length;

  function onAccept(): void {
    validateIncident(incident!.id);
    navigate(`/operations/incident/${incident!.id}/severity`);
  }

  function onConfirmRequest(): void {
    requestInfo(incident!.id);
    setConfirmingRequest(false);
  }

  return (
    <div>
      <div className="actions-bar">
        <FioriButton design="transparent" icon="back" to="/operations/incoming">
          Back to Incoming Worklist
        </FioriButton>
      </div>
      <div className="pagehead">
        <Crumbs trail={['Operations', 'Incoming', incident.id]} />
        <div className="pagehead-with-action">
          <h1>{incident.id}</h1>
          <div className="actions-bar">
            {!incident.infoRequested && (
              <FioriButton icon="messages" onClick={() => setConfirmingRequest(true)}>
                Request More Information
              </FioriButton>
            )}
            <FioriButton design="emphasized" icon="check" onClick={onAccept}>
              Accept &amp; Assess
            </FioriButton>
          </div>
        </div>
        <p className="lede">
          Route {incident.route} — {incident.disruptionType} · {incident.location}
        </p>
        <p>
          <span className="badge st-idle">○ Awaiting AT Assessment</span>{' '}
          {incident.passengerImpact === 'HIGH' && (
            <span className="badge tg-warn">▲ Passenger Impact: High</span>
          )}
          {incident.infoRequested && (
            <span className="badge tg-warn">▲ More Information Requested</span>
          )}
        </p>
      </div>

      <div className="note" role="note">
        Supplied contractor information is read-only. Accept the notification to begin
        assessment.
      </div>

      <Section title="Operator Notification">
        <dl className="facts-grid">
          <div className="fact">
            <dt>Operator</dt>
            <dd>{incident.operator}</dd>
          </div>
          <div className="fact">
            <dt>Route</dt>
            <dd>{incident.route}</dd>
          </div>
          <div className="fact">
            <dt>Vehicle / Service ID</dt>
            <dd>{incident.vehicleOrServiceId}</dd>
          </div>
          <div className="fact">
            <dt>Detection Time</dt>
            <dd>{formatNzdtShort(incident.detectedAt)}</dd>
          </div>
        </dl>
        <p className="muted">
          Location: {incident.location} · Disruption Type: {incident.disruptionType}
        </p>
      </Section>

      <Section title="Service Impact">
        <dl className="facts-grid">
          <div className="fact">
            <dt>Can Service Continue?</dt>
            <dd>{incident.serviceContinues === null ? '—' : incident.serviceContinues ? 'Yes' : 'No'}</dd>
          </div>
          <div className="fact">
            <dt>Estimated Delay</dt>
            <dd>{incident.estimatedDelayMinutes} min</dd>
          </div>
          <div className="fact">
            <dt>Passenger Impact</dt>
            <dd>
              {incident.passengerImpact.charAt(0) +
                incident.passengerImpact.slice(1).toLowerCase()}
            </dd>
          </div>
          <div className="fact">
            <dt>Major Interchange Affected</dt>
            <dd>{incident.majorInterchangeAffected ? 'Yes' : 'No'}</dd>
          </div>
        </dl>
      </Section>

      <Section title="Incident Description">
        <p>{incident.description}</p>
      </Section>

      <Section title="Operator Updates">
        <p className="muted">
          Initial notification submitted at {formatNzdtShort(incident.detectedAt)}.
          {updates === 0
            ? ' No additional operator updates yet.'
            : ` ${updates} additional operator update${updates === 1 ? '' : 's'}.`}
        </p>
        {lastUpdate && hasOperatorUpdates(incident) && (
          <p className="muted small">Latest operator update {formatNzdtTime(lastUpdate)}.</p>
        )}
      </Section>

      <Section title="Audit Timeline">
        <Timeline
          events={[...incident.timeline].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))}
        />
      </Section>

      <div className="actions-bar">
        <FioriButton design="transparent" icon="back" to="/operations/incoming">
          Back to Incoming Worklist
        </FioriButton>
        {!incident.infoRequested && (
          <FioriButton icon="messages" onClick={() => setConfirmingRequest(true)}>
            Request More Information
          </FioriButton>
        )}
        <FioriButton design="emphasized" icon="check" onClick={onAccept}>
          Accept &amp; Assess
        </FioriButton>
      </div>

      {confirmingRequest && (
        <ConfirmDialog
          title="Request information"
          subtitle={`${incident.id} · ${incident.operator}`}
          summary={[
            `Request more information from ${incident.operator} for ${incident.id}.`,
            `Route ${incident.route} — ${incident.disruptionType} · ${incident.location}`,
          ]}
          requireCheck={false}
          disclaimer="Request information from the operator."
          confirmLabel="Request information"
          tone="primary"
          onConfirm={onConfirmRequest}
          onCancel={() => setConfirmingRequest(false)}
        />
      )}
    </div>
  );
}
