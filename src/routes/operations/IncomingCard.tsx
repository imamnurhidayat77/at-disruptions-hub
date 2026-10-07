import { Link, useNavigate } from 'react-router-dom';
import { OpStatusBadge, SeverityBadge } from '../../components/badges.js';
import { formatNzdtTime } from '../../domain/kpi.js';
import type { Incident } from '../../domain/types.js';
import { useAppStore } from '../../state/AppStore.js';

/**
 * One incoming operator notification with its assessment actions.
 * Accept & Assess validates (starting the KPI clock) and continues into
 * the workspace; Request More Information records an audit event and flips
 * the contractor-visible status without validating.
 */
export function IncomingCard({ incident }: { incident: Incident }): React.JSX.Element {
  const { requestInfo, validateIncident } = useAppStore();
  const navigate = useNavigate();

  function onAccept(): void {
    validateIncident(incident.id);
    navigate(`/operations/incident/${incident.id}#severity-assessment`);
  }

  return (
    <div className="card">
      <span className="eyebrow">{incident.id}</span>
      <h2>
        Route {incident.route} · {incident.disruptionType}
      </h2>
      <p className="muted small">{incident.location}</p>
      <dl className="facts">
        <dt>Operator</dt>
        <dd>{incident.operator}</dd>
        <dt>Reported</dt>
        <dd>{formatNzdtTime(incident.detectedAt)}</dd>
        <dt>Estimated delay</dt>
        <dd>{incident.estimatedDelayMinutes} minutes</dd>
        <dt>Passenger impact</dt>
        <dd>{incident.passengerImpact}</dd>
      </dl>
      <p>
        <SeverityBadge level={incident.severity} />{' '}
        <OpStatusBadge status={incident.operationalStatus} />
      </p>
      {incident.infoRequested ? (
        <p>
          <span className="badge tg-warn">More Information Requested</span>{' '}
          <span className="muted">Awaiting Operator Update — the request action is hidden until the operator responds.</span>{' '}
          <Link className="btn btn-small" to={`/operations/incident/${incident.id}`}>Open detail</Link>
        </p>
      ) : (
        <p>
          <button className="btn" type="button" onClick={() => requestInfo(incident.id)}>
            ? Request More Information
          </button>{' '}
          <button className="btn btn-primary" type="button" onClick={onAccept}>
            ✓ Accept & Assess
          </button>{' '}
          <Link className="btn btn-small" to={`/operations/incident/${incident.id}`}>Open detail</Link>
        </p>
      )}
    </div>
  );
}
