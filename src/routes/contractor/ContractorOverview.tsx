import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CommsTargetBadge, OpStatusBadge, SeverityBadge } from '../../components/badges.js';
import { Section } from '../../components/chrome.js';
import { useAppStore } from '../../state/AppStore.js';

/**
 * Contractor overview — own reported incidents + high-level AT status.
 * Reporting itself lives at /contractor/report (Phase 2); validation,
 * severity and ownership are AT Operations concerns (Phase 3).
 */
export function ContractorOverview(): React.JSX.Element {
  const { state, setRole } = useAppStore();

  useEffect(() => {
    setRole('CONTRACTOR');
  }, [setRole]);

  const mine = state.incidents.filter((i) =>
    i.timeline.some((e) => e.action === 'Operator submitted initial disruption notification'),
  );
  const fingerprint = `records=${state.incidents.length} mine=${mine.length}`;

  return (
    <div>
      <div className="pagehead">
        <span className="eyebrow">Bus Contractor</span>
        <h1>Contractor overview</h1>
        <p className="lede">
          Report disruption quickly without completing unnecessary AT-internal work.
          Submitted notifications enter the shared record AT Operations validates.
        </p>
      </div>

      <nav className="subnav" aria-label="Bus Contractor navigation">
        <Link to="/contractor">Overview</Link>
        <Link to="/contractor/report">Report disruption</Link>
        <a href="#mine">My incidents</a>
        <a href="#shared">Shared record</a>
      </nav>

      <Section title="Report a disruption">
        <p className="muted">
          Capture what is known now — route, location, onset and impact. AT severity
          assessment and owner assignment happen after submission.
        </p>
        <Link className="btn btn-primary btn-link" to="/contractor/report">
          + Capture disruption
        </Link>
      </Section>

      <Section id="mine" title="My reported incidents">
        {mine.length === 0 ? (
          <p className="muted">No notifications submitted yet in this demo state.</p>
        ) : (
          <table className="records">
            <thead>
              <tr>
                <th>Incident</th>
                <th>Route</th>
                <th>Severity</th>
                <th>AT status</th>
                <th>Update target</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {mine.map((i) => (
                <tr key={i.id}>
                  <td>
                    <strong>{i.id}</strong>
                    <div className="muted small">{i.location}</div>
                  </td>
                  <td>{i.route}</td>
                  <td>
                    <SeverityBadge level={i.severity} />
                  </td>
                  <td>
                    <OpStatusBadge status={i.operationalStatus} />
                  </td>
                  <td>
                    <CommsTargetBadge incident={i} />
                  </td>
                  <td>
                    <Link to={`/contractor/incident/${i.id}`}>Open →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section id="shared" title="One shared record">
        <p className="muted">
          These are the same records AT Operations and AT Customer Information see —
          switching roles never duplicates or resets them.
        </p>
        <div className="fingerprint">Shared store: {fingerprint}</div>
      </Section>
    </div>
  );
}
