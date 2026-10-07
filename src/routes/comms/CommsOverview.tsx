import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crumbs, Section } from '../../components/chrome.js';
import {
  awaitingFirstUpdate,
  communicationCoverage,
  needsFirstPublication,
  oldestCountingElapsedMs,
} from '../../domain/comms.js';
import { firstCommunicationKpi, formatMmSs, queueKpis } from '../../domain/kpi.js';
import { useAppStore } from '../../state/AppStore.js';
import { CommsNav } from './CommsNav.js';

function useNowTick(active: boolean): string {
  const [now, setNow] = useState(() => new Date().toISOString());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(new Date().toISOString()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

/**
 * Customer Information Overview — four communication KPIs derived from the
 * shared records plus a preview of the queue. Publishing itself happens in
 * the composer; recovery stays with AT Operations (parallel track).
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
  const counting = queue.length > 0;
  const nowIso = useNowTick(counting);
  const awaiting = awaitingFirstUpdate(state.incidents);
  const oldestMs = oldestCountingElapsedMs(state.incidents, nowIso);
  const kpis = queueKpis(state.incidents, nowIso);
  const coverage = communicationCoverage(state.incidents);

  return (
    <div>
      <div className="pagehead">
        <Crumbs trail={['Customer Information', 'Overview']} />
        <span className="eyebrow">AT Customer Information</span>
        <h1>Customer Information Overview</h1>
        <p className="lede">
          Prepare timely and consistent passenger updates using validated disruption
          information.
        </p>
      </div>

      <CommsNav />

      <div className="kpi-grid">
        <div className="kpi-card">
          <h3>Awaiting Passenger Update</h3>
          <div className="kpi-value">{awaiting.length}</div>
          <p className="muted small">Validated, not yet published</p>
          <Link className="kpi-link" to="/comms/queue">
            Open communication queue
          </Link>
        </div>
        <div className="kpi-card">
          <h3>Oldest Communication Timer</h3>
          <div className="kpi-value">{oldestMs === null ? '—' : formatMmSs(oldestMs)}</div>
          <p className="muted small">Longest running unpublished timer</p>
          <Link className="kpi-link" to="/comms/queue">
            Open communication queue
          </Link>
        </div>
        <div className="kpi-card">
          <h3>Average First Publication</h3>
          <div className="kpi-value">
            {kpis.averageFirstCommMs === null ? '—' : formatMmSs(kpis.averageFirstCommMs)}
          </div>
          <p className="muted small">
            Confirmation → first publication ({kpis.publishedCount} published)
          </p>
          <Link className="kpi-link" to="/comms/analytics">
            Review analytics
          </Link>
        </div>
        <div className="kpi-card">
          <h3>Communication Coverage</h3>
          <div className="kpi-value">{coverage.pct === null ? '—' : `${coverage.pct}%`}</div>
          <p className="muted small">
            {coverage.published} of {coverage.inScope} updates published
          </p>
          <Link className="kpi-link" to="/comms/analytics">
            Review analytics
          </Link>
        </div>
      </div>

      <Section title={`Passenger communication queue (${queue.length})`}>
        {queue.length === 0 ? (
          <p className="muted">Nothing needs a first publication right now.</p>
        ) : (
          <table className="records">
            <thead>
              <tr>
                <th>Incident</th>
                <th>Route</th>
                <th>Severity</th>
                <th>Communication</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {queue.slice(0, 5).map((i) => (
                <tr key={i.id}>
                  <td>
                    <strong>{i.id}</strong>
                    <div className="muted small">
                      {i.disruptionType} · {i.location}
                    </div>
                  </td>
                  <td>{i.route}</td>
                  <td>{i.severity ?? '—'}</td>
                  <td>{i.communicationStatus}</td>
                  <td>
                    <Link className="btn btn-small btn-primary" to={`/comms/incident/${i.id}`}>
                      Prepare update
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {queue.length > 5 && (
          <p>
            <Link className="btn" to="/comms/queue">
              Open full queue
            </Link>
          </p>
        )}
        <div className="note">
          All figures are derived from confirmation and publication timestamps — the
          clock stops at first publication, never on draft save.
        </div>
      </Section>
    </div>
  );
}
