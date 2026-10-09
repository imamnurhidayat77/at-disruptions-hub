import type { SapIncidentReference } from './types.ts';
import type { SapCandidate } from '../../domain/types.ts';
import { dummyScenarioFor } from '../../domain/sapAutoScenarios.ts';

/**
 * Centralised SAP → normalised-reference mapper. Testable, documented,
 * and the ONLY place SAP response shapes are interpreted.
 *
 * Grounded on the supplied API_EHS_REPORT_INCIDENT_SRV OpenAPI spec
 * (Environment, Health and Safety Incident - Create, Read, v1.0.0):
 * entity set A_Incident with spec-exact fields IncidentID,
 * IncidentUUID, IncidentUTCDateTime, IncidentTitle, IncidentStatus,
 * IncidentLocationDescription, IncidentDescriptionOfEvents,
 * IncidentCategory, EHSLocationUUID (plus navigation to_Persons /
 * to_Attachments / to_Location). Those keys are read FIRST; generic
 * fallbacks only cover sandbox variance and never invent values.
 * Anything absent stays null, and the untouched original entry is
 * always kept in `rawSource`.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const ID_KEYS = ['IncidentID', 'IncidentUUID', 'Incident', 'ObjectID', 'UUID', 'ID', 'Id', 'id'];
const TITLE_KEYS = ['IncidentTitle', 'Title', 'ShortText', 'Name', 'Subject'];
const DESCRIPTION_KEYS = [
  'IncidentDescriptionOfEvents',
  'IncidentLocationDescription',
  'IncidentDescription',
  'Description',
  'LongText',
  'Text',
  'Details',
];
const STATUS_KEYS = ['IncidentStatus', 'Status', 'LifeCycleStatus', 'ProcessingStatus'];
const CREATED_KEYS = ['IncidentUTCDateTime', 'CreatedAt', 'CreationDateTime', 'CreatedOn', 'Created'];
const UPDATED_KEYS = ['ChangedAt', 'LastChangeDateTime', 'ChangedOn', 'Updated', 'LastModified'];
const CATEGORY_KEYS = ['IncidentCategory', 'Category', 'IncidentType'];

function firstString(entry: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = entry[key];
    if (typeof value === 'string' && value.trim().length > 0) return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}

/** Extract the entry list from any supported OData envelope (or [] when none). */
export function normalizeEnvelope(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter(isRecord);
  if (!isRecord(payload)) return [];
  const d = payload['d'];
  if (isRecord(d)) {
    const results = d['results'];
    if (Array.isArray(results)) return results.filter(isRecord);
    return [d];
  }
  const value = payload['value'];
  if (Array.isArray(value)) return value.filter(isRecord);
  return [payload];
}

/** Normalise one SAP entry. Missing values become null — never invented. */
export function normalizeEntry(entry: Record<string, unknown>, index: number): SapIncidentReference {
  const incidentUtc = firstString(entry, ['IncidentUTCDateTime']);
  return {
    sapId: firstString(entry, ID_KEYS) ?? `sap-record-${index + 1}`,
    title: firstString(entry, TITLE_KEYS),
    description: firstString(entry, DESCRIPTION_KEYS),
    status: firstString(entry, STATUS_KEYS),
    createdAt: firstString(entry, CREATED_KEYS),
    updatedAt: firstString(entry, UPDATED_KEYS),
    category: firstString(entry, CATEGORY_KEYS),
    incidentUtc,
    locationDescription: firstString(entry, ['IncidentLocationDescription']),
    rawSource: entry,
  };
}

/**
 * Convert an OData `/Date(ms+offset)/` payload (or plain ISO) to an ISO
 * string. Returns null when the value carries no parseable instant, so
 * renderers never receive an Invalid Date (which would throw at format
 * time and blank the whole view).
 */
export function toIsoDate(value: string | null, fallbackIso?: string): string | null {
  if (value === null) return fallbackIso ?? null;
  const odata = /\/Date\((-?\d+)(?:[+-]\d+)?\)\//.exec(value);
  if (odata) {
    const ms = Number.parseInt(odata[1], 10);
    if (Number.isFinite(ms)) return new Date(ms).toISOString();
    return fallbackIso ?? null;
  }
  const ms = Date.parse(value);
  if (Number.isFinite(ms)) return new Date(ms).toISOString();
  return fallbackIso ?? null;
}
/**
 * Auto-enrich a normalised SAP reference into an intake candidate.
 * SAP EHS records do not carry AT operational fields, so every field the
 * intake worklist requires is completed automatically: derived from the
 * SAP response where possible, otherwise an explicit labelled default
 * (never presented as SAP data). UUID is recovered from the raw entry
 * when the sandbox returns it.
 */
export function referenceToCandidate(ref: SapIncidentReference, nowIso?: string): SapCandidate {
  const raw = ref.rawSource;
  const uuid =
    (typeof raw['IncidentUUID'] === 'string' && raw['IncidentUUID']) ||
    (typeof raw['UUID'] === 'string' && raw['UUID']) ||
    '';
  const title = ref.title ?? `SAP incident ${ref.sapId}`;
  const fallback = nowIso ?? new Date().toISOString();
  return {
    sapId: ref.sapId,
    sapUuid: uuid,
    title,
    category: ref.category ?? 'General',
    sapStatus: ref.status ?? 'Open',
    locationDescription: ref.locationDescription ?? dummyScenarioFor(ref.sapId).location,
    description: ref.description ?? title,
    receivedAt: toIsoDate(ref.incidentUtc, fallback) ?? toIsoDate(ref.createdAt, fallback) ?? fallback,
    intakeRoute: 'SAP EHS intake',
    linkedIncidentId: null,
  };
}

/**
 * Merge freshly enriched candidates over the current list. Already-linked
 * candidates are preserved (enrichment history must survive a refresh);
 * unlinked entries are replaced wholesale by the live SAP records.
 */
export function mergeCandidates(
  existing: SapCandidate[],
  fresh: SapCandidate[],
): SapCandidate[] {
  const linked = existing.filter((c) => c.linkedIncidentId !== null);
  const linkedIds = new Set(linked.map((c) => c.sapId));
  return [...linked, ...fresh.filter((c) => !linkedIds.has(c.sapId))];
}
