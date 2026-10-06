import { defaultRecoveryTasks } from './operations.js';
import type { Incident, PassengerImpact } from './types.js';

/**
 * Contractor reporting — validation + factory for new disruption
 * notifications. Pure domain logic; the form collects strings, this
 * module validates and builds the shared Incident record.
 *
 * A created incident is REPORTED (awaiting AT validation), severity
 * unset, KPI clock not started. Creating it does NOT send passenger
 * communications (communicationStatus starts at REQUIRED).
 */

export interface ReportInput {
  operator: string;
  route: string;
  direction: string;
  location: string;
  locationDetail: string;
  /** yyyy-mm-dd */
  onsetDate: string;
  /** HH:MM (24h) */
  onsetTime: string;
  disruptionType: string;
  serviceImpact: string;
  facts: string;
  vehicleOrServiceId: string;
  /** Raw form value; parsed to integer minutes. */
  estimatedDelayMinutes: string;
  passengerImpact: '' | PassengerImpact;
  majorInterchangeAffected: boolean;
  sourceReference: string;
}

export const EMPTY_REPORT: ReportInput = {
  operator: 'Demo Bus Operator',
  route: '',
  direction: '',
  location: '',
  locationDetail: '',
  onsetDate: '2026-10-06',
  onsetTime: '',
  disruptionType: '',
  serviceImpact: '',
  facts: '',
  vehicleOrServiceId: '',
  estimatedDelayMinutes: '',
  passengerImpact: '',
  majorInterchangeAffected: false,
  sourceReference: '',
};

/** One-click demo values matching docs/DEMO_SCENARIO.md (Route 70). */
export const ROUTE_70_DEMO_VALUES: ReportInput = {
  ...EMPTY_REPORT,
  route: '70',
  direction: 'Citybound',
  location: 'Newmarket — Broadway near Newmarket interchange',
  locationDetail: 'Affected bus stopped in a safe position; citybound service affected.',
  onsetTime: '09:02',
  disruptionType: 'Vehicle breakdown',
  serviceImpact: 'Delay / vehicle out of service',
  facts:
    'Route 70 citybound bus suffered a mechanical breakdown near Newmarket. Passengers transferred to a following service; replacement vehicle requested. Restoration time not confirmed.',
  vehicleOrServiceId: 'Bus 2147 · Route 70 citybound',
  estimatedDelayMinutes: '25',
  passengerImpact: 'HIGH',
  majorInterchangeAffected: true,
  sourceReference: 'Demo operator · radio report D-70',
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

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function required(value: string): boolean {
  return value.trim().length > 0;
}

export function validateReport(input: ReportInput): ReportErrors {
  const errors: ReportErrors = {};
  if (!required(input.operator)) errors.operator = 'Reporting operator is required.';
  if (!required(input.route)) errors.route = 'Affected route is required.';
  if (!required(input.direction)) errors.direction = 'Direction is required.';
  if (!required(input.location)) errors.location = 'Location / road is required.';
  if (!DATE_RE.test(input.onsetDate)) errors.onsetDate = 'Enter a valid onset date.';
  if (!TIME_RE.test(input.onsetTime)) errors.onsetTime = 'Enter a valid time in HH:MM format.';
  if (!required(input.disruptionType)) errors.disruptionType = 'Select the best disruption type.';
  if (!required(input.serviceImpact)) errors.serviceImpact = 'Service impact is required.';
  if (input.facts.trim().length < 10) {
    errors.facts = 'Confirmed operational facts need at least 10 characters.';
  }
  if (input.estimatedDelayMinutes.trim() === '') {
    errors.estimatedDelayMinutes = 'Estimated delay is required (enter 0 if none).';
  } else {
    const n = Number(input.estimatedDelayMinutes);
    if (!Number.isInteger(n) || n < 0 || n > 300) {
      errors.estimatedDelayMinutes = 'Enter whole minutes between 0 and 300.';
    }
  }
  if (input.passengerImpact === '') errors.passengerImpact = 'Passenger impact is required.';
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
  const detectedAt = `${input.onsetDate}T${input.onsetTime}:00+13:00`;
  const description =
    input.locationDetail.trim().length > 0
      ? `${input.facts.trim()}\nLocation detail: ${input.locationDetail.trim()}`
      : input.facts.trim();

  return {
    id,
    route: input.route.trim(),
    operator: input.operator.trim(),
    vehicleOrServiceId:
      input.vehicleOrServiceId.trim() || `${input.route.trim()} service · vehicle unknown`,
    location: input.location.trim(),
    disruptionType: input.disruptionType,
    description,
    detectedAt,
    confirmedAt: null,
    estimatedDelayMinutes: delay,
    passengerImpact: input.passengerImpact as PassengerImpact,
    majorInterchangeAffected: input.majorInterchangeAffected,
    severity: null,
    severityScore: null,
    severityReason: null,
    severityOverrideReason: null,
    owner: null,
    operationalStatus: 'REPORTED',
    communicationStatus: 'REQUIRED',
    recoveryStatus: 'NOT_STARTED',
    recoveryTasks: defaultRecoveryTasks(),
    commsDraft: null,
    estimatedRestorationAt: null,
    restoredAt: null,
    firstPublishedAt: null,
    selectedChannels: [],
    reviewRequired: false,
    rootCause: null,
    correctiveActions: [],
    timeline: [
      {
        id: `evt-${id}-submit`,
        at: detectedAt,
        actorRole: 'CONTRACTOR',
        action: 'Operator submitted initial disruption notification',
        detail: `${input.operator.trim()} — Route ${input.route.trim()} ${input.direction}, ${input.disruptionType}, ${delay}-min estimated delay.`,
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
