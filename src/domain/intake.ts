import { defaultRecoveryTasks, OWNER_ROSTER } from './operations.js';
import { assessSeverity } from './severity.js';
import type { Incident, PassengerImpact, SapCandidate, SapLink, TimelineEvent } from './types.js';

/**
 * SAP intake domain — enriching a SAP EHS source candidate into a linked
 * AT shared incident (Figma "05 SAP Integration"). SAP fields stay
 * read-only; AT operational fields are added by the enrichment form.
 * Enrichment never creates a second incident for the same candidate.
 */

export interface EnrichInput {
  route: string;
  operator: string;
  vehicleOrServiceId: string;
  estimatedDelayMinutes: string;
  passengerImpact: '' | PassengerImpact;
  majorInterchangeAffected: boolean;
  notes: string;
}

export const EMPTY_ENRICH: EnrichInput = {
  route: '',
  operator: '',
  vehicleOrServiceId: '',
  estimatedDelayMinutes: '',
  passengerImpact: '',
  majorInterchangeAffected: false,
  notes: '',
};

export type EnrichErrors = Partial<
  Record<'route' | 'operator' | 'estimatedDelayMinutes' | 'passengerImpact', string>
>;

/** Figma asterisks: Route, Operator, Delay and Impact are required. */
export function validateEnrichment(input: EnrichInput): EnrichErrors {
  const errors: EnrichErrors = {};
  if (input.route.trim() === '') errors.route = 'Route is required.';
  if (input.operator.trim() === '') errors.operator = 'Bus operator is required.';
  const delay = Number.parseInt(input.estimatedDelayMinutes, 10);
  if (input.estimatedDelayMinutes.trim() === '' || !Number.isFinite(delay) || delay <= 0) {
    errors.estimatedDelayMinutes = 'Enter an estimated delay in minutes.';
  }
  if (input.passengerImpact === '') errors.passengerImpact = 'Passenger impact is required.';
  return errors;
}

import { disruptionTypeFor, dummyScenarioFor } from './sapAutoScenarios.js';
export {
  dummyScenarioFor,
  disruptionTypeFor,
  type AutoScenario,
} from './sapAutoScenarios.js';

/**
 * Fully automatic enrichment — no form, no clicks. Real SAP text wins
 * where it exists (route/delay mentions, location); everything else comes
 * from the deterministic dummy scenario for the SAP ID, so rows never
 * render blank. Operator is always the SAP import identity so contractor
 * views stay clean.
 */
export function autoEnrichInput(sap: SapCandidate, at: string): EnrichInput {
  const scenario = dummyScenarioFor(sap.sapId);
  const hay = `${sap.title} ${sap.description} ${sap.locationDescription}`;
  const route = /route\s*([A-Za-z0-9]+)/i.exec(hay)?.[1] ?? scenario.route;
  const delay = /(\d+)\s*min/i.exec(hay)?.[1] ?? scenario.estimatedDelayMinutes;
  const passengerImpact: EnrichInput['passengerImpact'] = /high/i.test(hay)
    ? 'HIGH'
    : /low/i.test(hay)
      ? 'LOW'
      : scenario.passengerImpact;
  return {
    route,
    operator: 'SAP EHS Import',
    vehicleOrServiceId: '',
    estimatedDelayMinutes: delay,
    passengerImpact,
    majorInterchangeAffected: /interchange/i.test(`${hay} ${scenario.location}`),
    notes: `${sap.description} Auto-created from SAP ${sap.sapId} on ${at.slice(0, 10)} — dummy operational fields, awaiting AT severity assessment and owner assignment.`,
  };
}

export function sapLinkOf(sap: SapCandidate, syncedAt: string): SapLink {  return {
    sapId: sap.sapId,
    sapUuid: sap.sapUuid,
    title: sap.title,
    sapStatus: sap.sapStatus,
    category: sap.category,
    locationDescription: sap.locationDescription,
    syncedAt,
  };
}

/**
 * Builds the linked AT incident. Enrichment by AT Operations counts as
 * acceptance: the record starts VALIDATED (KPI clock running) so the
 * next step is severity assessment — no duplicate incident is created.
 */
export function buildLinkedIncident(
  sap: SapCandidate,
  input: EnrichInput,
  id: string,
  at: string,
  auto = false,
): Incident {
  const delay = Number.parseInt(input.estimatedDelayMinutes, 10);
  const description =
    input.notes.trim() === '' ? sap.description : input.notes.trim();
  return {
    id,
    route: input.route.trim(),
    operator: input.operator.trim(),
    vehicleOrServiceId:
      input.vehicleOrServiceId.trim() || `${input.route.trim()} service · vehicle unknown`,
    location: sap.locationDescription,
    disruptionType: sap.title,
    description,
    detectedAt: sap.receivedAt,
    confirmedAt: at,
    estimatedDelayMinutes: delay,
    passengerImpact: input.passengerImpact as PassengerImpact,
    majorInterchangeAffected: input.majorInterchangeAffected,
    serviceContinues: null,
    severity: null,
    severityScore: null,
    severityReason: null,
    severityOverrideReason: null,
    owner: null,
    operationalStatus: 'VALIDATED',
    communicationStatus: 'REQUIRED',
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
    sapLink: sapLinkOf(sap, at),
    timeline: [
      {
        id: `evt-${id}-saplink`,
        at,
        actorRole: 'OPERATIONS',
        action: 'SAP record attached',
        detail: `SAP ${sap.sapId} (${sap.title}) attached as supporting information.`,
      },
      {
        id: `evt-${id}-validate`,
        at,
        actorRole: 'OPERATIONS',
        action: 'Notification validated and accepted',
        detail: auto
          ? 'SAP intake auto-linked and accepted — communication KPI clock started.'
          : 'AT Operations enriched and accepted the SAP intake — communication KPI clock started.',
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Archived SAP incidents                                               */
/* ------------------------------------------------------------------ */

/**
 * Deterministic hash shared by scenario selection and archive variety,
 * so the same SAP ID always yields the same archive record.
 */
function hashId(sapId: string): number {
  let hash = 0;
  for (let i = 0; i < sapId.length; i += 1) hash = (hash + sapId.charCodeAt(i)) >>> 0;
  return hash;
}

/** Shift an NZ ISO timestamp by minutes, keeping the +13:00 NZDT offset. */
function shiftNzdt(iso: string, minutes: number): string {
  const d = new Date(Date.parse(iso) + minutes * 60000);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Pacific/Auckland',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (t: string): string => parts.find((p) => p.type === t)?.value ?? '00';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}:00+13:00`;
}

function rootCauseFor(disruptionType: string): string {
  const t = disruptionType.toLowerCase();
  if (t.includes('breakdown')) return 'Vehicle mechanical failure';
  if (t.includes('blocked')) return 'Unplanned road obstruction';
  if (t.includes('unavailable')) return 'Standby vehicle shortfall';
  if (t.includes('congestion')) return 'Peak-period traffic congestion';
  return 'Routine check finding';
}

function correctiveFor(disruptionType: string): string {
  const t = disruptionType.toLowerCase();
  if (t.includes('breakdown')) return 'Review operator early-notification procedure';
  if (t.includes('blocked')) return 'Review diversion signage plan';
  if (t.includes('unavailable')) return 'Review standby fleet availability';
  if (t.includes('congestion')) return 'Review peak timetable adherence';
  return 'Review depot reporting procedure';
}

/**
 * Builds a complete CLOSED archive incident from a SAP seed candidate.
 * Fully deterministic (same SAP ID → same record): severity comes from the
 * real assessSeverity rules, timestamps stagger from receivedAt, and every
 * value is coherent demo data explicitly labelled synthetic via sapLink +
 * timeline. Archives never enter contractor views (operator is
 * 'SAP EHS Import' and the timeline carries no contractor-submit event)
 * and never disturb live KPIs (CLOSED + published ⇒ excluded from active
 * and awaiting counts; publication times are all within target).
 */
export function buildArchivedIncident(sap: SapCandidate, id: string): Incident {
  const hash = hashId(sap.sapId);
  const scenario = dummyScenarioFor(sap.sapId);
  const disruptionType = disruptionTypeFor(sap.title, scenario);
  const delay = Number.parseInt(scenario.estimatedDelayMinutes, 10);
  const interchange = /interchange/i.test(`${sap.title} ${sap.description} ${scenario.location}`);
  const serviceContinues = !/breakdown|blocked/i.test(disruptionType);

  const assessment = assessSeverity({
    estimatedDelayMinutes: delay,
    passengerImpact: scenario.passengerImpact,
    majorInterchangeAffected: interchange,
    disruptionType,
    recoveryActionRequired: true,
  });

  const owner = OWNER_ROSTER[hash % OWNER_ROSTER.length];
  const receivedAt = sap.receivedAt;
  const confirmedAt = shiftNzdt(receivedAt, 3);
  const severityAt = shiftNzdt(receivedAt, 5);
  const ownerAt = shiftNzdt(receivedAt, 6);
  const publishLagMin = 6 + (hash % 4);
  const publishedAt = shiftNzdt(confirmedAt, publishLagMin);
  const restoreAt = shiftNzdt(confirmedAt, 38 + (hash % 3) * 4);
  const reviewAt = shiftNzdt(restoreAt, 8);
  const correctiveAt = shiftNzdt(restoreAt, 9);
  const reviewStartAt = shiftNzdt(restoreAt, 10);
  const correctiveDoneAt = shiftNzdt(restoreAt, 25);
  const closedAt = shiftNzdt(restoreAt, 30);

  const tasks = defaultRecoveryTasks();
  const taskOffsets = [8, 12, 16, 20];
  const tasksDone = tasks.map((t, i) => ({
    ...t,
    doneAt: i < taskOffsets.length ? shiftNzdt(confirmedAt, taskOffsets[i]) : restoreAt,
  }));

  const rootCause = rootCauseFor(disruptionType);
  const correctiveAction = correctiveFor(disruptionType);
  const dueDate = shiftNzdt(restoreAt, 24 * 60).slice(0, 10);
  const rationale = assessment.factors.join('; ');
  const place = scenario.location.split('—')[0].trim();
  const busNo = 2100 + (hash % 800);

  const draft = {
    title: `Route ${scenario.route} ${/blocked|no service/i.test(disruptionType) ? 'suspended' : 'delays'} — ${place}`,
    message:
      `Route ${scenario.route} services were disrupted near ${place} due to ${disruptionType.charAt(0).toLowerCase() + disruptionType.slice(1)}. ` +
      `Normal service has since been restored. Thank you for your patience.`,
    channels: ['AT Mobile App', 'Website'],
    nextUpdateBy: shiftNzdt(publishedAt, 15).slice(11, 16),
    updatedAt: publishedAt,
  };

  const ev = (
    at: string,
    actorRole: 'OPERATIONS' | 'CUSTOMER_INFORMATION',
    action: string,
    detail: string,
    n: number,
  ): TimelineEvent => ({ id: `evt-${id}-arc${n}`, at, actorRole, action, detail });

  return {
    id,
    route: scenario.route,
    operator: 'SAP EHS Import',
    vehicleOrServiceId: `Bus ${busNo} · Route ${scenario.route}`,
    location: scenario.location,
    disruptionType,
    description: `${draft.title}. ${sap.description} Archived SAP intake record — all operational fields are coherent demo data.`,
    detectedAt: receivedAt,
    confirmedAt,
    estimatedDelayMinutes: delay,
    passengerImpact: scenario.passengerImpact,
    majorInterchangeAffected: interchange,
    serviceContinues,
    severity: assessment.level,
    severityScore: assessment.score,
    severityReason: rationale,
    severityOverrideReason: null,
    owner,
    operationalStatus: 'CLOSED',
    communicationStatus: 'PUBLISHED',
    recoveryStatus: 'RESTORED',
    recoveryTasks: tasksDone,
    commsDraft: draft,
    infoRequested: false,
    estimatedRestorationAt: shiftNzdt(restoreAt, -8),
    restoredAt: restoreAt,
    firstPublishedAt: publishedAt,
    selectedChannels: ['AT Mobile App', 'Website'],
    reviewRequired: true,
    rootCause,
    correctiveActions: [
      { id: `ca-${id}-1`, action: correctiveAction, owner, dueDate, status: 'DONE' },
    ],
    reviewStatus: 'IN_PROGRESS',
    closureNotes: 'Service restored and verified; review completed with corrective action closed.',
    sapLink: sapLinkOf(sap, publishedAt),
    timeline: [
      ev(closedAt, 'OPERATIONS', 'Incident closed', `Service restored ${restoreAt}; review required; 0 follow-up actions remain open.`, 11),
      ev(correctiveDoneAt, 'OPERATIONS', 'Corrective action completed', correctiveAction, 10),
      ev(reviewStartAt, 'OPERATIONS', 'Post-incident review started', 'Review tracks learning and follow-through separately from service recovery.', 9),
      ev(correctiveAt, 'OPERATIONS', 'Corrective action recorded', `${correctiveAction} — ${owner}, due ${dueDate}.`, 8),
      ev(reviewAt, 'OPERATIONS', 'Review details recorded', `Root cause: ${rootCause} — review required.`, 7),
      ev(restoreAt, 'OPERATIONS', 'Service restored', `All recovery tasks complete — normal service restored at ${restoreAt}, verified with operator.`, 6),
      ev(publishedAt, 'CUSTOMER_INFORMATION', 'Initial passenger update published', `${publishLagMin} min from confirmation — target met.`, 5),
      ev(ownerAt, 'OPERATIONS', 'Active management started', 'Severity and owner confirmed — recovery and comms tracks open in parallel.', 4),
      ev(ownerAt, 'OPERATIONS', 'Incident owner assigned', `${owner} accepted accountability through restoration and closure.`, 3),
      ev(severityAt, 'OPERATIONS', `Severity confirmed: ${assessment.level}`, `Calculated ${assessment.level} (score ${assessment.score}). ${rationale}`, 2),
      ev(confirmedAt, 'OPERATIONS', 'Notification validated and accepted', 'Operations accepted the notification — response timer started.', 1),
      ev(receivedAt, 'OPERATIONS', 'SAP record attached', `SAP ${sap.sapId} (${sap.title}) attached as supporting information.`, 0),
    ],
  };
}
