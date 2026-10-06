import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CommsTargetBadge, OpStatusBadge, SeverityBadge } from '../../components/badges.js';
import { Section } from '../../components/chrome.js';
import { needsFirstPublication } from '../../domain/comms.js';
import { firstCommunicationKpi, queueKpis } from '../../domain/kpi.js';
import { useAppStore } from '../../state/AppStore.js';

/**
 * Communication queue — validated incidents still needing their first
 * passenger publication, riskiest first. The KPI clock only runs on
 * validated records; REPORTED items wait for Operations.
 */
export function CommsOverview(): React.JSX.Element {
  const { state, setRole } = useAppStore();

  useEffect(() => {
    setRole('CUSTOMER_INFORMATION');
  }, [setRole]);

  const queue = state.incidents
    .filter(needsFirstPublication)
    .sort((a, b) => {
      const ra = firstCommunicationKpi(a).remainingMs ?? Number.POSITIVE_INFINITY;
      const rb = firstCommunicationKpi(b).remainingMs ?? Number.POSITIVE_INFINITY;
      return ra - rb;
    });
  const blocked = state.incidents.filter((i) => i.operationalStatus === 'REPORTED');
  const kpis = queueKpis(state.incidents);

  return (
    <div>
      <div className="pagehead">
        <span className="eyebrow">AT Customer Information</span>
        <h1>Communications dashboard</h1>
        <p className="lede">
          Receive validated information early enough to communicate without waiting
          for recovery to finish.
        </p>
      </div>

      <nav className="subnav" aria-label="Customer Information navigation">
        <Link to="/comms">Dashboard</Link>
        <a href="#queue">Communication queue</a>
        <a href="#kpi">Target performance</a>
      </nav>

      <Section id="queue" title={`Communication queue (${queue.length})`}>
        {queue.length === 0 ? (
          <p className="muted">Nothing needs a first publication right now.</p>
        ) : (
          <table className="records">
            <thead>
              <tr>
                <th>Incident</th>
                <th>Route</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Update target</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((i) => (
                <tr key={i.id}>
                  <td>
                    <strong>{i.id}</strong>
                    <div className="muted small">
                      {i.disruptionType} · {i.location}
                    </div>
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
                    <Link to={`/comms/incident/${i.id}`}>Prepare →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {blocked.length > 0 && (
          <p className="muted small">
            Awaiting Operations validation (not yet actionable):{' '}
            {blocked.map((i) => i.id).join(', ')}.
          </p>
        )}
      </Section>

      <Section id="kpi" title="Target performance">
        <dl className="facts">
          <dt>Awaiting initial update</dt>
          <dd>{kpis.awaiting}</dd>
          <dt>At risk (breached + due soon)</dt>
          <dd>
            {kpis.breached} breached · {kpis.dueSoon} due soon
          </dd>
          <dt>Within 10-minute target</dt>
          <dd>
            {kpis.achievedPct === null
              ? '— no publications yet'
              : `${kpis.achievedPct}% (${kpis.achievedCount} of ${kpis.publishedCount})`}
          </dd>
        </dl>
        <div className="note">
          All figures are derived from confirmation and publication timestamps — the
          clock stops at first publication, never on draft save.
        </div>
      </Section>
    </div>
  );
}
