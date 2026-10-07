import type { CommsDraft, Incident } from './types.js';
import { FIRST_COMM_TARGET_MS, firstCommunicationKpi } from './kpi.js';

/**
 * Passenger communication drafting — templates, channels and validation.
 * Publishing itself is a store action (records firstPublishedAt + audit).
 * First-publication KPI model: the first publish stops the 10-minute clock;
 * follow-up publishes never reset firstPublishedAt.
 */

/** Prototype publication channels (illustrative — no live channel connected). */
export const CHANNELS = ['AT Mobile App', 'Website', 'Social Media'] as const;

export type Channel = (typeof CHANNELS)[number];

/** Legacy label map for demo states persisted before the rename. */
const LEGACY_CHANNEL_ALIASES: Record<string, Channel> = {
  'AT website': 'Website',
  'Station info displays': 'Social Media',
};

export function normalizeChannel(value: string): Channel | null {
  if ((CHANNELS as readonly string[]).includes(value)) return value as Channel;
  return LEGACY_CHANNEL_ALIASES[value] ?? null;
}

export function isChannel(value: string): value is Channel {
  return normalizeChannel(value) !== null;
}

/** Prefilled title derived from incident facts (editable). */
export function buildTitle(incident: Incident): string {
  return `Route ${incident.route} Service Disruption`;
}

function shortLocation(location: string): string {
  const cut = location.split('—')[0]?.trim() ?? location;
  return cut.length > 40 ? `${cut.slice(0, 40)}…` : cut;
}

/** Prefilled message derived from incident facts (editable, plain language). */
export function buildMessageTemplate(incident: Incident): string {
  return (
    `Route ${incident.route} services are currently experiencing delays near ` +
    `${shortLocation(incident.location)} due to ${lowerFirst(incident.disruptionType)}. ` +
    `Please allow additional travel time while we work with the operator to restore ` +
    `normal services.`
  );
}

function lowerFirst(value: string): string {
  const t = value.trim();
  return t.length === 0 ? t : t.charAt(0).toLowerCase() + t.slice(1);
}

export interface DraftInput {
  title: string;
  message: string;
  channels: string[];
  nextUpdateBy: string;
  commitmentOwner: string;
}

export type DraftErrors = Partial<Record<keyof DraftInput, string>>;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateDraft(input: DraftInput): DraftErrors {
  const errors: DraftErrors = {};
  if (input.title.trim().length < 10) errors.title = 'Title needs at least 10 characters.';
  if (input.message.trim().length < 20) errors.message = 'Message needs at least 20 characters.';
  if (input.channels.length === 0) errors.channels = 'Select at least one publication channel.';
  if (input.nextUpdateBy.trim() !== '' && !TIME_RE.test(input.nextUpdateBy.trim())) {
    errors.nextUpdateBy = 'Enter the next-update commitment in HH:MM format, or leave blank.';
  }
  if (input.commitmentOwner.trim().length === 0) {
    errors.commitmentOwner = 'Commitment owner is required.';
  }
  return errors;
}

export function toCommsDraft(input: DraftInput, updatedAt: string): CommsDraft {
  const channels: Channel[] = [];
  for (const c of input.channels) {
    const normalized = normalizeChannel(c);
    if (normalized !== null && !channels.includes(normalized)) channels.push(normalized);
  }
  return {
    title: input.title.trim(),
    message: input.message.trim(),
    channels,
    nextUpdateBy: input.nextUpdateBy.trim(),
    commitmentOwner: input.commitmentOwner.trim(),
    updatedAt,
  };
}

/**
 * Comms queue: validated AND severity-assessed incidents still needing their
 * first publication. REPORTED records (and validated records awaiting AT
 * severity assessment) are not yet ready for passenger publication.
 */
export function needsFirstPublication(incident: Incident): boolean {
  return (
    incident.communicationStatus !== 'PUBLISHED' &&
    incident.communicationStatus !== 'NOT_REQUIRED' &&
    incident.operationalStatus !== 'REPORTED' &&
    incident.operationalStatus !== 'CLOSED' &&
    incident.severity !== null
  );
}

/** Validated records waiting on AT severity assessment (queue-blocked). */
export function awaitingSeverityAssessment(incident: Incident): boolean {
  return (
    incident.severity === null &&
    incident.operationalStatus !== 'REPORTED' &&
    incident.operationalStatus !== 'CLOSED' &&
    incident.communicationStatus !== 'PUBLISHED' &&
    incident.communicationStatus !== 'NOT_REQUIRED'
  );
}

/** Incidents still needing a first passenger update (overview KPI). */
export function awaitingFirstUpdate(incidents: Incident[]): Incident[] {
  return incidents.filter(needsFirstPublication);
}

/** Longest-running unpublished communication timer, in ms. Null when none. */
export function oldestCountingElapsedMs(incidents: Incident[], nowIso?: string): number | null {
  let oldest: number | null = null;
  for (const i of incidents) {
    const kpi = firstCommunicationKpi(i, nowIso);
    if (kpi.state === 'COUNTING' && kpi.elapsedMs !== null) {
      oldest = oldest === null ? kpi.elapsedMs : Math.max(oldest, kpi.elapsedMs);
    }
  }
  return oldest;
}

export interface CommunicationCoverage {
  published: number;
  inScope: number;
  /** Share of in-scope incidents published, 0–100. Null when nothing in scope. */
  pct: number | null;
}

/** Share of communication in-scope incidents already published (derived). */
export function communicationCoverage(incidents: Incident[]): CommunicationCoverage {
  const inScope = incidents.filter(
    (i) =>
      i.communicationStatus !== 'NOT_REQUIRED' && i.operationalStatus !== 'REPORTED',
  );
  const published = inScope.filter((i) => i.communicationStatus === 'PUBLISHED').length;
  return {
    published,
    inScope: inScope.length,
    pct: inScope.length === 0 ? null : Math.round((published / inScope.length) * 100),
  };
}

/** Fraction of the 10-minute target consumed (0–1, clamped) for progress bars. */
export function targetProgress(elapsedMs: number | null): number {
  if (elapsedMs === null) return 0;
  return Math.min(1, Math.max(0, elapsedMs / FIRST_COMM_TARGET_MS));
}
