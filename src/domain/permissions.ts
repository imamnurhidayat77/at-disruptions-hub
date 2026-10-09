import type { Role } from './types.js';

/**
 * Role permission matrix — the ONLY place role capabilities are defined.
 * Mirrors docs/PRODUCT_REQUIREMENTS.md §4. UI renders from this; never
 * hard-code per-role `if` branches in components for new actions.
 */

export type DemoAction =
  | 'report-disruption'
  | 'send-operator-update'
  | 'view-own-incidents'
  | 'validate-incident'
  | 'assess-severity'
  | 'assign-owner'
  | 'coordinate-recovery'
  | 'record-restoration'
  | 'close-incident'
  | 'manage-review'
  | 'view-comms-status'
  | 'draft-comms'
  | 'publish-comms'
  | 'view-comms-kpi'
  | 'view-analytics';

export const ACTION_LABELS: Record<DemoAction, string> = {
  'report-disruption': 'Create disruption notification',
  'send-operator-update': 'Send confirmed incident updates',
  'view-own-incidents': 'View own incidents + high-level AT status',
  'validate-incident': 'Validate incident information',
  'assess-severity': 'Assess / override severity',
  'assign-owner': 'Assign incident owner',
  'coordinate-recovery': 'Coordinate operational recovery',
  'record-restoration': 'Update restoration information',
  'close-incident': 'Close incident',
  'manage-review': 'Create / trigger review actions',
  'view-comms-status': 'View customer communication status',
  'draft-comms': 'Prepare / edit passenger communication draft',
  'publish-comms': 'Approve & publish passenger notice',
  'view-comms-kpi': 'View communication KPI and timer',
  'view-analytics': 'View internal AT analytics',
};

const MATRIX: Record<Role, DemoAction[]> = {
  CONTRACTOR: [
    'report-disruption',
    'send-operator-update',
    'view-own-incidents',
    'view-comms-status',
  ],
  OPERATIONS: [
    'validate-incident',
    'assess-severity',
    'assign-owner',
    'coordinate-recovery',
    'record-restoration',
    'close-incident',
    'manage-review',
    'view-comms-status',
    'view-analytics',
  ],
  CUSTOMER_INFORMATION: [
    'view-own-incidents',
    'view-comms-status',
    'draft-comms',
    'publish-comms',
    'view-comms-kpi',
  ],
};

export function allowedActions(role: Role): DemoAction[] {
  return [...MATRIX[role]];
}

export function deniedActions(role: Role): DemoAction[] {
  const allowed = new Set<DemoAction>(MATRIX[role]);
  return (Object.keys(ACTION_LABELS) as DemoAction[]).filter((a) => !allowed.has(a));
}

export function can(role: Role, action: DemoAction): boolean {
  return MATRIX[role].includes(action);
}
