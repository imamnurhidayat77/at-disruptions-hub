import type { TimelineEvent } from '../domain/types.js';
import { formatNzdtShort } from '../domain/kpi.js';

/** Shared audit timeline (newest first). One markup, every role. */
export function Timeline({
  events,
  unreadIds = [],
}: {
  events: TimelineEvent[];
  /** Event IDs not yet seen — rendered with a "New" marker. */
  unreadIds?: readonly string[];
}): React.JSX.Element {
  return (
    <ul className="timeline">
      {events.map((e) => {
        const isOperatorUpdate =
          e.actorRole === 'CONTRACTOR' && e.action === 'Operator sent confirmed update';
        const isNew = unreadIds.includes(e.id);
        return (
          <li key={e.id} className={isOperatorUpdate ? 't-operator-update' : undefined}>
            <span className="t-at">{formatNzdtShort(e.at)}</span>
            <span className="t-action">
              {isNew && <span className="badge st-new">● New</span>}{' '}
              {isOperatorUpdate && (
                <span className="badge st-ops">◈ Update from operator</span>
              )}{' '}
              {e.action}
            </span>
            <div className="t-detail">
              {e.actorRole} · {e.detail}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
