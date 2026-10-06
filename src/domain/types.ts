/**
 * Shared incident domain types — the single source of truth for
 * AT Disruption Hub. All three roles read and act on this one record.
 *
 * Field definitions: docs/PRODUCT_REQUIREMENTS.md §5.
 * All timestamps are ISO-8601 strings carrying an NZ offset; display
 * formatting (NZDT) lives in the UI layer, never here.
 */

export type Role = 'CONTRACTOR' | 'OPERATIONS' | 'CUSTOMER_INFORMATION';

export const ROLES: Role[] = ['CONTRACTOR', 'OPERATIONS', 'CUSTOMER_INFORMATION'];

export const ROLE_LABELS: Record<Role, string> = {
  CONTRACTOR: 'Bus Contractor',
  OPERATIONS: 'AT Operations',
  CUSTOMER_INFORMATION: 'AT Customer Information',
};

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type OperationalStatus =
  | 'REPORTED'
  | 'VALIDATED'
  | 'ACTIVE'
  | 'RECOVERY_IN_PROGRESS'
  | 'RESTORED'
  | 'CLOSED';

export type CommunicationStatus =
  | 'NOT_REQUIRED'
  | 'REQUIRED'
  | 'DRAFT'
  | 'APPROVED'
  | 'PUBLISHED';

export type PassengerImpact = 'LOW' | 'MEDIUM' | 'HIGH';

export interface TimelineEvent {
  id: string;
  /** ISO-8601 timestamp (NZ offset). */
  at: string;
  actorRole: Role | 'SYSTEM';
  action: string;
  detail: string;
}

export interface CorrectiveAction {
  id: string;
  action: string;
  owner: string;
  /** ISO date (yyyy-mm-dd). */
  dueDate: string;
  status: 'OPEN' | 'DONE';
}

export interface Incident {
  id: string;
  route: string;
  operator: string;
  vehicleOrServiceId: string;
  location: string;
  disruptionType: string;
  description: string;
  /** ISO-8601: disruption noticed. */
  detectedAt: string;
  /** ISO-8601: AT acknowledged. KPI clock starts here. Null until validated. */
  confirmedAt: string | null;
  estimatedDelayMinutes: number;
  passengerImpact: PassengerImpact;
  majorInterchangeAffected: boolean;
  /** Final severity, set/confirmed by AT Operations. Null until assessed. */
  severity: Severity | null;
  severityScore: number | null;
  severityReason: string | null;
  severityOverrideReason: string | null;
  owner: string | null;
  operationalStatus: OperationalStatus;
  communicationStatus: CommunicationStatus;
  /** Parallel recovery track; independent of communicationStatus. */
  recoveryStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'RESTORED';
  estimatedRestorationAt: string | null;
  /** ISO-8601 actual restoration. */
  restoredAt: string | null;
  /** ISO-8601 first passenger publication. KPI clock stops here. */
  firstPublishedAt: string | null;
  selectedChannels: string[];
  reviewRequired: boolean;
  rootCause: string | null;
  correctiveActions: CorrectiveAction[];
  /** Append-only audit trail, displayed newest-first. */
  timeline: TimelineEvent[];
}
