import { useEffect } from 'react';
import { Section } from '../../components/chrome.js';
import { useAppStore } from '../../state/AppStore.js';
import { IncomingCard } from './IncomingCard.js';
import { OpsNav } from './OpsNav.js';

/** Incoming — every unvalidated contractor notification, actionable. */
export function Incoming(): React.JSX.Element {
  const { state, setRole } = useAppStore();

  useEffect(() => {
    setRole('OPERATIONS');
  }, [setRole]);

  const incoming = state.incidents.filter((i) => i.operationalStatus === 'REPORTED');

  return (
    <div>
      <div className="pagehead">
        <span className="eyebrow">AT Operations</span>
        <h1>Incoming Notifications</h1>
        <p className="lede">
          Operator notifications awaiting AT validation. Accepting starts the
          10-minute communication clock.
        </p>
      </div>

      <OpsNav />

      <Section title={`Awaiting assessment (${incoming.length})`}>
        {incoming.length === 0 ? (
          <p className="muted">No unvalidated notifications. Contractor reports appear here.</p>
        ) : (
          incoming.map((i) => <IncomingCard key={i.id} incident={i} />)
        )}
      </Section>
    </div>
  );
}
