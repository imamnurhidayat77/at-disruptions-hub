import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SeverityBadge } from '../../components/badges.js';
import { Section } from '../../components/chrome.js';
import { useAppStore } from '../../state/AppStore.js';
import { OpsNav } from './OpsNav.js';

/** Reviews — closed incidents with root causes and follow-up actions. */
export function Reviews(): React.JSX.Element {
  const { state, setRole } = useAppStore();

  useEffect(() => {
    setRole('OPERATIONS');
  }, [setRole]);

  const closed = state.incidents.filter((i) => i.operationalStatus === 'CLOSED');

  return (
    <div>
      <div className="pagehead">
        <span className="eyebrow">AT Operations</span>
        <h1>Reviews</h1>
        <p className="lede">Closed incidents, root causes and corrective follow-up.</p>
      </div>

      <OpsNav />

      {closed.length === 0 ? (
        <Section title="No closed incidents">
          <p className="muted">
            Closed incidents with their review decisions and corrective actions appear
            here. Restore service and close an incident from its workspace.
          </p>
        </Section>
      ) : (
        closed.map((i) => {
          const open = i.correctiveActions.filter((c) => c.status === 'OPEN').length;
          return (
            <Section key={i.id} title={`${i.id} — Route ${i.route} · ${i.disruptionType}`}>
              <p>
                <SeverityBadge level={i.severity} />{' '}
                <span className="muted small">
                  Root cause: {i.rootCause ?? '—'} · Review {i.reviewRequired ? 'required' : 'not required'} ·{' '}
                  {open} open follow-up action{open === 1 ? '' : 's'}
                </span>
              </p>
              {i.correctiveActions.length > 0 && (
                <ul>
                  {i.correctiveActions.map((c) => (
                    <li key={c.id}>
                      {c.action} — {c.owner}, due {c.dueDate} ({c.status})
                    </li>
                  ))}
                </ul>
              )}
              <p>
                <Link to={`/operations/incident/${i.id}`}>Open record →</Link>
              </p>
            </Section>
          );
        })
      )}
    </div>
  );
}
