import { useEffect } from 'react';
import { Section } from '../../components/chrome.js';
import { formatMmSs, queueKpis } from '../../domain/kpi.js';
import type { Severity } from '../../domain/types.js';
import { useAppStore } from '../../state/AppStore.js';
import { OpsNav } from './OpsNav.js';
import { SapIntegrationPanel } from './SapIntegrationPanel.js';

const LEVELS: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

/** Analytics — prototype communication performance, derived from records. */
export function Analytics(): React.JSX.Element {
  const { state, setRole } = useAppStore();

  useEffect(() => {
    setRole('OPERATIONS');
  }, [setRole]);

  const kpis = queueKpis(state.incidents);
  const published = state.incidents.filter((i) => i.firstPublishedAt !== null);

  return (
    <div>
      <div className="pagehead">
        <span className="eyebrow">AT Operations</span>
        <h1>Analytics</h1>
        <p className="lede">
          Prototype communication performance — derived from confirmation and
          publication timestamps, not official AT reporting.
        </p>
      </div>

      <OpsNav />

      <div className="kpi-grid">
        <div className="kpi-card">
          <h3>Average First Communication</h3>
          <div className="kpi-value">
            {kpis.averageFirstCommMs === null ? '—' : formatMmSs(kpis.averageFirstCommMs)}
          </div>
          <p className="muted small">Across {kpis.publishedCount} published updates</p>
        </div>
        <div className="kpi-card">
          <h3>Within 10-Min Target</h3>
          <div className="kpi-value good">
            {kpis.achievedPct === null ? '—' : `${kpis.achievedPct}%`}
          </div>
          <p className="muted small">
            {kpis.achievedCount} of {kpis.publishedCount} within target
          </p>
        </div>
        <div className="kpi-card">
          <h3>Active Incidents</h3>
          <div className="kpi-value">{kpis.active}</div>
          <p className="muted small">Not closed or restored</p>
        </div>
        <div className="kpi-card">
          <h3>Awaiting Initial Update</h3>
          <div className="kpi-value">{kpis.awaiting}</div>
          <p className="muted small">Not yet published</p>
        </div>
      </div>

      <Section title="Performance by severity">
        {published.length === 0 ? (
          <p className="muted">No publications yet.</p>
        ) : (
          <table className="records">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Published</th>
                <th>Within target</th>
              </tr>
            </thead>
            <tbody>
              {LEVELS.map((level) => {
                const rows = published.filter((i) => i.severity === level);
                if (rows.length === 0) return null;
                const met = rows.filter((i) => {
                  if (!i.confirmedAt || !i.firstPublishedAt) return false;
                  return Date.parse(i.firstPublishedAt) - Date.parse(i.confirmedAt) <= 10 * 60 * 1000;
                }).length;
                return (
                  <tr key={level}>
                    <td>{level}</td>
                    <td>{rows.length}</td>
                    <td>
                      {met} of {rows.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div className="note">
          Demonstration figures only — severity rules and targets are prototype
          assumptions, not official Auckland Transport policy.
        </div>
      </Section>

      <SapIntegrationPanel />
    </div>
  );
}
