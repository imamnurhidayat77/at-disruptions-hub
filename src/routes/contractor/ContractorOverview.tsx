import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Section } from '../../components/chrome.js';
import {
  activeForOperator,
  assessedByAT,
  contractorIncidents,
  needsOperatorUpdate,
} from '../../domain/contractor.js';
import { useAppStore } from '../../state/AppStore.js';
import { ContractorNav, ContractorIncidentTable } from './ContractorTable.js';

/**
 * Bus Operator Portal — overview. Summary cards and recent incidents in
 * operator wording, derived from the shared record. No severity reasoning,
 * no SLA timers, no AT analytics.
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
  const closed = mine.filter((i) => i.operationalStatus === 'CLOSED');

  return (
    <div>
      <div className="pagehead">
        <span className="eyebrow">Bus Operator Portal</span>
        <h1>Overview</h1>
        <p className="lede">
          Report disruptions and send confirmed updates. AT validates each
          notification and manages severity, recovery and passenger communication.
        </p>
      </div>

      <ContractorNav />

      <div className="kpi-grid">
        <div className="kpi-card">
          <h3>Active Incidents</h3>
          <div className="kpi-value">{active.length}</div>
          <p className="muted small">Reported and not yet closed</p>
          <Link className="kpi-link" to="/contractor/incidents">
            View my incidents
          </Link>
        </div>
        <div className="kpi-card">
          <h3>Awaiting AT Assessment</h3>
          <div className="kpi-value">{awaiting.length}</div>
          <p className="muted small">Submitted, severity not yet set by AT</p>
          <Link className="kpi-link" to="/contractor/incidents">
            View my incidents
          </Link>
        </div>
        <div className="kpi-card">
          <h3>Updates Required</h3>
          <div className="kpi-value">{updates.length}</div>
          <p className="muted small">Validated by AT, no follow-up sent yet</p>
          <Link className="kpi-link" to="/contractor/incidents">
            View my incidents
          </Link>
        </div>
        <div className="kpi-card">
          <h3>Closed</h3>
          <div className="kpi-value">{closed.length}</div>
          <p className="muted small">Restored and closed by AT</p>
          <Link className="kpi-link" to="/contractor/incidents">
            View my incidents
          </Link>
        </div>
      </div>

      <Section title="Report a disruption">
        <p className="muted">
          Record route, location, onset and impact as confirmed. AT assesses severity
          and assigns an owner after submission.
        </p>
        <Link className="btn btn-primary btn-link" to="/contractor/report">
          + Report disruption
        </Link>
      </Section>

      <Section title="Recent incidents">
        <ContractorIncidentTable rows={mine.slice(0, 5)} />
        {mine.length > 5 && (
          <p>
            <Link className="btn" to="/contractor/incidents">
              View all my incidents
            </Link>
          </p>
        )}
      </Section>
    </div>
  );
}
