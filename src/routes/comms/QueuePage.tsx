import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CommsTargetBadge, OpStatusBadge, SeverityBadge } from '../../components/badges.js';
import { Crumbs, Section } from '../../components/chrome.js';
import {
  awaitingSeverityAssessment,
  needsFirstPublication,
} from '../../domain/comms.js';
import { firstCommunicationKpi, formatMmSs } from '../../domain/kpi.js';
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
 * Passenger Communication Queue — validated + severity-assessed incidents
 * needing a first publication, riskiest first. The same shared INC-1043
 * validated by AT Operations appears here automatically; REPORTED records
 * (and validated records awaiting severity assessment) are listed as blocked.
 */
export function QueuePage(): React.JSX.Element {
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
  const reported = state.incidents.filter((i) => i.operationalStatus === 'REPORTED');
  const awaitingSeverity = state.incidents.filter(awaitingSeverityAssessment);
  const nowIso = useNowTick(queue.length > 0);

  return (
    <div>
      <div className="pagehead">
        <Crumbs trail={['Customer Information', 'Communication Queue']} />
        <span className="eyebrow">AT Customer Information</span>
        <h1>Passenger Communication Queue</h1>
        <p className="lede">
          Validated incidents needing a first passenger update. Recovery and
          passenger communication run in parallel — publishing does not wait for
          restoration.
        </p>
      </div>

      <CommsNav />

      <Section title={`Ready for passenger publication (${queue.length})`}>
        {queue.length === 0 ? (
          <p className="muted">Nothing needs a first publication right now.</p>
        ) : (
          <table className="records">
            <thead>
              <tr>
                <th>Incident</th>
                <th>Route</th>
                <th>AT Severity</th>
                <th>Operational status</th>
                <th>Communication</th>
                <th>Timer</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((i) => {
                const kpi = firstCommunicationKpi(i, nowIso);
                return (
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
                      <div>{kpi.elapsedMs === null ? '—' : `${formatMmSs(kpi.elapsedMs)} elapsed`}</div>
                      <div className="muted small">
                        {kpi.remainingMs === null
                          ? 'Target: 10 minutes'
                          : `${formatMmSs(Math.max(0, kpi.remainingMs))} remaining · target 10 min`}
                      </div>
                    </td>
                    <td>
                      <Link className="btn btn-small btn-primary" to={`/comms/incident/${i.id}`}>
                        Prepare update
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {(reported.length > 0 || awaitingSeverity.length > 0) && (
          <div className="note">
            {reported.length > 0 && (
              <div>
                Awaiting Operations validation (not yet actionable):{' '}
                {reported.map((i) => i.id).join(', ')}.
              </div>
            )}
            {awaitingSeverity.length > 0 && (
              <div>
                Validated, awaiting AT severity assessment:{' '}
                {awaitingSeverity.map((i) => i.id).join(', ')}.
              </div>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}
