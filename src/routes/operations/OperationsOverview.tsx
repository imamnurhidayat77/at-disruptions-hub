import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CommsTargetBadge, OpStatusBadge, SeverityBadge } from '../../components/badges.js';
import { Section } from '../../components/chrome.js';
import { SapStatus } from '../../components/SapStatus.js';
import { firstCommunicationKpi, formatNzdtTime, queueKpis } from '../../domain/kpi.js';
import type { Incident, OperationalStatus, Severity } from '../../domain/types.js';
import { useAppStore } from '../../state/AppStore.js';

type TargetFilter = 'all' | 'breached' | 'due' | 'achieved' | 'not';

function targetOf(incident: Incident): TargetFilter {
  const kpi = firstCommunicationKpi(incident);
  if (kpi.state === 'MET') return 'achieved';
  if (kpi.state === 'EXCEEDED') return 'breached';
  if (kpi.state === 'COUNTING') {
    const remaining = kpi.remainingMs ?? 0;
    if (remaining <= 0) return 'breached';
    if (remaining <= 3 * 60 * 1000) return 'due';
    return 'not';
  }
  return 'not';
}

/** Riskiest first: breached, due soon, counting, awaiting, then the rest. */
function riskRank(incident: Incident): number {
  const t = targetOf(incident);
  if (t === 'breached') return 0;
  if (t === 'due') return 1;
  if (firstCommunicationKpi(incident).state === 'COUNTING') return 2;
  if (incident.operationalStatus === 'REPORTED') return 3;
  return 4;
}

/**
 * Operations dashboard — KPI cards derived from shared records plus the
 * filterable incident queue. Follows design/Live operations overview.png.
 */
export function OperationsOverview(): React.JSX.Element {
  const { state, setRole } = useAppStore();

  useEffect(() => {
    setRole('OPERATIONS');
  }, [setRole]);

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | OperationalStatus>('all');
  const [severity, setSeverity] = useState<'all' | Severity | 'none'>('all');
  const [target, setTarget] = useState<TargetFilter>('all');
  const [owner, setOwner] = useState('all');

  const kpis = queueKpis(state.incidents);
  const owners = useMemo(
    () => [...new Set(state.incidents.map((i) => i.owner ?? 'Unassigned'))],
    [state.incidents],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.incidents
      .filter((i) => {
        if (q && !`${i.id} ${i.route} ${i.location}`.toLowerCase().includes(q)) return false;
        if (status !== 'all' && i.operationalStatus !== status) return false;
        if (severity === 'none' ? i.severity !== null : severity !== 'all' && i.severity !== severity) return false;
        if (target !== 'all' && targetOf(i) !== target) return false;
        if (owner !== 'all' && (i.owner ?? 'Unassigned') !== owner) return false;
        return true;
      })
      .sort((a, b) => riskRank(a) - riskRank(b));
  }, [state.incidents, query, status, severity, target, owner]);

  const incoming = state.incidents.filter((i) => i.operationalStatus === 'REPORTED').length;

  function resetFilters(): void {
    setQuery('');
    setStatus('all');
    setSeverity('all');
    setTarget('all');
    setOwner('all');
  }

  return (
    <div>
      <div className="pagehead">
        <span className="eyebrow">AT Operations</span>
        <h1>Live operations overview</h1>
        <p className="lede">
          Unplanned bus disruptions · Prioritise passenger information and accountable
          recovery.
        </p>
      </div>

      <nav className="subnav" aria-label="AT Operations navigation">
        <Link to="/operations">Dashboard</Link>
        <a href="#kpis">Key indicators</a>
        <a href="#queue">Incident queue</a>
        <a href="#source">Data source</a>
      </nav>

      <div className="kpi-grid" id="kpis">
        <div className="kpi-card">
          <h3>Active disruptions</h3>
          <div className="kpi-value">{kpis.active}</div>
          <p className="muted small">
            {kpis.activeCritical} critical · {kpis.activeHigh} high · {kpis.activeOther} other
          </p>
          <a href="#queue">View active incidents →</a>
        </div>
        <div className="kpi-card">
          <h3>Awaiting initial update</h3>
          <div className="kpi-value">{kpis.awaiting}</div>
          <p className="muted small">Initial passenger update not published</p>
          <a href="#queue">Open communication queue →</a>
        </div>
        <div className="kpi-card">
          <h3>Communication target risk</h3>
          <div className="kpi-value bad">{kpis.breached + kpis.dueSoon}</div>
          <p className="muted small">
            {kpis.breached} breached · {kpis.dueSoon} due soon
          </p>
          <a href="#queue">Prioritise at-risk incidents →</a>
        </div>
        <div className="kpi-card">
          <h3>Initial target achieved</h3>
          <div className="kpi-value good">
            {kpis.achievedPct === null ? '—' : `${kpis.achievedPct}%`}
          </div>
          <p className="muted small">
            {kpis.achievedCount} of {kpis.publishedCount} initial updates within 10 min
          </p>
          <a href="#queue">Review communication performance →</a>
        </div>
      </div>

      {incoming > 0 && (
        <div className="alert" role="alert">
          <strong>Action needed: {incoming} incoming notification{incoming === 1 ? '' : 's'}.</strong>{' '}
          Validate to start the 10-minute communication clock.
        </div>
      )}

      <Section id="queue" title={`Incident queue (${rows.length} of ${state.incidents.length})`}>
        <div className="filters">
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ID, route or location"
            aria-label="Search ID, route or location"
          />
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as 'all' | OperationalStatus)} aria-label="Status filter">
            <option value="all">Status: All</option>
            <option value="REPORTED">Reported</option>
            <option value="VALIDATED">Validated</option>
            <option value="ACTIVE">Active</option>
            <option value="RECOVERY_IN_PROGRESS">Recovering</option>
            <option value="RESTORED">Restored</option>
            <option value="CLOSED">Closed</option>
          </select>
          <select className="input" value={severity} onChange={(e) => setSeverity(e.target.value as 'all' | Severity | 'none')} aria-label="Severity filter">
            <option value="all">Severity: All</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
            <option value="none">Not assessed</option>
          </select>
          <select className="input" value={target} onChange={(e) => setTarget(e.target.value as TargetFilter)} aria-label="Target filter">
            <option value="all">Target: All</option>
            <option value="breached">Breached</option>
            <option value="due">Due soon</option>
            <option value="achieved">Achieved</option>
            <option value="not">Not published</option>
          </select>
          <select className="input" value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Owner filter">
            <option value="all">Owner: All</option>
            {owners.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
          <button className="btn" type="button" onClick={resetFilters}>
            Reset
          </button>
        </div>
        {rows.length === 0 ? (
          <p className="muted">No incidents match these filters.</p>
        ) : (
          <table className="records">
            <thead>
              <tr>
                <th>Incident</th>
                <th>Route</th>
                <th>Detected</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Update target</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id}>
                  <td>
                    <strong>{i.id}</strong>
                    <div className="muted small">
                      {i.disruptionType} · {i.location}
                    </div>
                  </td>
                  <td>{i.route}</td>
                  <td>{formatNzdtTime(i.detectedAt)}</td>
                  <td>
                    <SeverityBadge level={i.severity} />
                  </td>
                  <td>
                    <OpStatusBadge status={i.operationalStatus} />
                  </td>
                  <td>{i.owner ?? 'Unassigned'}</td>
                  <td>
                    <CommsTargetBadge incident={i} />
                  </td>
                  <td>
                    <Link to={`/operations/incident/${i.id}`}>Open →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="muted small">Sorted by communication risk. All values derived from the shared records.</p>
      </Section>

      <Section id="source" title="Data source">
        <SapStatus />
      </Section>
    </div>
  );
}
