import type { Incident } from './types.js';

/**
 * Contractor-facing presentation helpers — business wording only, no
 * AT-internal SLA values, severity reasoning or KPI analytics. Pure
 * derivations from the shared record; the store is untouched.
 */

/** Operator-relevant status label (never exposes comms SLA state). */
export function operatorStatusLabel(incident: Incident): string {
  if (incident.operationalStatus === 'CLOSED') return 'Closed';
  if (incident.infoRequested) return 'More Information Requested';
  switch (incident.operationalStatus) {
    case 'REPORTED':
      // After an info round-trip the report returns ready, not brand new.
      return hasInfoRoundTrip(incident) ? 'Ready for AT Assessment' : 'Submitted to AT';
    case 'VALIDATED':
    case 'ACTIVE':
      return incident.severity === null ? 'Awaiting AT Assessment' : 'Recovery in Progress';
    case 'RECOVERY_IN_PROGRESS':
    case 'RESTORED':
      return 'Recovery in Progress';
  }
  // CLOSED is handled by the early return above; reaching here is unreachable.
  return 'Closed';
}

/** Whether AT previously asked for more information (derived from audit). */
function hasInfoRoundTrip(incident: Incident): boolean {
  return incident.timeline.some((e) => e.action === 'More information requested');
}

/** Whether AT has assessed severity (drives the severity column). */
export function assessedByAT(incident: Incident): boolean {
  return incident.severity !== null;
}

/** ISO timestamp of the latest contractor-authored timeline event, if any. */
export function lastOperatorUpdateAt(incident: Incident): string | null {
  const mine = incident.timeline
    .filter((e) => e.actorRole === 'CONTRACTOR')
    .map((e) => e.at)
    .sort();
  return mine.length === 0 ? null : mine[mine.length - 1];
}

/** True once the operator sent at least one confirmed update (not just the submit). */
export function hasOperatorUpdates(incident: Incident): boolean {
  return incident.timeline.some((e) => e.action === 'Operator sent confirmed update');
}

/**
 * Whether the operator should send a follow-up. True only when the shared
 * state indicates a follow-up is required:
 * - AT explicitly requested more information (infoRequested), or
 * - the notification was validated and no contractor update has been
 *   recorded since confirmation.
 * Closed/restored incidents never require an update.
 */
export function needsOperatorUpdate(incident: Incident): boolean {
  if (incident.operationalStatus === 'CLOSED' || incident.operationalStatus === 'RESTORED') {
    return false;
  }
  if (incident.infoRequested) return true;
  if (incident.confirmedAt === null) return false;
  const last = lastOperatorUpdateAt(incident);
  if (last === null) return true;
  return Date.parse(last) <= Date.parse(incident.confirmedAt);
}

/** Contractor incidents: reported by the operator, newest first. */
export function contractorIncidents(incidents: Incident[]): Incident[] {
  return incidents
    .filter(
      (i) =>
        i.operator === 'City Bus Operator' ||
        i.timeline.some((e) => e.action === 'Operator submitted initial disruption notification'),
    )
    .sort((a, b) => Date.parse(b.detectedAt) - Date.parse(a.detectedAt));
}

/** Incidents still being worked (not restored, not closed). */
export function activeForOperator(incidents: Incident[]): Incident[] {
  return contractorIncidents(incidents).filter(
    (i) => i.operationalStatus !== 'CLOSED' && i.operationalStatus !== 'RESTORED',
  );
}
