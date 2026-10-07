import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { OpStatusBadge, SeverityBadge } from '../../components/badges.js';
import { Section } from '../../components/chrome.js';
import { formatNzdtTime } from '../../domain/kpi.js';
import { useAppStore } from '../../state/AppStore.js';
import { OpsNav } from './OpsNav.js';

/** Recovery — live recovery position across every open incident. */
export function Recovery(): React.JSX.Element {
  const { state, setRole } = useAppStore();

  useEffect(() => {
    setRole('OPERATIONS');
  }, [setRole]);

  const open = state.incidents.filter(
    (i) =>
      i.operationalStatus === 'ACTIVE' ||
      i.operationalStatus === 'RECOVERY_IN_PROGRESS' ||
      i.operationalStatus === 'RESTORED',
  );

  return (
    <div>
      <div className="pagehead">
        <span className="eyebrow">AT Operations</span>
        <h1>Recovery Board</h1>
        <p className="lede">Service recovery across open incidents — updated in the workspace.</p>
      </div>

      <OpsNav />

      {open.length === 0 ? (
        <Section title="No open recovery">
          <p className="muted">No incidents in active recovery. Validate and assess incoming notifications first.</p>
        </Section>
      ) : (
        open.map((i) => {
          const done = i.recoveryTasks.filter((t) => t.doneAt !== null).length;
          const total = i.recoveryTasks.length;
          const pct = total === 0 ? 0 : Math.round((done / total) * 100);
          return (
            <Section key={i.id} title={`${i.id} — Route ${i.route} · ${i.disruptionType}`}>
              <p>
                <SeverityBadge level={i.severity} />{' '}
                <OpStatusBadge status={i.operationalStatus} />
              </p>
              <dl className="facts">
                <dt>Owner</dt>
                <dd>{i.owner ?? '— unassigned'}</dd>
                <dt>Tasks</dt>
                <dd>
                  {done}/{total} complete
                </dd>
                <dt>Estimated restoration</dt>
                <dd>
                  {i.estimatedRestorationAt
                    ? formatNzdtTime(i.estimatedRestorationAt)
                    : 'Not yet confirmed'}
                </dd>
              </dl>
              <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Recovery progress for ${i.id}`}>
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <p>
                <Link to={`/operations/incident/${i.id}`}>Open workspace →</Link>
              </p>
            </Section>
          );
        })
      )}
    </div>
  );
}
