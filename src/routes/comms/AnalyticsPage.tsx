import { useEffect } from 'react';
import { Section } from '../../components/chrome.js';
import { CommsTargetBadge } from '../../components/badges.js';
import { communicationCoverage } from '../../domain/comms.js';
import { firstCommunicationKpi, formatMmSs, queueKpis } from '../../domain/kpi.js';
import { useAppStore } from '../../state/AppStore.js';
import { CommsNav } from './CommsNav.js';

/** Analytics — communication performance derived from shared timestamps. */
export function AnalyticsPage(): React.JSX.Element {
  const { state, setRole } = useAppStore();

  useEffect(() => {
    setRole('CUSTOMER_INFORMATION');
  }, [setRole]);

  const kpis = queueKpis(state.incidents);
  const coverage = communicationCoverage(state.incidents);
  const published = state.incidents.filter((i) => i.communicationStatus === 'PUBLISHED');

  return (
    <div>
      <div className="pagehead">
        <span className="eyebrow">AT Customer Information</span>
        <h1>Analytics</h1>
        <p className="lede">
          Communication performance derived from confirmation and publication
          timestamps — never hard-coded.
        </p>
      </div>

      <CommsNav />

      <div className="kpi-grid">
        <div className="kpi-card">
          <h3>Average First Publication</h3>
          <div className="kpi-value">
            {kpis.averageFirstCommMs === null ? '—' : formatMmSs(kpis.averageFirstCommMs)}
          </div>
          <p className="muted small">
            Confirmation → first publication ({kpis.publishedCount} published)
          </p>
        </div>
        <div className="kpi-card">
          <h3>Communication Coverage</h3>
          <div className="kpi-value">{coverage.pct === null ? '—' : `${coverage.pct}%`}</div>
          <p className="muted small">
            {coverage.published} of {coverage.inScope} updates published
          </p>
        </div>
        <div className="kpi-card">
          <h3>Within 10-Minute Target</h3>
          <div className="kpi-value good">
            {kpis.achievedPct === null ? '—' : `${kpis.achievedPct}%`}
          </div>
          <p className="muted small">
            {kpis.achievedCount} of {kpis.publishedCount} initial updates within 10 min
          </p>
        </div>
        <div className="kpi-card">
          <h3>Awaiting Initial Update</h3>
          <div className="kpi-value">{kpis.awaiting}</div>
          <p className="muted small">Initial passenger update not published</p>
        </div>
      </div>

      <Section title={`First-publication record (${published.length})`}>
        {published.length === 0 ? (
          <p className="muted">No publications yet — figures above show “—” until the first publish.</p>
        ) : (
          <table className="records">
            <thead>
              <tr>
                <th>Incident</th>
                <th>Confirmed</th>
                <th>First published</th>
                <th>First communication</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {published.map((i) => (
                <tr key={i.id}>
                  <td>
                    <strong>{i.id}</strong>
                  </td>
                  <td>{i.confirmedAt ?? '—'}</td>
                  <td>{i.firstPublishedAt ?? '—'}</td>
                  <td>
                    {(() => {
                      const elapsed = firstCommunicationKpi(i).elapsedMs;
                      return elapsed === null ? '—' : formatMmSs(elapsed);
                    })()}
                  </td>
                  <td>
                    <CommsTargetBadge incident={i} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="note">
          The first-communication clock stops at first publication; follow-up
          publications never reset it.
        </div>
      </Section>
    </div>
  );
}
