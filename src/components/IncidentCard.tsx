import { CommsTargetBadge, OpStatusBadge, SeverityBadge } from './badges.js';
import { formatNzdtTime } from '../domain/kpi.js';
import type { Incident } from '../domain/types.js';

/**
 * Shared incident summary — rendered identically for every role from the
 * same store record. Proves "one incident, one shared record".
 */
export function IncidentCard({ incident }: { incident: Incident }): React.JSX.Element {
  return (
    <div>
      <p>
        <SeverityBadge level={incident.severity} />{' '}
        <OpStatusBadge status={incident.operationalStatus} />{' '}
        <CommsTargetBadge incident={incident} />
      </p>
      <dl className="facts">
        <dt>Incident</dt>
        <dd>{incident.id}</dd>
        <dt>Route</dt>
        <dd>{incident.route}</dd>
        <dt>Operator</dt>
        <dd>{incident.operator}</dd>
        <dt>Vehicle / service</dt>
        <dd>{incident.vehicleOrServiceId}</dd>
        <dt>Location</dt>
        <dd>{incident.location}</dd>
        <dt>Disruption type</dt>
        <dd>{incident.disruptionType}</dd>
        <dt>Detected</dt>
        <dd>{formatNzdtTime(incident.detectedAt)}</dd>
        <dt>Confirmed (KPI start)</dt>
        <dd>{incident.confirmedAt ? formatNzdtTime(incident.confirmedAt) : '— awaiting validation'}</dd>
        <dt>Owner</dt>
        <dd>{incident.owner ?? '— unassigned'}</dd>
        <dt>Description</dt>
        <dd>{incident.description}</dd>
      </dl>
    </div>
  );
}
