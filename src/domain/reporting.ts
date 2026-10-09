import { defaultRecoveryTasks } from './operations.js';
import type { Incident, PassengerImpact } from './types.js';

/**
 * Contractor reporting — validation + factory for new disruption
 * notifications (Figma "02 Bus Contractor" 3-step wizard). Pure domain
 * logic; the form collects strings, this module validates and builds
 * the shared Incident record.
 *
 * A created incident is REPORTED (awaiting AT validation), severity
 * unset, KPI clock not started. Creating it does NOT send passenger
 * communications (communicationStatus starts at REQUIRED).
 */

export interface ReportInput {
  /** Read-only in the Figma form: the demo operator. */
  operator: string;
  route: string;
  vehicleOrServiceId: string;
  location: string;
  disruptionType: string;
  /** 'YYYY-MM-DDTHH:MM' from the detection-time picker. */
  detectedAt: string;
  /** Figma "Can Service Continue?" — Yes/No/''. */
  serviceContinues: '' | 'yes' | 'no';
  /** Raw form value; parsed to integer minutes. */
  estimatedDelayMinutes: string;
  passengerImpact: '' | PassengerImpact;
  majorInterchangeAffected: boolean;
  description: string;
}

export const EMPTY_REPORT: ReportInput = {
  operator: 'City Bus Operator',
  route: '',
  vehicleOrServiceId: '',
  location: '',
  disruptionType: '',
  detectedAt: '',
  serviceContinues: '',
  estimatedDelayMinutes: '',
  passengerImpact: '',
  majorInterchangeAffected: false,
  description: '',
};

/** One-click demo values (Route 70). */
export const ROUTE_70_DEMO_VALUES: ReportInput = {
  ...EMPTY_REPORT,
  route: '70',
  vehicleOrServiceId: 'BUS-070',
  location: 'Newmarket',
  disruptionType: 'Vehicle breakdown',
  detectedAt: '2026-10-06T09:02',
  serviceContinues: 'no',
  estimatedDelayMinutes: '25',
  passengerImpact: 'HIGH',
  majorInterchangeAffected: true,
  description:
    'Vehicle breakdown near Newmarket. Route 70 service cannot continue. Replacement vehicle required; passengers are experiencing an estimated 25-minute delay.',
};

export const DISRUPTION_TYPES = [
  'Vehicle breakdown',
  'Vehicle unavailable',
  'Road blocked — no service',
  'Service delays',
  'Stop temporarily unavailable',
  'Other (describe in facts)',
];

export const SERVICE_IMPACTS = [
  'Delay / vehicle out of service',
  'No service — both directions',
  'No service — one direction',
  'Delays across multiple trips',
  'Stop closure only',
];

export type ReportErrors = Partial<Record<keyof ReportInput, string>>;

export function validateReport(input: ReportInput): ReportErrors {
  const errors: ReportErrors = {};
  if (input.route.trim() === '') errors.route = 'Route is required.';
  if (input.location.trim() === '') errors.location = 'Location is required.';
  if (input.disruptionType.trim() === '') errors.disruptionType = 'Disruption type is required.';
  if (input.detectedAt.trim() === '' || Number.isNaN(Date.parse(input.detectedAt))) {
    errors.detectedAt = 'Detection time is required.';
  }
  if (input.serviceContinues === '') errors.serviceContinues = 'Select whether service can continue.';
  if (input.estimatedDelayMinutes.trim() === '') {
    errors.estimatedDelayMinutes = 'Estimated delay is required (enter 0 if none).';
  } else {
    const n = Number(input.estimatedDelayMinutes);
    if (!Number.isInteger(n) || n < 0 || n > 300) {
      errors.estimatedDelayMinutes = 'Enter whole minutes between 0 and 300.';
    }
  }
  if (input.passengerImpact === '') errors.passengerImpact = 'Passenger impact is required.';
  if (input.description.trim().length < 10) {
    errors.description = 'Description needs at least 10 characters.';
  }
  return errors;
}

/** Step 1 (Incident Details) fields only. */
export function validateReportStep1(input: ReportInput): ReportErrors {
  const errors: ReportErrors = {};
  if (input.route.trim() === '') errors.route = 'Route is required.';
  if (input.location.trim() === '') errors.location = 'Location is required.';
  if (input.disruptionType.trim() === '') errors.disruptionType = 'Disruption type is required.';
  if (input.detectedAt.trim() === '' || Number.isNaN(Date.parse(input.detectedAt))) {
    errors.detectedAt = 'Detection time is required.';
  }
  return errors;
}

/** Step 2 (Service Impact) fields only. */
export function validateReportStep2(input: ReportInput): ReportErrors {
  const errors: ReportErrors = {};
  if (input.serviceContinues === '') errors.serviceContinues = 'Select whether service can continue.';
  if (input.estimatedDelayMinutes.trim() === '') {
    errors.estimatedDelayMinutes = 'Estimated delay is required (enter 0 if none).';
  } else {
    const n = Number(input.estimatedDelayMinutes);
    if (!Number.isInteger(n) || n < 0 || n > 300) {
      errors.estimatedDelayMinutes = 'Enter whole minutes between 0 and 300.';
    }
  }
  if (input.passengerImpact === '') errors.passengerImpact = 'Passenger impact is required.';
  if (input.description.trim().length < 10) {
    errors.description = 'Description needs at least 10 characters.';
  }
  return errors;
}

export function isValidReport(input: ReportInput): boolean {
  return Object.keys(validateReport(input)).length === 0;
}

/** Next canonical ID (INC-1044, …) derived from existing records. */
export function nextIncidentId(existing: Incident[]): string {
  let max = 1042;
  for (const i of existing) {
    const m = /^INC-(\d+)$/.exec(i.id);
    if (m) max = Math.max(max, Number.parseInt(m[1], 10));
  }
  return `INC-${max + 1}`;
}

/**
 * Build the shared record for a validated report. Assumes validateReport
 * passed (defensive parsing still applied).
 */
export function buildReportedIncident(input: ReportInput, id: string): Incident {
  const delay = Math.max(0, Math.min(300, Number.parseInt(input.estimatedDelayMinutes, 10) || 0));
  const detectedAt = `${input.detectedAt}:00+13:00`;

  return {
    id,
    route: input.route.trim(),
    operator: input.operator.trim(),
    vehicleOrServiceId:
      input.vehicleOrServiceId.trim() || `${input.route.trim()} service · vehicle unknown`,
    location: input.location.trim(),
    disruptionType: input.disruptionType,
    description: input.description.trim(),
    detectedAt,
    confirmedAt: null,
    estimatedDelayMinutes: delay,
    passengerImpact: input.passengerImpact as PassengerImpact,
    majorInterchangeAffected: input.majorInterchangeAffected,
    serviceContinues: input.serviceContinues === '' ? null : input.serviceContinues === 'yes',
    severity: null,
    severityScore: null,
    severityReason: null,
    severityOverrideReason: null,
    owner: null,
    operationalStatus: 'REPORTED',
    communicationStatus: 'NOT_REQUIRED',
    recoveryStatus: 'NOT_STARTED',
    recoveryTasks: defaultRecoveryTasks(),
    commsDraft: null,
    infoRequested: false,
    estimatedRestorationAt: null,
    restoredAt: null,
    firstPublishedAt: null,
    selectedChannels: [],
    reviewRequired: false,
    rootCause: null,
    correctiveActions: [],
    reviewStatus: 'OPEN',
    closureNotes: null,
    sapLink: null,
    timeline: [
      {
        id: `evt-${id}-submit`,
        at: detectedAt,
        actorRole: 'CONTRACTOR',
        action: 'Operator submitted initial disruption notification',
        detail: `${input.operator.trim()} — Route ${input.route.trim()}, ${input.disruptionType}, ${delay}-min estimated delay.`,
      },
    ],
  };
}

export interface OperatorUpdateInput {
  detail: string;
  /** '' means leave the estimate unchanged. */
  estimatedDelayMinutes: string;
}

export interface OperatorUpdateErrors {
  detail?: string;
  estimatedDelayMinutes?: string;
}

export function validateOperatorUpdate(input: OperatorUpdateInput): OperatorUpdateErrors {
  const errors: OperatorUpdateErrors = {};
  if (input.detail.trim().length < 10) {
    errors.detail = 'Describe the confirmed update (at least 10 characters).';
  }
  if (input.estimatedDelayMinutes.trim() !== '') {
    const n = Number(input.estimatedDelayMinutes);
    if (!Number.isInteger(n) || n < 0 || n > 300) {
      errors.estimatedDelayMinutes = 'Enter whole minutes between 0 and 300, or leave blank.';
    }
  }
  return errors;
}
