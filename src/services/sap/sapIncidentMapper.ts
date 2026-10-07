import type { SapIncidentReference } from './types.ts';

/**
 * Centralised SAP → normalised-reference mapper. Testable, documented,
 * and the ONLY place SAP response shapes are interpreted.
 *
 * Discovery honesty: without sandbox metadata access, exact A_Incident
 * property names cannot be confirmed. This mapper therefore:
 * 1. accepts OData V2 (`{d:{results:[...]}}`), OData V4 (`{value:[...]}`),
 *    bare arrays and single objects;
 * 2. reads identifier/title/description/status/date fields through a
 *    documented candidate-key list, first match wins;
 * 3. leaves anything absent as null (never fabricated) and always keeps
 *    the untouched original entry in `rawSource`.
 *
 * Candidate keys are READ-time fallbacks only — no request payload,
 * entity-set name or auth header is ever constructed from them.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const ID_KEYS = ['IncidentUUID', 'IncidentID', 'Incident', 'ObjectID', 'UUID', 'ID', 'Id', 'id'];
const TITLE_KEYS = ['IncidentTitle', 'Title', 'ShortText', 'Name', 'Subject'];
const DESCRIPTION_KEYS = ['IncidentDescription', 'Description', 'LongText', 'Text', 'Details'];
const STATUS_KEYS = ['IncidentStatus', 'Status', 'LifeCycleStatus', 'ProcessingStatus'];
const CREATED_KEYS = ['CreatedAt', 'CreationDateTime', 'CreatedOn', 'Created'];
const UPDATED_KEYS = ['ChangedAt', 'LastChangeDateTime', 'ChangedOn', 'Updated', 'LastModified'];

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
  return {
    sapId: firstString(entry, ID_KEYS) ?? `sap-record-${index + 1}`,
    title: firstString(entry, TITLE_KEYS),
    description: firstString(entry, DESCRIPTION_KEYS),
    status: firstString(entry, STATUS_KEYS),
    createdAt: firstString(entry, CREATED_KEYS),
    updatedAt: firstString(entry, UPDATED_KEYS),
    rawSource: entry,
  };
}
