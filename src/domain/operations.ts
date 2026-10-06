import type { Incident, OperationalStatus, RecoveryTask } from './types.js';

/**
 * AT Operations helpers — guards, rosters and recovery-task defaults.
 * State transitions themselves live in the store reducer; this module
 * keeps the rules testable and out of components.
 */

/** Demo owner roster. Canonical demo owner: Sarah Chen. */
export const OWNER_ROSTER = [
  'Sarah Chen',
  'Maya King',
  'J. Chen',
  'L. Patel',
  'A. Wilson',
];

export function defaultRecoveryTasks(): RecoveryTask[] {
  return [
    {
      id: 'contact-operator',
      label: 'Operator contacted — passenger arrangements confirmed',
      responsible: 'Operator liaison',
      doneAt: null,
    },
    {
      id: 'replacement-requested',
      label: 'Replacement vehicle requested',
      responsible: 'Operator liaison',
      doneAt: null,
    },
    {
      id: 'service-restored',
      label: 'Service restored and verified with operator',
      responsible: 'Incident owner',
      doneAt: null,
    },
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

export type OpsStatus = Extract<
  OperationalStatus,
  'VALIDATED' | 'ACTIVE' | 'RECOVERY_IN_PROGRESS' | 'RESTORED'
>;
