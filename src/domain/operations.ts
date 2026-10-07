import type { Incident, OperationalStatus, RecoveryTask } from './types.js';

/**
 * AT Operations helpers — guards, rosters and recovery-task defaults.
 * State transitions themselves live in the store reducer; this module
 * keeps the rules testable and out of components.
 */

/** Demo owner roster. Canonical demo owner: Sarah Chen. */
export const OWNER_ROSTER = ['Sarah Chen', 'James Wilson', 'Mia Roberts'];

/** Display titles for the demo roster (prototype labels). */
export const OWNER_TITLES: Record<string, string> = {
  'Sarah Chen': 'Duty Operations Manager',
  'James Wilson': 'Operations Controller',
  'Mia Roberts': 'Operations Controller',
};

export function defaultRecoveryTasks(): RecoveryTask[] {
  return [
    { id: 'operator-contacted', label: 'Operator contacted', responsible: 'Operator liaison', doneAt: null },
    { id: 'vehicle-located', label: 'Vehicle location confirmed', responsible: 'Operator liaison', doneAt: null },
    { id: 'replacement-requested', label: 'Replacement vehicle requested', responsible: 'Operator liaison', doneAt: null },
    { id: 'alternative-service', label: 'Alternative service confirmed', responsible: 'Incident owner', doneAt: null },
    { id: 'service-restored', label: 'Normal service restored', responsible: 'Incident owner', doneAt: null },
  ];
}

/** Backfill for records persisted before newer fields existed. */
export function normalizeIncident(incident: Incident): Incident {
  let next = incident;
  if (!Array.isArray(next.recoveryTasks)) {
    next = { ...next, recoveryTasks: defaultRecoveryTasks() };
  }
  if (!('commsDraft' in next) || next.commsDraft === undefined) {
    next = { ...next, commsDraft: null };
  }
  if (typeof (next as { infoRequested?: unknown }).infoRequested !== 'boolean') {
    next = { ...next, infoRequested: false };
  }
  // Rename legacy prototype channel labels on load (demo convenience).
  const renameChannel = (c: string): string => (c === 'AT website' ? 'Website' : c);
  if (Array.isArray(next.selectedChannels) && next.selectedChannels.some((c) => c === 'AT website')) {
    next = { ...next, selectedChannels: next.selectedChannels.map(renameChannel) };
  }
  if (next.commsDraft !== null && next.commsDraft.channels.some((c) => c === 'AT website')) {
    next = { ...next, commsDraft: { ...next.commsDraft, channels: next.commsDraft.channels.map(renameChannel) } };
  }
  return next;
}

/** Workflow stage for the workspace stepper (1-based). */
export function workflowStage(incident: Incident): number {
  if (incident.operationalStatus === 'CLOSED') return 5;
  if (
    incident.operationalStatus === 'RESTORED' ||
    incident.communicationStatus === 'PUBLISHED'
  ) {
    // Monitoring runs once service is restored or comms published; both
    // tracks visible in parallel — restoration takes precedence.
    if (incident.operationalStatus === 'RESTORED') return 4;
    return 3;
  }
  if (
    incident.operationalStatus === 'ACTIVE' ||
    incident.operationalStatus === 'RECOVERY_IN_PROGRESS'
  ) {
    return 2;
  }
  return 1;
}

export function canValidate(incident: Incident): boolean {
  return incident.operationalStatus === 'REPORTED';
}

export function canAssess(incident: Incident): boolean {
  return (
    incident.operationalStatus !== 'REPORTED' &&
    incident.operationalStatus !== 'CLOSED' &&
    incident.operationalStatus !== 'RESTORED'
  );
}

export function canMarkActive(incident: Incident): boolean {
  return (
    incident.operationalStatus === 'VALIDATED' &&
    incident.severity !== null &&
    incident.owner !== null
  );
}

export function recoveryOpen(incident: Incident): boolean {
  return (
    incident.operationalStatus === 'ACTIVE' ||
    incident.operationalStatus === 'RECOVERY_IN_PROGRESS'
  );
}

/** Operator/operations-friendly lifecycle label (badges keep raw state visible). */
export function operationalStatusLabel(status: Incident['operationalStatus']): string {
  switch (status) {
    case 'REPORTED':
      return 'Reported — awaiting validation';
    case 'VALIDATED':
      return 'Validated';
    case 'ACTIVE':
      return 'Active';
    case 'RECOVERY_IN_PROGRESS':
      return 'Recovery in Progress';
    case 'RESTORED':
      return 'Restored';
    case 'CLOSED':
      return 'Closed';
  }
}

export type OpsStatus = Extract<
  OperationalStatus,
  'VALIDATED' | 'ACTIVE' | 'RECOVERY_IN_PROGRESS' | 'RESTORED'
>;
