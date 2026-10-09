import { useEffect, useState } from 'react';
import { FioriButton } from '../../components/Button.js';
import { Crumbs, Section } from '../../components/chrome.js';
import { EmptyState } from '../../components/EmptyState.js';
import { contractorIncidents } from '../../domain/contractor.js';
import { useAppStore } from '../../state/AppStore.js';
import { ContractorIncidentTable } from './ContractorTable.js';

/** Bus Operator Portal — every incident this operator reported. */
export function MyIncidents(): React.JSX.Element {
  const { state, setRole } = useAppStore();

  useEffect(() => {
    setRole('CONTRACTOR');
  }, [setRole]);

  const mine = contractorIncidents(state.incidents);
  const [filteredCount, setFilteredCount] = useState(mine.length);

  return (
    <div>
      <div className="pagehead">
        <Crumbs trail={['Bus Operator Portal', 'My Incidents']} />
        <h1>My Incidents</h1>
        <p className="lede">
          Every disruption reported by this operator, with the latest AT status.
        </p>
      </div>

      <Section
        title="Reported incidents"
        count={`${filteredCount} record${filteredCount === 1 ? '' : 's'}`}
      >
        {mine.length === 0 ? (
          <EmptyState
            illustration="▭"
            title="No notifications submitted yet"
            description="Report your first disruption to see it here with its AT status."
            action={
              <FioriButton design="emphasized" icon="plus" to="/contractor/report">
                Report a disruption
              </FioriButton>
            }
          />
        ) : (
          <ContractorIncidentTable rows={mine} onFilteredCount={setFilteredCount} />
        )}
      </Section>
    </div>
  );
}
