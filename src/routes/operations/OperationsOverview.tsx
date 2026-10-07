import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Crumbs, Section } from '../../components/chrome.js';
import { formatMmSs, queueKpis } from '../../domain/kpi.js';
import { useAppStore } from '../../state/AppStore.js';
import { IncomingCard } from './IncomingCard.js';
import { OpsNav } from './OpsNav.js';

/**
 * Operations Overview — monitor incoming disruptions, prioritise incidents
 * and coordinate service recovery. KPI cards and incoming notifications
 * are derived from the shared records; nothing is hard-coded.
 */
export function OperationsOverview(): React.JSX.Element {
  const { state, setRole } = useAppStore();

  useEffect(() => {
    setRole('OPERATIONS');
  }, [setRole]);

  const kpis = queueKpis(state.incidents);
  const highCritical = state.incidents.filter(
    (i) => (i.severity === 'HIGH' || i.severity === 'CRITICAL') && i.operationalStatus !== 'CLOSED',
  ).length;
  const incoming = state.incidents.filter((i) => i.operationalStatus === 'REPORTED');

  return (
    <div>
      <div className="pagehead">
        <Crumbs trail={['Operations', 'Overview']} />
        <span className="eyebrow">AT Operations</span>
        <h1>Operations Overview</h1>
        <p className="lede">
          Monitor incoming disruptions, prioritise incidents and coordinate service recovery.
        </p>
      </div>

      <OpsNav />

      <div className="kpi-grid">
        <div className="kpi-card">
          <h3>Active Incidents</h3>
          <div className="kpi-value">{kpis.active}</div>
          <p className="muted small">Not closed or restored</p>
          <Link className="kpi-link" to="/operations/incidents">View incidents</Link>
        </div>
        <div className="kpi-card">
          <h3>High / Critical Incidents</h3>
          <div className="kpi-value bad">{highCritical}</div>
          <p className="muted small">Open high or critical severity</p>
          <Link className="kpi-link" to="/operations/incidents">Prioritise</Link>
        </div>
        <div className="kpi-card">
          <h3>Average First Communication</h3>
          <div className="kpi-value">
            {kpis.averageFirstCommMs === null ? '—' : formatMmSs(kpis.averageFirstCommMs)}
          </div>
          <p className="muted small">
            Confirmation → first publication ({kpis.publishedCount} published)
          </p>
          <Link className="kpi-link" to="/operations/analytics">Review analytics</Link>
        </div>
        <div className="kpi-card">
          <h3>Within 10-Min Target</h3>
          <div className="kpi-value good">
            {kpis.achievedPct === null ? '—' : `${kpis.achievedPct}%`}
          </div>
          <p className="muted small">
            {kpis.achievedCount} of {kpis.publishedCount} initial updates within 10 min
          </p>
          <Link className="kpi-link" to="/operations/analytics">Review analytics</Link>
        </div>
      </div>

      <Section id="incoming" title={`Incoming Operator Notifications (${incoming.length})`}>
        {incoming.length === 0 ? (
          <p className="muted">No unvalidated notifications. Contractor reports appear here.</p>
        ) : (
          incoming.map((i) => <IncomingCard key={i.id} incident={i} />)
        )}
        <div className="note">
          Validating a notification records confirmation and starts the 10-minute
          first-communication clock.
        </div>
      </Section>
    </div>
  );
}
