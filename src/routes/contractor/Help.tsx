import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Section } from '../../components/chrome.js';
import { useAppStore } from '../../state/AppStore.js';
import { ContractorNav } from './ContractorTable.js';

/** Bus Operator Portal — reporting guidance for operators. */
export function ContractorHelp(): React.JSX.Element {
  const { setRole } = useAppStore();

  useEffect(() => {
    setRole('CONTRACTOR');
  }, [setRole]);

  return (
    <div>
      <div className="pagehead">
        <span className="eyebrow">Bus Operator Portal</span>
        <h1>Help</h1>
        <p className="lede">How disruption reporting works in this portal.</p>
      </div>

      <ContractorNav />

      <Section title="What to report">
        <ul>
          <li>Route, direction and confirmed location.</li>
          <li>Onset time and what happened (facts already confirmed with the depot or driver).</li>
          <li>Estimated delay, passenger impact and whether a major interchange is affected.</li>
          <li>Do not add detours, stop closures or restoration times unless confirmed.</li>
        </ul>
      </Section>

      <Section title="What happens after you submit">
        <ul>
          <li>AT validates the notification and the 10-minute passenger information clock starts.</li>
          <li>AT assesses severity and assigns an accountable owner.</li>
          <li>Recovery and passenger communication run in parallel on the same record.</li>
          <li>You can send confirmed updates at any time until the incident is closed.</li>
        </ul>
      </Section>

      <Section title="What stays with AT">
        <p className="muted">
          Final severity, incident ownership, passenger messaging and internal AT
          analytics are managed by AT roles. This portal shows only your reports,
          their AT status and any assessed severity.
        </p>
        <p>
          <Link className="btn btn-primary btn-link" to="/contractor/report">
            + Report disruption
          </Link>
        </p>
      </Section>
    </div>
  );
}
