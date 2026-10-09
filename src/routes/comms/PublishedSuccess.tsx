import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FioriButton } from '../../components/Button.js';
import { Crumbs, Section } from '../../components/chrome.js';
import { KpiCard } from '../../components/KpiCard.js';
import {
  firstCommunicationKpi,
  formatMmSs,
  formatNzdtDate,
  formatNzdtShort,
} from '../../domain/kpi.js';
import { useAppStore } from '../../state/AppStore.js';

/**
 * Publication Success — Figma "04 Customer Information" landing page
 * after Approve & Publish. Read-only record of the first publication;
 * follow-ups never reset the first-communication time.
 */
export function PublishedSuccess(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setRole, getIncident } = useAppStore();

  useEffect(() => {
    setRole('CUSTOMER_INFORMATION');
  }, [setRole]);

  const incident = id ? getIncident(id) : undefined;

  if (!incident) {
    return (
      <div>
        <div className="pagehead">
          <Crumbs trail={['Customer Information', 'Published Updates']} />
          <h1>Incident not found</h1>
          <p className="lede">No record found with ID {id ?? '(unknown)'}.</p>
        </div>
        <div className="actions-bar">
          <FioriButton icon="back" to="/comms/published">
            Back to published updates
          </FioriButton>
        </div>
      </div>
    );
  }

  if (incident.communicationStatus !== 'PUBLISHED' || !incident.commsDraft) {
    return (
      <div>
        <div className="pagehead">
          <Crumbs trail={['Customer Information', 'Published Updates']} />
          <h1>Nothing published yet</h1>
          <p className="lede">
            {incident.id} has no passenger publication to display.
          </p>
        </div>
        <div className="actions-bar">
          <FioriButton
            design="emphasized"
            icon="arrowRight"
            to={`/comms/incident/${incident.id}`}
          >
            Prepare update
          </FioriButton>
        </div>
      </div>
    );
  }

  const kpi = firstCommunicationKpi(incident);
  const draft = incident.commsDraft;

  return (
    <div>
      <div className="pagehead">
        <Crumbs trail={['Customer Information', 'Published Updates', incident.id]} />
        <div className="pagehead-with-action">
          <h1>Passenger update published successfully.</h1>
          <div className="actions-bar">
            {kpi.targetMet && <span className="badge tg-good">✓ TARGET MET</span>}
          </div>
        </div>
        <p className="lede">
          {incident.id} · {draft.title}
        </p>
      </div>

      <div className="success" role="status">
        Published within the 10-minute communication target.
      </div>

      <div className="kpi-grid kpi-grid-3">
        <KpiCard
          title="Published"
          value={incident.firstPublishedAt ? formatNzdtShort(incident.firstPublishedAt) : '—'}
          context={incident.firstPublishedAt ? formatNzdtDate(incident.firstPublishedAt) : ''}
        />
        <KpiCard
          title="First Communication"
          value={kpi.elapsedMs === null ? '—' : formatMmSs(kpi.elapsedMs)}
          context="Target ≤10 min"
        />
        <KpiCard
          title="Channels"
          value={incident.selectedChannels.length}
          context={incident.selectedChannels.join(' · ') || 'No channels'}
        />
      </div>

      <Section title="Published Passenger Update">
        <p>
          <strong>{draft.title}</strong>
        </p>
        <p>{draft.message}</p>
        <dl className="facts-grid">
          <div className="fact">
            <dt>Channels</dt>
            <dd>{incident.selectedChannels.join(' · ') || '—'}</dd>
          </div>
          <div className="fact">
            <dt>Next Update Time</dt>
            <dd>{draft.nextUpdateBy || '—'}</dd>
          </div>
          <div className="fact">
            <dt>Publication Status</dt>
            <dd>Published</dd>
          </div>
        </dl>
        <div className="actions-bar">
          <FioriButton icon="view" to={`/comms/incident/${incident.id}`}>
            View Incident
          </FioriButton>
          <FioriButton
            design="emphasized"
            icon="send"
            onClick={() =>
              navigate(`/comms/incident/${incident.id}`, { state: { followUp: true } })
            }
          >
            Publish Follow-Up
          </FioriButton>
        </div>
      </Section>
    </div>
  );
}
