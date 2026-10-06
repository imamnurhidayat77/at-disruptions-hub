import type { CommsDraft, Incident } from './types.js';

/**
 * Passenger communication drafting — templates, channels and validation.
 * Publishing itself is a store action (records firstPublishedAt + audit).
 * Single-publication prototype model: the first publish stops the KPI clock.
 */

export const CHANNELS = [
  'AT Mobile App',
  'AT website',
  'Station info displays',
] as const;

export type Channel = (typeof CHANNELS)[number];

export function isChannel(value: string): value is Channel {
  return (CHANNELS as readonly string[]).includes(value);
}

/** Prefilled title derived from incident facts (editable). */
export function buildTitle(incident: Incident): string {
  return `Route ${incident.route} delays — ${shortLocation(incident.location)}`;
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
    `normal services. We do not yet have a confirmed restoration time.`
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
  if (!TIME_RE.test(input.nextUpdateBy.trim())) {
    errors.nextUpdateBy = 'Enter the next-update commitment in HH:MM format.';
  }
  if (input.commitmentOwner.trim().length === 0) {
    errors.commitmentOwner = 'Commitment owner is required.';
  }
  return errors;
}

export function toCommsDraft(input: DraftInput, updatedAt: string): CommsDraft {
  return {
    title: input.title.trim(),
    message: input.message.trim(),
    channels: input.channels.filter(isChannel),
    nextUpdateBy: input.nextUpdateBy.trim(),
    commitmentOwner: input.commitmentOwner.trim(),
    updatedAt,
  };
}

/** Comms queue: validated incidents still needing their first publication. */
export function needsFirstPublication(incident: Incident): boolean {
  return (
    incident.communicationStatus !== 'PUBLISHED' &&
    incident.communicationStatus !== 'NOT_REQUIRED' &&
    incident.operationalStatus !== 'REPORTED' &&
    incident.operationalStatus !== 'CLOSED'
  );
}
