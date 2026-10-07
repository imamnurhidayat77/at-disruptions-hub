import { Link, NavLink } from 'react-router-dom';
import { SeverityBadge } from '../../components/badges.js';
import {
  assessedByAT,
  lastOperatorUpdateAt,
  needsOperatorUpdate,
  operatorStatusLabel,
} from '../../domain/contractor.js';
import { formatNzdtTime } from '../../domain/kpi.js';
import type { Incident } from '../../domain/types.js';

/** Contractor sub-navigation: only operator-relevant destinations. */
export function ContractorNav(): React.JSX.Element {
  const cls = ({ isActive }: { isActive: boolean }): string => (isActive ? 'active' : '');
  return (
    <nav className="subnav" aria-label="Bus Operator Portal navigation">
      <NavLink to="/contractor" end className={cls}>
        Overview
      </NavLink>
      <NavLink to="/contractor/report" className={cls}>
        Report Disruption
      </NavLink>
      <NavLink to="/contractor/incidents" className={cls}>
        My Incidents
      </NavLink>
      <NavLink to="/contractor/help" className={cls}>
        Help
      </NavLink>
    </nav>
  );
}

/**
 * Contractor incident table — business information only: ID, route,
 * location, disruption type, AT status (operator wording), AT severity
 * only once assessed, last operator update, action. No SLA timers, no
 * KPI analytics, no AT-internal fields.
 */
export function ContractorIncidentTable({ rows }: { rows: Incident[] }): React.JSX.Element {
  if (rows.length === 0) {
    return <p className="muted">No incidents to show.</p>;
  }
  return (
    <table className="records">
      <thead>
        <tr>
          <th>Incident ID</th>
          <th>Route</th>
          <th>Location</th>
          <th>Disruption type</th>
          <th>AT Status</th>
          <th>AT Severity</th>
          <th>Last operator update</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((i) => {
          const lastUpdate = lastOperatorUpdateAt(i);
          return (
            <tr key={i.id}>
              <td>
                <strong>{i.id}</strong>
              </td>
              <td>{i.route}</td>
              <td>{i.location}</td>
              <td>{i.disruptionType}</td>
              <td>
                <span className="badge st-ops">{operatorStatusLabel(i)}</span>
              </td>
              <td>
                {assessedByAT(i) ? (
                  <>
                    <span className="muted small">AT Severity: </span>
                    <SeverityBadge level={i.severity} />
                  </>
                ) : (
                  <span className="muted">Awaiting AT Assessment</span>
                )}
              </td>
              <td>{lastUpdate ? formatNzdtTime(lastUpdate) : '—'}</td>
              <td>
                {(() => {
                  const label = i.infoRequested
                    ? 'Respond'
                    : needsOperatorUpdate(i)
                      ? 'Send update'
                      : 'View incident';
                  const primary = label !== 'View incident';
                  return (
                    <Link
                      className={`btn btn-small${primary ? ' btn-primary' : ''}`}
                      to={`/contractor/incident/${i.id}`}
                    >
                      {label}
                    </Link>
                  );
                })()}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
