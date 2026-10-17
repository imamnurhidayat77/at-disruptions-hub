import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { OpStatusBadge, SeverityBadge, TargetResultBadge } from '../../components/badges.js';
import { Crumbs, Section } from '../../components/chrome.js';
import { FioriButton } from '../../components/Button.js';
import { Timeline } from '../../components/Timeline.js';
import { useNowTick } from '../../components/useNowTick.js';
import { targetProgress } from '../../domain/comms.js';
import { firstCommunicationKpi, formatMmSs, formatNzdtShort } from '../../domain/kpi.js';
import { useAppStore } from '../../state/AppStore.js';
import { RecoveryPanel } from './RecoveryPanel.js';

/** Anchor targets watched by the scroll-spy (absent sections are skipped). */
const ANCHOR_IDS = ['overview', 'recovery', 'comms', 'timeline', 'source', 'review'];

/**
 * AT Operations incident workspace: Figma "03 AT Operations" frames.
 * Title card, anchor sections, communication target, read-only recovery
 * and passenger communication as parallel tracks, shared timeline,
 * linked SAP context and review. Assessment lives on dedicated pages.
 */
export function IncidentWorkspace(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { setRole, getIncident, requestComms } = useAppStore();
  const { hash } = useLocation();

  useEffect(() => {
    setRole('OPERATIONS');
  }, [setRole]);

  // Deep links (e.g. …/incident/INC-1#recovery) scroll to the section:
  // React Router does not do this automatically.
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
    }
  }, [hash, id]);

  const incident = id ? getIncident(id) : undefined;
  const nowIso = useNowTick(incident?.communicationStatus !== 'PUBLISHED');
  const [activeAnchor, setActiveAnchor] = useState('overview');

  // The full workspace (and its anchor sections) renders only once the
  // incident is accepted, assessed and owned. Every hook stays above the
  // early returns below: this component is reused when the route id
  // changes in place, so the hook order must not depend on the record.
  const workspaceOpen =
    incident !== undefined &&
    incident.operationalStatus !== 'REPORTED' &&
    Boolean(incident.severity) &&
    Boolean(incident.owner);
  const hasSource = Boolean(incident?.sapLink);

  // Scroll-spy: highlight the tab of the section currently in view.
  useEffect(() => {
    if (!workspaceOpen) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveAnchor(entry.target.id);
        }
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    for (const anchorId of ANCHOR_IDS) {
      const el = document.getElementById(anchorId);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [id, workspaceOpen, hasSource]);

  if (!incident) {
    return (
      <div>
        <div className="pagehead">
          <Crumbs trail={['Operations', 'Incidents']} />
          <h1>Incident not found</h1>
          <p className="lede">No record found with ID {id ?? '(unknown)'}.</p>
        </div>
        <div className="actions-bar">
          <FioriButton icon="back" to="/operations/incidents">
            Back to incidents
          </FioriButton>
        </div>
      </div>
    );
  }

  if (incident.operationalStatus === 'REPORTED') {
    return (
      <div>
        <div className="pagehead">
          <Crumbs trail={['Operations', 'Incidents', incident.id]} />
          <h1>{incident.id}</h1>
          <p className="lede">
            Route {incident.route}: {incident.disruptionType} · {incident.location}
          </p>
        </div>
        <Section title="Accept the notification first">
          <p className="muted">
            The workspace opens after AT Operations accepts the notification and completes
            severity assessment and owner assignment.
          </p>
          <div className="actions-bar">
            <FioriButton
              design="emphasized"
              icon="detail"
              to={`/operations/incoming/${incident.id}`}
            >
              Open incoming notification
            </FioriButton>
          </div>
        </Section>
      </div>
    );
  }

  if (!incident.severity || !incident.owner) {
    const next = !incident.severity
      ? `/operations/incident/${incident.id}/severity`
      : `/operations/incident/${incident.id}/owner`;
    const label = !incident.severity ? 'severity assessment' : 'owner assignment';
    return (
      <div>
        <div className="pagehead">
          <Crumbs trail={['Operations', 'Incidents', incident.id]} />
          <h1>{incident.id}</h1>
          <p className="lede">
            Route {incident.route}: {incident.disruptionType} · {incident.location}
          </p>
        </div>
        <Section title="Continue the intake workflow">
          <p className="muted">Complete {label} to open the incident workspace.</p>
          <div className="actions-bar">
            <FioriButton design="emphasized" icon="arrowRight" to={next}>
              Continue
            </FioriButton>
          </div>
        </Section>
      </div>
    );
  }

  const published = incident.communicationStatus === 'PUBLISHED';
  const kpi = firstCommunicationKpi(incident, nowIso);
  const progress = targetProgress(kpi.elapsedMs);
  const timeline = [...incident.timeline].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  const anchorSections = [
    { id: 'overview', label: 'Overview' },
    { id: 'recovery', label: 'Recovery' },
    { id: 'comms', label: 'Passenger Communication' },
    { id: 'timeline', label: 'Timeline' },
    ...(incident.sapLink ? [{ id: 'source', label: 'Source context' }] : []),
    { id: 'review', label: 'Review' },
  ];

  return (
    <div>
      <div className="pagehead">
        <Crumbs trail={['Operations', 'Incidents', incident.id]} />
        <h1>{incident.id}</h1>
        <p className="lede">
          Incident Workspace ·{' '}
          {published ? 'Passenger communication published' : 'One shared incident record'}
        </p>
      </div>

      <nav className="anchor-tabs" aria-label="Workspace sections">
        {anchorSections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={activeAnchor === s.id ? 'active' : undefined}
            aria-current={activeAnchor === s.id ? 'true' : undefined}
          >
            {s.label}
          </a>
        ))}
      </nav>

      <Section title={`Route ${incident.route}: ${incident.disruptionType}`} id="overview">
        <p className="muted small">
          {incident.location} · {incident.id}
        </p>
        <p>
          <SeverityBadge level={incident.severity} />{' '}
          <OpStatusBadge status={incident.operationalStatus} />{' '}
          {incident.recoveryStatus === 'RESTORED' ? (
            <span className="badge tg-good">✓ Restored</span>
          ) : incident.recoveryStatus === 'IN_PROGRESS' ? (
            <span className="badge st-ops">◈ Recovery in Progress</span>
          ) : (
            <span className="badge st-idle">○ Recovery Not Started</span>
          )}{' '}
          {published && <span className="badge tg-good">✓ Published</span>}
        </p>
        <dl className="facts-grid">
          <div className="fact">
            <dt>Owner</dt>
            <dd>{incident.owner}</dd>
          </div>
          <div className="fact">
            <dt>Operator</dt>
            <dd>{incident.operator}</dd>
          </div>
          <div className="fact">
            <dt>Estimated Delay</dt>
            <dd>{incident.estimatedDelayMinutes} min</dd>
          </div>
          <div className="fact">
            <dt>Estimated Restoration</dt>
            <dd>
              {incident.estimatedRestorationAt
                ? formatNzdtShort(incident.estimatedRestorationAt)
                : 'Not yet confirmed'}
            </dd>
          </div>
        </dl>
      </Section>

      <Section title="Communication Target">
        <p>
          {published ? (
            <TargetResultBadge state={kpi.state} />
          ) : (
            <span className="badge tg-warn">▲ Passenger Notice Required</span>
          )}
        </p>
        <p>
          {kpi.elapsedMs === null ? (
            <span className="muted">Timer starts at validation.</span>
          ) : (
            <>
              <strong>
                {published && incident.firstPublishedAt
                  ? `${formatMmSs(kpi.elapsedMs)} first communication`
                  : `${formatMmSs(kpi.elapsedMs)} elapsed`}
              </strong>{' '}
              {kpi.remainingMs !== null && !published && (
                <span className="muted">· {formatMmSs(kpi.remainingMs)} remaining</span>
              )}
              {published && incident.firstPublishedAt && (
                <span className="muted">
                  {' '}
                  · Published at {formatNzdtShort(incident.firstPublishedAt)}
                </span>
              )}
            </>
          )}
        </p>
        <div
          className="progress"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Communication target progress"
        >
          <div
            className={`progress-fill${kpi.targetMet ? ' good' : ''}`}
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <p className="muted small">
          Target: ≤10 minutes · First Publication:{' '}
          {incident.firstPublishedAt
            ? formatNzdtShort(incident.firstPublishedAt)
            : 'Not yet published'}
        </p>
        <div className="note" role="note">
          Recovery and Passenger Communication are parallel activities.
        </div>
      </Section>

      <div id="recovery">
        <RecoveryPanel key={incident.id} incident={incident} />
      </div>

      <Section title="Passenger Communication" id="comms">
        <p>
          {published ? (
            <span className="badge tg-good">✓ Published</span>
          ) : (
            <span className="badge tg-warn">▲ Required</span>
          )}
        </p>
        <dl className="facts-grid">
          <div className="fact">
            <dt>First Publication</dt>
            <dd>
              {incident.firstPublishedAt
                ? formatNzdtShort(incident.firstPublishedAt)
                : 'Not yet published'}
            </dd>
          </div>
          <div className="fact">
            <dt>Timer</dt>
            <dd>{kpi.elapsedMs === null ? '-' : formatMmSs(kpi.elapsedMs)}</dd>
          </div>
          <div className="fact">
            <dt>Target</dt>
            <dd>≤10 min</dd>
          </div>
          <div className="fact">
            <dt>Remaining</dt>
            <dd>
              {kpi.remainingMs === null || published ? '-' : formatMmSs(kpi.remainingMs)}
            </dd>
          </div>
        </dl>
        {published && incident.commsDraft && (
          <div className="preview">
            <p className="muted small">
              {incident.selectedChannels.join(' · ')} · Read-only for Operations
            </p>
            <h3>{incident.commsDraft.title}</h3>
            <p>{incident.commsDraft.message}</p>
            <p>
              <TargetResultBadge state={kpi.state} />
            </p>
          </div>
        )}
        <div className="note" role="note">
          Read-only for Operations. Customer Information prepares and publishes passenger
          notices.
        </div>
        {!published && incident.commsRequestedAt === null && (
          <div className="actions-bar">
            <FioriButton icon="send" onClick={() => requestComms(incident.id)}>
              Notify Customer Info
            </FioriButton>
          </div>
        )}
        {!published && incident.commsRequestedAt !== null && (
          <p className="muted small" role="status">
            Customer Information notified at {formatNzdtShort(incident.commsRequestedAt)}, flagged
            in the communication queue.
          </p>
        )}
        {!published && incident.commsDraft && (
          <p className="muted small">
            Message draft is in progress. Recovery can continue independently.
          </p>
        )}
      </Section>

      <Section title="Shared Incident Timeline" id="timeline">
        <Timeline events={timeline} />
      </Section>

      {incident.sapLink && (
        <Section title="SAP source context" id="source">
          <p className="muted small">Source: SAP EHS Incident API</p>
          <p>
            <span className="badge tg-good">✓ Synced</span>{' '}
            <span className="badge st-idle">○ {incident.sapLink.sapStatus}</span>
          </p>
          <dl className="facts-grid">
            <div className="fact">
              <dt>SAP Incident ID</dt>
              <dd>{incident.sapLink.sapId}</dd>
            </div>
            <div className="fact">
              <dt>SAP UUID</dt>
              <dd>{incident.sapLink.sapUuid}</dd>
            </div>
            <div className="fact">
              <dt>SAP Status</dt>
              <dd>{incident.sapLink.sapStatus}</dd>
            </div>
            <div className="fact">
              <dt>Last Sync</dt>
              <dd>{formatNzdtShort(incident.sapLink.syncedAt)}</dd>
            </div>
          </dl>
          <p className="muted small">
            SAP Status is the source-system status. AT operational status is managed
            separately on the shared disruption record.
          </p>
        </Section>
      )}

      <div id="review">
        <Section title="Review">
          <p className="muted">
            {incident.operationalStatus === 'CLOSED'
              ? 'This incident is closed: open the closed record for the review summary.'
              : 'Close the incident to record the post-incident review.'}
          </p>
          <div className="actions-bar">
            <FioriButton
              icon="decline"
              to={`/operations/incident/${incident.id}/close`}
            >
              {incident.operationalStatus === 'CLOSED' ? 'Open closed record' : 'Close Incident'}
            </FioriButton>
          </div>
        </Section>
      </div>
    </div>
  );
}
