import type { TimelineEvent } from '../domain/types.js';
import { formatNzdtShort } from '../domain/kpi.js';

/** Shared audit timeline (newest first). One markup, every role. */
export function Timeline({ events }: { events: TimelineEvent[] }): React.JSX.Element {
  return (
    <ul className="timeline">
      {events.map((e) => (
        <li key={e.id}>
          <span className="t-at">{formatNzdtShort(e.at)}</span>
          <span className="t-action">{e.action}</span>
          <div className="t-detail">
            {e.actorRole} · {e.detail}
          </div>
        </li>
      ))}
    </ul>
  );
}
