import { useEffect, useState } from 'react';
import { FioriButton } from '../../components/Button.js';
import { Crumbs, Section } from '../../components/chrome.js';
import { KpiCard } from '../../components/KpiCard.js';
import {
  activeForOperator,
  assessedByAT,
  contractorIncidents,
  needsOperatorUpdate,
} from '../../domain/contractor.js';
import { useAppStore } from '../../state/AppStore.js';
import { ContractorIncidentTable } from './ContractorTable.js';

/**
 * Bus Operator Portal — Contractor Overview (Figma "02 Bus Contractor").
 * KPI cards, filter bar, reported-incidents table and operator actions
 * in operator wording, derived from the shared record. No severity
 * reasoning, no SLA timers, no AT analytics.
 */
export function ContractorOverview(): React.JSX.Element {
  const { state, setRole } = useAppStore();

  useEffect(() => {
    setRole('CONTRACTOR');
  }, [setRole]);

  const mine = contractorIncidents(state.incidents);
  const active = activeForOperator(state.incidents);
  const awaiting = mine.filter((i) => !assessedByAT(i) && i.operationalStatus !== 'CLOSED');
  const updates = mine.filter(needsOperatorUpdate);
  const [filteredCount, setFilteredCount] = useState(mine.length);

  return (
    <div>
      <div className="pagehead">
        <Crumbs trail={['Bus Operator Portal']} />
        <div className="pagehead-with-action">
          <h1>Contractor Overview</h1>
          <div className="actions-bar">
            <FioriButton design="emphasized" icon="plus" to="/contractor/report">
              Report Disruption
            </FioriButton>
          </div>
        </div>
        <p className="lede">Report service disruptions and keep Auckland Transport updated.</p>
      </div>

      <div className="kpi-grid kpi-grid-3">
        <KpiCard title="Active Incidents" value={active.length} context="City Bus Operator" />
        <KpiCard
          title="Awaiting AT Assessment"
          value={awaiting.length}
          context={
            awaiting.length === 0
              ? 'All notifications assessed'
              : 'Submitted, severity not yet set by AT'
          }
        />
        <KpiCard
          title="Updates Required"
          value={updates.length}
          tone={updates.length > 0 ? 'warn' : undefined}
          context="Recovery update requested"
        />
      </div>

      <Section
        title="My Reported Incidents"
        count={`${filteredCount} record${filteredCount === 1 ? '' : 's'}`}
      >
        <ContractorIncidentTable rows={mine} onFilteredCount={setFilteredCount} />
        <p className="table-foot">Only incidents reported by City Bus Operator are shown.</p>
      </Section>
    </div>
  );
}
