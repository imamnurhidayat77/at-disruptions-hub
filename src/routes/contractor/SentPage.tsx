import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FioriButton } from '../../components/Button.js';
import { Crumbs, Section } from '../../components/chrome.js';
import { formatNzdtTime } from '../../domain/kpi.js';
import { useAppStore } from '../../state/AppStore.js';

/**
 * Notification Sent — Figma "02 Bus Contractor" confirmation screen.
 * Read-only receipt for the submitted notification with a path back
 * into the shared incident record.
 */
export function SentPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { setRole, getIncident } = useAppStore();

  useEffect(() => {
    setRole('CONTRACTOR');
  }, [setRole]);

  const incident = id ? getIncident(id) : undefined;

  if (!incident) {
    return (
      <div>
        <div className="pagehead">
          <Crumbs trail={['Bus Operator Portal', 'Notification Sent']} />
          <h1>Incident not found</h1>
          <p className="lede">No record found with ID {id ?? '(unknown)'}.</p>
        </div>
        <div className="actions-bar">
          <FioriButton icon="back" to="/contractor">
            Back to overview
          </FioriButton>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="pagehead">
        <Crumbs trail={['Bus Operator Portal', 'My Incidents', incident.id]} />
        <h1>Notification Sent</h1>
        <p className="lede">Auckland Transport has received your disruption notification.</p>
      </div>

      <Section title={incident.id}>
        <div className="empty receipt-hero">
          <div className="receipt-medallion" aria-hidden="true">
            ✓
          </div>
          <p>
            <span className="badge sev-none">◌ Awaiting AT Assessment</span>
          </p>
          <p className="muted">
            Route {incident.route} — {incident.disruptionType} · {incident.location}
          </p>
          <div className="actions-bar empty-action">
            <FioriButton
              design="emphasized"
              icon="view"
              to={`/contractor/incident/${incident.id}`}
            >
              View Incident
            </FioriButton>
            <FioriButton design="transparent" icon="clipboard" to="/contractor/incidents">
              My incidents
            </FioriButton>
          </div>
        </div>
        <hr className="receipt-sep" />
        <dl className="facts-grid">
          <div className="fact">
            <dt>Operator</dt>
            <dd>{incident.operator}</dd>
          </div>
          <div className="fact">
            <dt>Estimated Delay</dt>
            <dd>{incident.estimatedDelayMinutes} min</dd>
          </div>
          <div className="fact">
            <dt>Submitted</dt>
            <dd>{formatNzdtTime(incident.detectedAt)}</dd>
          </div>
          <div className="fact">
            <dt>Status</dt>
            <dd>Awaiting AT Assessment</dd>
          </div>
        </dl>
      </Section>
    </div>
  );
}
