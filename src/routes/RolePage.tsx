import { useEffect } from 'react';
import { IncidentCard } from '../components/IncidentCard.js';
import { CommsTargetBadge, OpStatusBadge, SeverityBadge } from '../components/badges.js';
import { Section } from '../components/chrome.js';
import { firstCommunicationKpi, formatMmSs, formatNzdtTime } from '../domain/kpi.js';
import { ACTION_LABELS, allowedActions, deniedActions } from '../domain/permissions.js';
import { assessSeverity } from '../domain/severity.js';
import { ROLE_LABELS, type Role } from '../domain/types.js';
import { sapConnectionStatus } from '../services/incidentRepository.js';
import { useAppStore } from '../state/AppStore.js';
import { ROLE_PAGES } from './roleConfig.js';

/**
 * Phase-1 proof page, rendered per role from ROLE_PAGES config.
 * Demonstrates: role-specific navigation + permissions over ONE shared
 * incident record. Feature workflows (report / assess / publish) land in
 * Phases 2–4; this page only reads shared state.
 */
export function RolePage({ role }: { role: Role }): React.JSX.Element {
  const { state, setRole, resetDemo, getIncident } = useAppStore();

  // Deep links drive the demo role (the switcher is a demo mechanism, not auth).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setRole(role);
  }, [role]);

  const config = ROLE_PAGES[role];
  const incident = getIncident('INC-1043');

  if (!incident) {
    return (
      <div>
        <p>Demo seed is missing INC-1043. Use Reset demo below to restore it.</p>
        <button className="btn btn-primary" type="button" onClick={resetDemo}>
          Reset demo
        </button>
      </div>
    );
  }

  const recommendation = assessSeverity({
    estimatedDelayMinutes: incident.estimatedDelayMinutes,
    passengerImpact: incident.passengerImpact,
    majorInterchangeAffected: incident.majorInterchangeAffected,
    disruptionType: incident.disruptionType,
  });
  const kpi = firstCommunicationKpi(incident);
  const allowed = allowedActions(role);
  const denied = deniedActions(role);
  const sap = sapConnectionStatus();
  const timeline = [...incident.timeline].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const fingerprint = `record=${incident.id} status=${incident.operationalStatus}/${incident.communicationStatus} events=${incident.timeline.length} records=${state.incidents.length}`;

  return (
    <div>
      <div className="pagehead">
        <span className="eyebrow">{ROLE_LABELS[role]}</span>
        <h1>{config.title}</h1>
        <p className="lede">{config.need}</p>
      </div>

      <nav className="subnav" aria-label={`${ROLE_LABELS[role]} navigation`}>
        {config.nav.map((item) =>
          item.href ? (
            <a key={item.label} href={item.href}>
              {item.label}
            </a>
          ) : (
            <a key={item.label} href="#system" aria-disabled="true" title={`Available in ${item.phaseNote}`}>
              {item.label}
              <span className="phase-tag">{item.phaseNote}</span>
            </a>
          ),
        )}
      </nav>

      <Section id="incident" title="Shared incident record — INC-1043">
        <IncidentCard incident={incident} />
        <div className="fingerprint" aria-label="Shared-record fingerprint">
          Shared-record fingerprint: {fingerprint} (identical on every role page)
        </div>
      </Section>

      <div className="grid-2">
        <Section id="severity" title="Severity recommendation (prototype)">
          {incident.severity === null ? (
            <div>
              <p>
                System recommendation: <SeverityBadge level={recommendation.level} />{' '}
                <span className="muted small">score {recommendation.score}</span>
              </p>
              <h3>Contributing factors</h3>
              <ul>
                {recommendation.factors.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <h3>Recommended action</h3>
              <p>{recommendation.recommendedAction}</p>
              <p className="muted small">
                Awaiting AT Operations assessment — final severity is set in Phase 3.
              </p>
            </div>
          ) : (
            <div>
              <p>
                Final severity: <SeverityBadge level={incident.severity} />
              </p>
              {incident.severityReason && <p>{incident.severityReason}</p>}
              {incident.severityOverrideReason && (
                <p>Override reason: {incident.severityOverrideReason}</p>
              )}
            </div>
          )}
          <div className="note">{recommendation.prototypeNote}</div>
        </Section>

        <Section id="comms" title="First-communication KPI (10-minute target)">
          {kpi.state === 'AWAITING_CONFIRMATION' && (
            <p>
              KPI clock has not started — it starts when AT Operations confirms the
              incident (Phase 3). Target: first passenger publication within{' '}
              {kpi.targetMinutes} minutes of confirmation.
            </p>
          )}
          {kpi.state === 'COUNTING' && (
            <div>
              <p>
                Elapsed since confirmation:{' '}
                <strong>{kpi.elapsedMs === null ? '–' : formatMmSs(kpi.elapsedMs)}</strong>
              </p>
              <p>
                Remaining:{' '}
                <strong>{kpi.remainingMs === null ? '–' : formatMmSs(kpi.remainingMs)}</strong>
              </p>
              <p>
                <CommsTargetBadge incident={incident} />
              </p>
            </div>
          )}
          {(kpi.state === 'MET' || kpi.state === 'EXCEEDED') && (
            <div>
              <p>
                Published: {kpi.firstPublishedAt ? formatNzdtTime(kpi.firstPublishedAt) : '–'}
              </p>
              <p>
                Elapsed:{' '}
                <strong>
                  {kpi.elapsedMs === null ? '–' : `${Math.round(kpi.elapsedMs / 60000)} min`}
                </strong>{' '}
                <CommsTargetBadge incident={incident} />
              </p>
            </div>
          )}
          <div className="note">
            Derived from timestamps (confirmed
            {kpi.confirmedAt ? ` ${formatNzdtTime(kpi.confirmedAt)}` : ' —'} → published
            {kpi.firstPublishedAt ? ` ${formatNzdtTime(kpi.firstPublishedAt)}` : ' —'}), never
            hard-coded.
          </div>
        </Section>
      </div>

      <Section id="permissions" title={`What ${ROLE_LABELS[role]} can do`}>
        <div className="perm-lists">
          <div>
            <h3>Allowed</h3>
            <ul>
              {allowed.map((a) => (
                <li key={a}>
                  <span className="perm-yes">✓ </span>
                  {ACTION_LABELS[a]}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Not permitted for this role</h3>
            <ul>
              {denied.map((a) => (
                <li key={a}>
                  <span className="perm-no">✗ </span>
                  {ACTION_LABELS[a]}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section id="timeline" title="Audit timeline (newest first)">
        <ul className="timeline">
          {timeline.map((e) => (
            <li key={e.id}>
              <span className="t-at">{formatNzdtTime(e.at)}</span>
              <span className="t-action">{e.action}</span>
              <div className="t-detail">
                {e.actorRole} · {e.detail}
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="incidents" title="All shared records">
        <table className="records">
          <thead>
            <tr>
              <th>Incident</th>
              <th>Route</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Update target</th>
            </tr>
          </thead>
          <tbody>
            {state.incidents.map((i) => (
              <tr key={i.id}>
                <td>
                  <strong>{i.id}</strong>
                  <div className="muted small">{i.location}</div>
                </td>
                <td>{i.route}</td>
                <td>
                  <SeverityBadge level={i.severity} />
                </td>
                <td>
                  <OpStatusBadge status={i.operationalStatus} />
                </td>
                <td>
                  <CommsTargetBadge incident={i} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted small">
          Queue filters, search and KPI cards arrive in Phase 5 — this table only proves
          every role reads the same store.
        </p>
      </Section>

      <Section id="system" title="Demo controls">
        <p className="muted">{sap.message}</p>
        <button className="btn" type="button" onClick={resetDemo}>
          Reset demo
        </button>{' '}
        <span className="muted small">
          Restores the canonical seed (INC-1043 awaiting validation). State persists
          across reloads and role switches via localStorage.
        </span>
      </Section>
    </div>
  );
}
