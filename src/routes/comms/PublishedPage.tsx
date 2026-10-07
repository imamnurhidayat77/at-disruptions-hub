import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CommsTargetBadge, SeverityBadge } from '../../components/badges.js';
import { Section } from '../../components/chrome.js';
import { firstCommunicationKpi, formatMmSs, formatNzdtTime } from '../../domain/kpi.js';
import { useAppStore } from '../../state/AppStore.js';
import { CommsNav } from './CommsNav.js';

/** Published Updates — every first publication on the shared records. */
export function PublishedPage(): React.JSX.Element {
  const { state, setRole } = useAppStore();

  useEffect(() => {
    setRole('CUSTOMER_INFORMATION');
  }, [setRole]);

  const published = [...state.incidents]
    .filter((i) => i.communicationStatus === 'PUBLISHED')
    .sort((a, b) => Date.parse(b.firstPublishedAt ?? b.detectedAt) - Date.parse(a.firstPublishedAt ?? a.detectedAt));

  return (
    <div>
      <div className="pagehead">
        <span className="eyebrow">AT Customer Information</span>
        <h1>Published Updates</h1>
        <p className="lede">
          Prototype passenger notices published from validated disruption information.
        </p>
      </div>

      <CommsNav />

      <Section title={`Published passenger updates (${published.length})`}>
        {published.length === 0 ? (
          <p className="muted">No passenger updates published yet.</p>
        ) : (
          <table className="records">
            <thead>
              <tr>
                <th>Incident</th>
                <th>Title</th>
                <th>Channels</th>
                <th>Published</th>
                <th>First communication</th>
                <th>Target</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {published.map((i) => {
                const kpi = firstCommunicationKpi(i);
                return (
                  <tr key={i.id}>
                    <td>
                      <strong>{i.id}</strong>
                      <div className="muted small">
                        Route {i.route} · <SeverityBadge level={i.severity} />
                      </div>
                    </td>
                    <td>{i.commsDraft?.title ?? '—'}</td>
                    <td>{i.selectedChannels.length > 0 ? i.selectedChannels.join(' + ') : '—'}</td>
                    <td>{i.firstPublishedAt ? formatNzdtTime(i.firstPublishedAt) : '—'}</td>
                    <td>{kpi.elapsedMs === null ? '—' : formatMmSs(kpi.elapsedMs)}</td>
                    <td>
                      <CommsTargetBadge incident={i} />
                    </td>
                    <td>
                      <Link className="btn btn-small" to={`/comms/incident/${i.id}`}>
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div className="note">
          Demo publication only — no live channel is connected. Follow-up
          publications never reset the first-communication time.
        </div>
      </Section>
    </div>
  );
}
