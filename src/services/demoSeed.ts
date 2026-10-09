import { defaultRecoveryTasks } from '../domain/operations.js';
import { assessSeverity } from '../domain/severity.js';
import type { Incident, SapCandidate } from '../domain/types.js';

/**
 * Controlled demo seed data. Explicitly synthetic — never presented as
 * SAP or live operational data. The canonical demo incident is INC-1043
 * (Route 70, Newmarket, vehicle breakdown); two background incidents give
 * the queue/KPI derivations realistic variety in later phases.
 */

const DEMO_DATE = '2026-10-06';
// NZDT (UTC+13 in October).
const at = (hhmm: string): string => `${DEMO_DATE}T${hhmm}:00+13:00`;

function baseTimelineSubmit(operator: string, detail: string) {
  return [
    {
      id: 'evt-seed-submit',
      at: at('09:02'),
      actorRole: 'CONTRACTOR' as const,
      action: 'Operator submitted initial disruption notification',
      detail: `${operator} — ${detail}`,
    },
  ];
}

function incident1043(): Incident {
  const assessment = assessSeverity({
    estimatedDelayMinutes: 25,
    passengerImpact: 'HIGH',
    majorInterchangeAffected: true,
    disruptionType: 'Vehicle breakdown',
    recoveryActionRequired: true,
  });
  // Seed invariant: the canonical demo must recommend HIGH.
  if (assessment.level !== 'HIGH') {
    throw new Error(`Demo seed invariant broken: INC-1043 assessed as ${assessment.level}`);
  }
  return {
    id: 'INC-1043',
    route: '70',
    operator: 'City Bus Operator',
    vehicleOrServiceId: 'Bus 2147 · Route 70 citybound',
    location: 'Newmarket — Broadway near Newmarket interchange',
    disruptionType: 'Vehicle breakdown',
    description:
      'Bus suffered a mechanical breakdown near Newmarket. Passengers transferred; replacement vehicle requested.',
    detectedAt: at('09:02'),
    confirmedAt: null,
    estimatedDelayMinutes: 25,
    passengerImpact: 'HIGH',
    majorInterchangeAffected: true,
    serviceContinues: false,
    // Not yet assessed by AT Operations — UI shows the live recommendation.
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
    timeline: baseTimelineSubmit(
      'City Bus Operator',
      'Route 70 breakdown, Newmarket, 25-min estimated delay, high passenger impact.',
    ),
  };
}

function incident1039(): Incident {
  return {
    id: 'INC-1039',
    route: '18',
    operator: 'City Bus Operator',
    vehicleOrServiceId: 'Bus 1180 · Route 18',
    location: 'Great North Road — both directions',
    disruptionType: 'Road blocked — no service',
    description: 'Road closure blocked all Route 18 services in both directions.',
    detectedAt: at('07:40'),
    confirmedAt: at('07:44'),
    estimatedDelayMinutes: 40,
    passengerImpact: 'HIGH',
    majorInterchangeAffected: true,
    serviceContinues: false,
    severity: 'CRITICAL',
    severityScore: 9,
    severityReason: 'Estimated delay 40 min (≥ 20 min); High passenger impact; Major interchange affected',
    severityOverrideReason: null,
    owner: 'L. Patel',
    operationalStatus: 'RECOVERY_IN_PROGRESS',
    communicationStatus: 'PUBLISHED',
    recoveryStatus: 'IN_PROGRESS',
    recoveryTasks: defaultRecoveryTasks().map((t) =>
      t.id === 'operator-contacted'
        ? { ...t, doneAt: at('07:50') }
        : t.id === 'replacement-requested'
          ? { ...t, doneAt: at('07:55') }
          : t,
    ),
    commsDraft: {
      title: 'Route 18 suspended — Great North Road',
      message:
        'Route 18 services are suspended in both directions near Great North Road due to a road closure. Please use alternative routes and allow additional travel time.',
      channels: ['AT Mobile App', 'Website'],
      nextUpdateBy: '08:15',
      updatedAt: at('07:51'),
    },
    infoRequested: false,
    estimatedRestorationAt: at('09:30'),
    restoredAt: null,
    firstPublishedAt: at('07:52'),
    selectedChannels: ['AT Mobile App', 'Website'],
    reviewRequired: false,
    rootCause: null,
    correctiveActions: [],
    reviewStatus: 'OPEN',
    closureNotes: null,
    sapLink: null,
    timeline: [
      {
        id: 'evt-1039-pub',
        at: at('07:52'),
        actorRole: 'CUSTOMER_INFORMATION',
        action: 'Initial passenger update published',
        detail: '8 min from confirmation — target met.',
      },
      {
        id: 'evt-1039-conf',
        at: at('07:44'),
        actorRole: 'OPERATIONS',
        action: 'Notification validated; severity CRITICAL; owner L. Patel',
        detail: 'Confirmed at 07:44 NZDT.',
      },
    ],
  };
}

function incident1041(): Incident {
  return {
    id: 'INC-1041',
    route: '22N',
    operator: 'City Bus Operator',
    vehicleOrServiceId: 'Bus 2203 · Route 22N citybound',
    location: 'New North Road — citybound',
    disruptionType: 'Vehicle unavailable',
    description: 'Scheduled vehicle unavailable; standby bus being arranged.',
    detectedAt: at('08:40'),
    confirmedAt: at('08:43'),
    estimatedDelayMinutes: 15,
    passengerImpact: 'MEDIUM',
    majorInterchangeAffected: false,
    serviceContinues: true,
    severity: 'MEDIUM',
    severityScore: 3,
    severityReason: 'Estimated delay 15 min (10–19 min); Medium passenger impact',
    severityOverrideReason: null,
    owner: 'J. Chen',
    operationalStatus: 'ACTIVE',
    communicationStatus: 'PUBLISHED',
    recoveryStatus: 'NOT_STARTED',
    recoveryTasks: defaultRecoveryTasks(),
    commsDraft: {
      title: 'Route 22N delays — New North Road',
      message:
        'Route 22N citybound services are delayed because a scheduled vehicle is unavailable. Please allow additional travel time while we arrange a standby bus. We do not yet have a confirmed restoration time.',
      channels: ['AT Mobile App', 'Website'],
      nextUpdateBy: '09:10',
      updatedAt: at('08:49'),
    },
    infoRequested: false,
    estimatedRestorationAt: at('09:30'),
    restoredAt: null,
    firstPublishedAt: at('08:50'),
    selectedChannels: ['AT Mobile App', 'Website'],
    reviewRequired: false,
    rootCause: null,
    correctiveActions: [],
    reviewStatus: 'OPEN',
    closureNotes: null,
    sapLink: null,
    timeline: [
      {
        id: 'evt-1041-pub',
        at: at('08:50'),
        actorRole: 'CUSTOMER_INFORMATION',
        action: 'Initial passenger update published',
        detail: '7 min from confirmation — target met.',
      },
      {
        id: 'evt-1041-conf',
        at: at('08:43'),
        actorRole: 'OPERATIONS',
        action: 'Notification validated; severity MEDIUM; owner J. Chen',
        detail: 'Confirmed at 08:43 NZDT.',
      },
    ],
  };
}

/** Fresh demo state: INC-1043 awaiting validation + two background records. */
export function buildDemoSeed(): Incident[] {
  return [incident1043(), incident1039(), incident1041()];
}

/**
 * SAP intake candidates (demo seed, explicitly synthetic). Figma "05 SAP
 * Integration": 5 SAP EHS source records reviewed as intake candidates.
 * Candidates never enter the AT workflow until enrichment creates a
 * linked shared incident — one shared incident record stays the source
 * of truth.
 */
export function buildSapSeed(): SapCandidate[] {
  return [
    {
      sapId: '123456',
      sapUuid: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      title: 'Vehicle breakdown near Newmarket',
      category: 'Technical Incident',
      sapStatus: 'Open',
      locationDescription: 'Newmarket',
      description: 'Vehicle failure reported near Newmarket.',
      receivedAt: at('09:02'),
      intakeRoute: 'SAP EHS intake',
      linkedIncidentId: null,
    },
    {
      sapId: '123457',
      sapUuid: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      title: 'Equipment fault',
      category: 'Equipment',
      sapStatus: 'Open',
      locationDescription: 'Depot workshop',
      description: 'Diagnostic equipment fault flagged by depot systems.',
      receivedAt: at('08:40'),
      intakeRoute: 'SAP EHS intake',
      linkedIncidentId: null,
    },
    {
      sapId: '123458',
      sapUuid: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      title: 'Facility inspection',
      category: 'Facility',
      sapStatus: 'In Process',
      locationDescription: 'Newmarket interchange',
      description: 'Scheduled facility inspection with a follow-up finding.',
      receivedAt: '2026-10-05T16:15:00+13:00',
      intakeRoute: 'SAP EHS intake',
      linkedIncidentId: null,
    },
    {
      sapId: '123459',
      sapUuid: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      title: 'Safety observation',
      category: 'Safety',
      sapStatus: 'Open',
      locationDescription: 'City depot',
      description: 'Safety observation raised during yard checks.',
      receivedAt: '2026-10-05T14:30:00+13:00',
      intakeRoute: 'SAP EHS intake',
      linkedIncidentId: null,
    },
    {
      sapId: '123460',
      sapUuid: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      title: 'Maintenance report',
      category: 'Maintenance',
      sapStatus: 'Closed',
      locationDescription: 'Depot workshop',
      description: 'Routine maintenance report already closed in SAP.',
      receivedAt: '2026-10-04T11:20:00+13:00',
      intakeRoute: 'SAP EHS intake',
      linkedIncidentId: null,
    },
  ];
}
