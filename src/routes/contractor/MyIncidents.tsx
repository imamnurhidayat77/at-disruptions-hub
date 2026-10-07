import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Section } from '../../components/chrome.js';
import { contractorIncidents } from '../../domain/contractor.js';
import { useAppStore } from '../../state/AppStore.js';
import { ContractorNav, ContractorIncidentTable } from './ContractorTable.js';

/** Bus Operator Portal — every incident this operator reported. */
export function MyIncidents(): React.JSX.Element {
  const { state, setRole } = useAppStore();

  useEffect(() => {
    setRole('CONTRACTOR');
  }, [setRole]);

  const mine = contractorIncidents(state.incidents);

  return (
    <div>
      <div className="pagehead">
        <span className="eyebrow">Bus Operator Portal</span>
        <h1>My Incidents</h1>
        <p className="lede">
          Every disruption reported by this operator, with the latest AT status.
        </p>
      </div>

      <ContractorNav />

      <Section title={`Reported incidents (${mine.length})`}>
        {mine.length === 0 ? (
          <p className="muted">
            No notifications submitted yet.{' '}
            <Link to="/contractor/report">Report a disruption</Link>.
          </p>
        ) : (
          <ContractorIncidentTable rows={mine} />
        )}
      </Section>
    </div>
  );
}
