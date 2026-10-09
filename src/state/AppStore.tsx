import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';
import { toCommsDraft, type DraftInput } from '../domain/comms.js';
import { autoEnrichInput, buildArchivedIncident, buildLinkedIncident, disruptionTypeFor, dummyScenarioFor, type EnrichInput } from '../domain/intake.js';
import { buildReportedIncident, nextIncidentId, type ReportInput } from '../domain/reporting.js';
import { assessSeverity } from '../domain/severity.js';
import type {
  CommsDraft,
  CorrectiveAction,
  Incident,
  OperationalStatus,
  Role,
  SapCandidate,
  Severity,
  TimelineEvent,
} from '../domain/types.js';
import {
  clearDemoState,
  freshDemoState,
  loadDemoState,
  saveDemoState,
} from '../services/incidentRepository.js';

/**
 * Shared application store — ONE incident record set for all roles.
 * Role switching changes `role` only; `incidents` are untouched, so every
 * role always sees the same record. Persisted to localStorage as a demo
 * convenience; Reset restores the canonical seed.
 */

export interface AppState {
  role: Role;
  incidents: Incident[];
  /** SAP intake candidates (demo seed) — never AT incidents until enriched. */
  sapCandidates: SapCandidate[];
}

export type AppAction =
  | { type: 'SET_ROLE'; role: Role }
  | { type: 'RESET_DEMO' }
  | { type: 'CREATE_INCIDENT'; incident: Incident }
  | {
      type: 'ADD_OPERATOR_UPDATE';
      id: string;
      detail: string;
      estimatedDelayMinutes: number | null;
      estimatedRestorationAt: string | null;
      at: string;
    }
  | { type: 'VALIDATE_INCIDENT'; id: string; at: string }
  | { type: 'REQUEST_INFO'; id: string; at: string }
  | {
      type: 'CONFIRM_SEVERITY';
      id: string;
      level: Severity;
      calculated: Severity;
      score: number;
      rationale: string;
      overrideReason: string | null;
      at: string;
    }
  | { type: 'ASSIGN_OWNER'; id: string; owner: string; at: string }
  | { type: 'TOGGLE_RECOVERY_TASK'; id: string; taskId: string; at: string }
  | { type: 'ADD_RECOVERY_TASK'; id: string; label: string; responsible: string; at: string }
  | { type: 'LOG_OPERATOR_NOTE'; id: string; note: string; at: string }
  | { type: 'UPDATE_RESTORATION'; id: string; estimatedRestorationAt: string | null; at: string }
  | { type: 'COMPLETE_RECOVERY'; id: string; actualRestorationAt: string; at: string }
  | { type: 'SAVE_DRAFT'; id: string; draft: CommsDraft; at: string }
  | { type: 'PUBLISH_COMMS'; id: string; draft: CommsDraft; detail: string; at: string }
  | { type: 'SET_REVIEW'; id: string; rootCause: string; reviewRequired: boolean; closureNotes: string | null; at: string }
  | {
      type: 'ADD_CORRECTIVE';
      id: string;
      corrective: { action: string; owner: string; dueDate: string };
      at: string;
    }
  | { type: 'CLOSE_INCIDENT'; id: string; at: string }
  | { type: 'REOPEN_INCIDENT'; id: string; at: string }
  | { type: 'CREATE_LINKED_INCIDENT'; incident: Incident; sapId: string }
  | { type: 'SET_SAP_CANDIDATES'; candidates: SapCandidate[] }
  | { type: 'AUTO_INTAKE_SAP'; candidates: SapCandidate[]; incidents: Incident[] }
  | { type: 'SET_ACTUAL_RESTORATION'; id: string; actualRestorationAt: string; at: string }
  | { type: 'START_REVIEW'; id: string; at: string }
  | { type: 'MARK_CORRECTIVE_DONE'; id: string; correctiveId: string; at: string };

function initState(initialRole: Role): AppState {
  const loaded = loadDemoState() ?? freshDemoState();
  return { role: initialRole, incidents: loaded.incidents, sapCandidates: loaded.sapCandidates };
}

function event(
  incident: Incident,
  extra: number,
  at: string,
  action: TimelineEvent['action'],
  detail: string,
): TimelineEvent {
  return {
    id: `evt-${incident.id}-e${incident.timeline.length + extra}`,
    at,
    actorRole: 'OPERATIONS',
    action,
    detail,
  };
}

function updateIncident(
  state: AppState,
  id: string,
  fn: (incident: Incident) => Incident,
): AppState {
  return {
    ...state,
    incidents: state.incidents.map((i) => (i.id === id ? fn(i) : i)),
  };
}

function commsEvent(
  incident: Incident,
  at: string,
  action: string,
  detail: string,
): TimelineEvent {
  return {
    id: `evt-${incident.id}-e${incident.timeline.length + 1}`,
    at,
    actorRole: 'CUSTOMER_INFORMATION',
    action,
    detail,
  };
}

function toggleTaskAndTransitions(incident: Incident, taskId: string, at: string): Incident {
  const tasks = incident.recoveryTasks.map((t) =>
    t.id === taskId ? { ...t, doneAt: t.doneAt === null ? at : null } : t,
  );
  const toggled = tasks.find((t) => t.id === taskId);
  const events = [...incident.timeline];
  let { operationalStatus, recoveryStatus, restoredAt } = incident;

  if (toggled) {
    events.push(
      event(
        { ...incident, timeline: events },
        1,
        at,
        toggled.doneAt === null ? 'Recovery task reopened' : 'Recovery task completed',
        toggled.label,
      ),
    );
  }

  const anyDone = tasks.some((t) => t.doneAt !== null);
  const allDone = tasks.length > 0 && tasks.every((t) => t.doneAt !== null);

  if (!allDone && operationalStatus === 'RESTORED') {
    operationalStatus = 'RECOVERY_IN_PROGRESS';
    recoveryStatus = 'IN_PROGRESS';
    restoredAt = null;
  } else if (anyDone && operationalStatus === 'ACTIVE') {
    operationalStatus = 'RECOVERY_IN_PROGRESS';
    recoveryStatus = 'IN_PROGRESS';
    events.push(
      event(
        { ...incident, timeline: events },
        1,
        at,
        'Recovery in progress',
        'First recovery task completed.',
      ),
    );
  } else if (anyDone && recoveryStatus === 'NOT_STARTED') {
    recoveryStatus = 'IN_PROGRESS';
  } else if (!anyDone) {
    recoveryStatus = 'NOT_STARTED';
  }

  return { ...incident, recoveryTasks: tasks, operationalStatus, recoveryStatus, restoredAt, timeline: events };
}

/** Exported for headless workflow verification (no rendering needed). */
export function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ROLE':
      // No-op when the role is unchanged (deep links re-assert it on mount).
      return state.role === action.role ? state : { ...state, role: action.role };
    case 'RESET_DEMO': {
      clearDemoState();
      const fresh = freshDemoState();
      return { ...state, incidents: fresh.incidents, sapCandidates: fresh.sapCandidates };
    }
    case 'CREATE_INCIDENT':
      return { ...state, incidents: [action.incident, ...state.incidents] };
    case 'CREATE_LINKED_INCIDENT':
      return {
        ...state,
        incidents: [action.incident, ...state.incidents],
        sapCandidates: state.sapCandidates.map((c) =>
          c.sapId === action.sapId ? { ...c, linkedIncidentId: action.incident.id } : c,
        ),
      };
    case 'SET_SAP_CANDIDATES':
      return { ...state, sapCandidates: action.candidates };
    case 'AUTO_INTAKE_SAP': {
      return {
        ...state,
        incidents: [...action.incidents, ...state.incidents],
        sapCandidates: action.candidates.map((c) => {
          const created = action.incidents.find((i) => i.sapLink?.sapId === c.sapId);
          if (created) return { ...c, linkedIncidentId: created.id };
          return c;
        }),
      };
    }
    case 'ADD_OPERATOR_UPDATE':
      return updateIncident(state, action.id, (i) => ({
        ...i,
        infoRequested: false,
        estimatedDelayMinutes: action.estimatedDelayMinutes ?? i.estimatedDelayMinutes,
        estimatedRestorationAt: action.estimatedRestorationAt ?? i.estimatedRestorationAt,
        timeline: [
          ...i.timeline,
          {
            id: `evt-${i.id}-upd-${i.timeline.length + 1}`,
            at: action.at,
            actorRole: 'CONTRACTOR' as const,
            action: 'Operator sent confirmed update',
            detail:
              action.detail +
              (action.estimatedRestorationAt
                ? ` Estimated restoration ${action.estimatedRestorationAt}.`
                : ''),
          },
        ],
      }));
    case 'VALIDATE_INCIDENT':
      return updateIncident(state, action.id, (i) => {
        if (i.operationalStatus !== 'REPORTED') return i;
        const next: Incident = {
          ...i,
          operationalStatus: 'VALIDATED',
          confirmedAt: action.at,
          communicationStatus: 'REQUIRED',
          infoRequested: false,
          timeline: [
            ...i.timeline,
            {
              ...event(i, 1, action.at, 'Notification validated and accepted', ''),
              detail: 'Operations accepted the notification — response timer started.',
            },
          ],
        };
        return next;
      });
    case 'REQUEST_INFO':
      return updateIncident(state, action.id, (i) => {
        if (i.operationalStatus === 'CLOSED') return i;
        if (i.infoRequested) return i;
        return {
          ...i,
          infoRequested: true,
          timeline: [
            ...i.timeline,
            {
              ...event(i, 1, action.at, 'More information requested', ''),
              detail:
                'AT Operations asked the operator for more information — contractor status set to More Information Requested.',
            },
          ],
        };
      });
    case 'CONFIRM_SEVERITY':
      return updateIncident(state, action.id, (i) => ({
        ...i,
        severity: action.level,
        severityScore: action.score,
        severityReason: action.rationale,
        severityOverrideReason: action.overrideReason,
        infoRequested: false,
        timeline: [
          ...i.timeline,
          {
            ...event(i, 1, action.at, 'Severity assessed', ''),
            action:
              action.overrideReason !== null
                ? `Severity overridden from ${action.calculated} to ${action.level}`
                : `Severity confirmed: ${action.level}`,
            detail:
              action.overrideReason !== null
                ? `Reason: ${action.rationale}`
                : `Calculated ${action.calculated} (score ${action.score}). ${action.rationale}`,
          },
        ],
      }));
    case 'ASSIGN_OWNER':
      return updateIncident(state, action.id, (i) => {
        const becomesActive = i.operationalStatus === 'VALIDATED';
        return {
          ...i,
          owner: action.owner,
          operationalStatus: becomesActive ? 'ACTIVE' : i.operationalStatus,
          timeline: [
            ...i.timeline,
            {
              ...event(i, 1, action.at, 'Incident owner assigned', ''),
              detail: `${action.owner} accepted accountability through restoration and closure.`,
            },
            ...(becomesActive
              ? [
                  {
                    ...event(i, 2, action.at, 'Active management started', ''),
                    detail:
                      'Severity and owner confirmed — recovery and comms tracks open in parallel.',
                  },
                ]
              : []),
          ],
        };
      });
    case 'TOGGLE_RECOVERY_TASK':
      return updateIncident(state, action.id, (i) => toggleTaskAndTransitions(i, action.taskId, action.at));
    case 'COMPLETE_RECOVERY':
      return updateIncident(state, action.id, (i) => {
        if (i.operationalStatus === 'CLOSED' || i.operationalStatus === 'RESTORED') return i;
        if (i.recoveryTasks.length === 0 || !i.recoveryTasks.every((t) => t.doneAt !== null)) return i;
        return {
          ...i,
          operationalStatus: 'RESTORED',
          recoveryStatus: 'RESTORED',
          restoredAt: action.actualRestorationAt,
          timeline: [
            ...i.timeline,
            {
              ...event(i, 1, action.at, 'Service restored', ''),
              detail: `All recovery tasks complete — normal service restored at ${action.actualRestorationAt}, verified with operator.`,
            },
          ],
        };
      });
    case 'ADD_RECOVERY_TASK':
      return updateIncident(state, action.id, (i) => ({
        ...i,
        recoveryTasks: [
          ...i.recoveryTasks,
          {
            id: `custom-${i.recoveryTasks.length + 1}`,
            label: action.label,
            responsible: action.responsible,
            doneAt: null,
          },
        ],
        timeline: [
          ...i.timeline,
          {
            ...event(i, 1, action.at, 'Recovery task added', ''),
            detail: `${action.label} — ${action.responsible}.`,
          },
        ],
      }));
    case 'LOG_OPERATOR_NOTE':
      return updateIncident(state, action.id, (i) => ({
        ...i,
        timeline: [
          ...i.timeline,
          {
            ...event(i, 1, action.at, 'Operator contact logged', ''),
            detail: action.note,
          },
        ],
      }));
    case 'UPDATE_RESTORATION':
      return updateIncident(state, action.id, (i) => {
        if (i.operationalStatus === 'CLOSED') return i;
        return {
          ...i,
          estimatedRestorationAt: action.estimatedRestorationAt,
          timeline: [
            ...i.timeline,
            {
              ...event(i, 1, action.at, 'Restoration estimate updated', ''),
              detail:
                action.estimatedRestorationAt === null
                  ? 'Estimated restoration time cleared — not yet confirmed.'
                  : `Estimated restoration: ${action.estimatedRestorationAt}. Checkpoints are check-ins, not promises.`,
            },
          ],
        };
      });
    case 'SAVE_DRAFT':
      return updateIncident(state, action.id, (i) => {
        if (i.operationalStatus === 'REPORTED' || i.operationalStatus === 'CLOSED') return i;
        if (i.communicationStatus === 'PUBLISHED') {
          // Follow-up draft: refresh content without touching the
          // first-publication record or restarting the response timer.
          return {
            ...i,
            commsDraft: action.draft,
            timeline: [...i.timeline, commsEvent(i, action.at, 'Follow-up draft saved', `Draft for ${action.draft.channels.join(' + ') || 'no channels'}. First-publication time unchanged.`)],
          };
        }
        return {
          ...i,
          commsDraft: action.draft,
          communicationStatus: 'DRAFT',
          timeline: [...i.timeline, commsEvent(i, action.at, 'Communication draft saved', `Draft for ${action.draft.channels.join(' + ') || 'no channels'}.`)],
        };
      });
    case 'PUBLISH_COMMS':
      return updateIncident(state, action.id, (i) => {
        if (i.operationalStatus === 'REPORTED' || i.operationalStatus === 'CLOSED') return i;
        if (i.communicationStatus === 'PUBLISHED') {
          // Follow-up publication: new audit event, same firstPublishedAt —
          // the first-communication KPI always measures the FIRST publish.
          return {
            ...i,
            commsDraft: action.draft,
            selectedChannels: action.draft.channels,
            timeline: [...i.timeline, commsEvent(i, action.at, 'Follow-up passenger update published', action.detail)],
          };
        }
        return {
          ...i,
          commsDraft: action.draft,
          communicationStatus: 'PUBLISHED',
          firstPublishedAt: i.firstPublishedAt ?? action.at,
          selectedChannels: action.draft.channels,
          timeline: [...i.timeline, commsEvent(i, action.at, 'Initial passenger update published', action.detail)],
        };
      });
    case 'SET_REVIEW':
      return updateIncident(state, action.id, (i) => ({
        ...i,
        rootCause: action.rootCause,
        reviewRequired: action.reviewRequired,
        closureNotes: action.closureNotes,
        reviewStatus: 'OPEN' as const,
        timeline: [
          ...i.timeline,
          {
            ...event(i, 1, action.at, 'Review details recorded', ''),
            detail: action.reviewRequired
              ? `Root cause: ${action.rootCause} — review required.`
              : `Root cause: ${action.rootCause} — no formal review.`,
          },
        ],
      }));
    case 'ADD_CORRECTIVE': {
      return updateIncident(state, action.id, (i) => {
        const corrective: CorrectiveAction = {
          id: `ca-${i.correctiveActions.length + 1}`,
          action: action.corrective.action,
          owner: action.corrective.owner,
          dueDate: action.corrective.dueDate,
          status: 'OPEN',
        };
        return {
          ...i,
          correctiveActions: [...i.correctiveActions, corrective],
          timeline: [
            ...i.timeline,
            {
              ...event(i, 1, action.at, 'Corrective action recorded', ''),
              detail: `${corrective.action} — ${corrective.owner}, due ${corrective.dueDate}.`,
            },
          ],
        };
      });
    }
    case 'CLOSE_INCIDENT':
      return updateIncident(state, action.id, (i) => {
        if (i.operationalStatus !== 'RESTORED') return i;
        if (i.rootCause === null || i.rootCause.trim() === '') return i;
        if (i.restoredAt === null) return i;
        // Review is mandatory only for HIGH/CRITICAL (matches the close
        // form rule); LOW/MEDIUM may close with review explicitly waived.
        if (!i.reviewRequired && i.severity !== 'LOW' && i.severity !== 'MEDIUM') return i;
        const open = i.correctiveActions.filter((c) => c.status === 'OPEN').length;
        return {
          ...i,
          operationalStatus: 'CLOSED',
          timeline: [
            ...i.timeline,
            {
              ...event(i, 1, action.at, 'Incident closed', ''),
              detail: `Service restored${i.restoredAt ? ` ${i.restoredAt}` : ''}; review ${i.reviewRequired ? 'required' : 'not required'}; ${open} follow-up action${open === 1 ? '' : 's'} remain${open === 1 ? 's' : ''} open.`,
            },
          ],
        };
      });
    case 'SET_ACTUAL_RESTORATION':
      return updateIncident(state, action.id, (i) => {
        if (i.operationalStatus === 'CLOSED') return i;
        return {
          ...i,
          restoredAt: action.actualRestorationAt,
          timeline: [
            ...i.timeline,
            {
              ...event(i, 1, action.at, 'Actual restoration recorded', ''),
              detail: `Normal service restored at ${action.actualRestorationAt}.`,
            },
          ],
        };
      });
    case 'START_REVIEW':
      return updateIncident(state, action.id, (i) => {
        if (!i.reviewRequired || i.reviewStatus !== 'OPEN') return i;
        return {
          ...i,
          reviewStatus: 'IN_PROGRESS',
          timeline: [
            ...i.timeline,
            {
              ...event(i, 1, action.at, 'Post-incident review started', ''),
              detail: 'Review tracks learning and follow-through separately from service recovery.',
            },
          ],
        };
      });
    case 'MARK_CORRECTIVE_DONE':
      return updateIncident(state, action.id, (i) => ({
        ...i,
        correctiveActions: i.correctiveActions.map((c) =>
          c.id === action.correctiveId ? { ...c, status: 'DONE' as const } : c,
        ),
        timeline: [
          ...i.timeline,
          {
            ...event(i, 1, action.at, 'Corrective action completed', ''),
            detail: i.correctiveActions.find((c) => c.id === action.correctiveId)?.action ?? '',
          },
        ],
      }));
    case 'REOPEN_INCIDENT':
      return updateIncident(state, action.id, (i) => {
        if (i.operationalStatus !== 'CLOSED') return i;
        return {
          ...i,
          operationalStatus: 'RECOVERY_IN_PROGRESS',
          recoveryStatus: 'IN_PROGRESS',
          timeline: [
            ...i.timeline,
            {
              ...event(i, 1, action.at, 'Incident reopened', ''),
              detail: 'Closure reversed — follow-up continues on the same record.',
            },
          ],
        };
      });
  }
}

interface Store {
  state: AppState;
  setRole: (role: Role) => void;
  resetDemo: () => void;
  getIncident: (id: string) => Incident | undefined;
  /** SAP intake: find a candidate by SAP ID. */
  getCandidate: (sapId: string) => SapCandidate | undefined;
  /** SAP intake: replace the candidate list with auto-fetched live records. */
  replaceSapCandidates: (candidates: SapCandidate[]) => void;
  /** SAP intake: fully automatic — fresh candidates become incidents, no clicks. Returns new IDs. */
  autoIntakeSap: (fresh: SapCandidate[], archiveSeed: boolean) => string[];
  /** Operations: enrich a SAP candidate into a linked VALIDATED incident. Returns the new ID. */
  createLinkedIncident: (sapId: string, input: EnrichInput) => string | null;
  /** Contractor: create a REPORTED incident from a validated report. Returns the new ID. */
  createIncident: (input: ReportInput) => string;
  /** Contractor: append a confirmed update to the shared timeline. */
  addOperatorUpdate: (
    id: string,
    detail: string,
    estimatedDelayMinutes: number | null,
    estimatedRestorationAt?: string | null,
  ) => void;
  /** Operations: accept a REPORTED notification (starts the response timer). */
  validateIncident: (id: string) => void;
  /** Operations: ask the operator for more information (contractor-visible status). */
  requestInfo: (id: string) => void;
  /** Operations: confirm or override severity (override needs a reason). */
  confirmSeverity: (id: string, level: Severity, rationale: string, overrideReason: string | null) => void;
  assignOwner: (id: string, owner: string) => void;
  toggleRecoveryTask: (id: string, taskId: string) => void;
  addRecoveryTask: (id: string, label: string, responsible: string) => void;
  logOperatorNote: (id: string, note: string) => void;
  /** Operations: set or clear the estimated restoration time. */
  updateRestoration: (id: string, estimatedRestorationAt: string | null) => void;
  /** Operations: complete recovery (requires all tasks done + actual time). */
  completeRecovery: (id: string, actualRestorationAt: string) => void;
  /** Comms: save a draft (REQUIRED → DRAFT). */
  saveDraft: (id: string, input: DraftInput) => void;
  /** Comms: approve & publish (records firstPublishedAt + stops the response timer). */
  publishComms: (id: string, input: DraftInput) => void;
  /** Operations: record root cause + review decision. */
  setReview: (id: string, rootCause: string, reviewRequired: boolean, closureNotes?: string | null) => void;
  /** Operations: record the actual restoration time. */
  setActualRestoration: (id: string, actualRestorationAt: string) => void;
  /** Operations: start the post-incident review. */
  startReview: (id: string) => void;
  /** Operations: mark a corrective action done. */
  markCorrectiveDone: (id: string, correctiveId: string) => void;
  addCorrective: (id: string, corrective: { action: string; owner: string; dueDate: string }) => void;
  /** Operations: close a restored incident (requires root cause). */
  closeIncident: (id: string) => void;
  reopenIncident: (id: string) => void;
}

const AppStoreContext = createContext<Store | null>(null);

export function AppStoreProvider({
  initialRole = 'CONTRACTOR',
  children,
}: {
  initialRole?: Role;
  children: ReactNode;
}): React.JSX.Element {
  const [state, dispatch] = useReducer(reducer, initialRole, initState);

  // Persist the shared record (demo convenience only).
  useEffect(() => {
    saveDemoState({ incidents: state.incidents, sapCandidates: state.sapCandidates });
  }, [state.incidents, state.sapCandidates]);

  const store = useMemo<Store>(
    () => ({
      state,
      setRole: (role: Role) => dispatch({ type: 'SET_ROLE', role }),
      resetDemo: () => dispatch({ type: 'RESET_DEMO' }),
      getIncident: (id: string) => state.incidents.find((i) => i.id === id),
      getCandidate: (sapId: string) => state.sapCandidates.find((c) => c.sapId === sapId),
      replaceSapCandidates: (candidates: SapCandidate[]) =>
        dispatch({ type: 'SET_SAP_CANDIDATES', candidates }),
      autoIntakeSap: (fresh: SapCandidate[], archiveSeed: boolean) => {
        const at = new Date().toISOString();
        const knownLinked = new Set(
          state.sapCandidates.filter((c) => c.linkedIncidentId !== null).map((c) => c.sapId),
        );
        const knownIncidents = new Set(
          state.incidents.flatMap((i) => (i.sapLink ? [i.sapLink.sapId] : [])),
        );
        const pending = fresh.filter((c) => !knownLinked.has(c.sapId) && !knownIncidents.has(c.sapId));
        if (pending.length === 0) return [];
        let next = nextIncidentId(state.incidents);
        const incidents = pending.map((c) => {
          const id = next;
          const m = /^INC-(\d+)$/.exec(next);
          next = m ? `INC-${Number.parseInt(m[1], 10) + 1}` : `${next}-1`;
          // Seed candidates are back-history: complete them as CLOSED archives.
          // Genuinely live arrivals stay actionable VALIDATED records.
          if (archiveSeed) return buildArchivedIncident(c, id);
          const scenario = dummyScenarioFor(c.sapId);
          const built = buildLinkedIncident(c, autoEnrichInput(c, at), id, at, true);
          return { ...built, disruptionType: disruptionTypeFor(c.title, scenario) };
        });
        const merged: SapCandidate[] = [
          ...state.sapCandidates,
          ...pending.filter((c) => !state.sapCandidates.some((e) => e.sapId === c.sapId)),
        ];
        dispatch({ type: 'AUTO_INTAKE_SAP', candidates: merged, incidents });
        return incidents.map((i) => i.id);
      },
      createLinkedIncident: (sapId: string, input: EnrichInput) => {
        const candidate = state.sapCandidates.find((c) => c.sapId === sapId);
        if (!candidate || candidate.linkedIncidentId !== null) return null;
        const id = nextIncidentId(state.incidents);
        const at = new Date().toISOString();
        dispatch({
          type: 'CREATE_LINKED_INCIDENT',
          incident: buildLinkedIncident(candidate, input, id, at),
          sapId,
        });
        return id;
      },
      createIncident: (input: ReportInput) => {
        const id = nextIncidentId(state.incidents);
        dispatch({ type: 'CREATE_INCIDENT', incident: buildReportedIncident(input, id) });
        return id;
      },
      addOperatorUpdate: (
        id: string,
        detail: string,
        estimatedDelayMinutes: number | null,
        estimatedRestorationAt?: string | null,
      ) =>
        dispatch({
          type: 'ADD_OPERATOR_UPDATE',
          id,
          detail,
          estimatedDelayMinutes,
          estimatedRestorationAt: estimatedRestorationAt ?? null,
          at: new Date().toISOString(),
        }),
      validateIncident: (id: string) =>
        dispatch({ type: 'VALIDATE_INCIDENT', id, at: new Date().toISOString() }),
      requestInfo: (id: string) =>
        dispatch({ type: 'REQUEST_INFO', id, at: new Date().toISOString() }),
      confirmSeverity: (id: string, level: Severity, rationale: string, overrideReason: string | null) => {
        const incident = state.incidents.find((i) => i.id === id);
        if (!incident) return;
        const assessment = assessSeverity({
          estimatedDelayMinutes: incident.estimatedDelayMinutes,
          passengerImpact: incident.passengerImpact,
          majorInterchangeAffected: incident.majorInterchangeAffected,
          disruptionType: incident.disruptionType,
          recoveryActionRequired: incident.recoveryTasks.length > 0,
        });
        dispatch({
          type: 'CONFIRM_SEVERITY',
          id,
          level,
          calculated: assessment.level,
          score: assessment.score,
          rationale,
          overrideReason,
          at: new Date().toISOString(),
        });
      },
      assignOwner: (id: string, owner: string) =>
        dispatch({ type: 'ASSIGN_OWNER', id, owner, at: new Date().toISOString() }),
      toggleRecoveryTask: (id: string, taskId: string) =>
        dispatch({ type: 'TOGGLE_RECOVERY_TASK', id, taskId, at: new Date().toISOString() }),
      addRecoveryTask: (id: string, label: string, responsible: string) =>
        dispatch({ type: 'ADD_RECOVERY_TASK', id, label, responsible, at: new Date().toISOString() }),
      logOperatorNote: (id: string, note: string) =>
        dispatch({ type: 'LOG_OPERATOR_NOTE', id, note, at: new Date().toISOString() }),
      updateRestoration: (id: string, estimatedRestorationAt: string | null) =>
        dispatch({ type: 'UPDATE_RESTORATION', id, estimatedRestorationAt, at: new Date().toISOString() }),
      completeRecovery: (id: string, actualRestorationAt: string) =>
        dispatch({ type: 'COMPLETE_RECOVERY', id, actualRestorationAt, at: new Date().toISOString() }),
      saveDraft: (id: string, input: DraftInput) => {
        const at = new Date().toISOString();
        dispatch({ type: 'SAVE_DRAFT', id, draft: toCommsDraft(input, at), at });
      },
      publishComms: (id: string, input: DraftInput) => {
        const at = new Date().toISOString();
        const incident = state.incidents.find((i) => i.id === id);
        let detail = `Channels: ${input.channels.join(' + ') || 'none'}.`;
        if (incident?.confirmedAt) {
          const mins = Math.round((Date.parse(at) - Date.parse(incident.confirmedAt)) / 60000);
          const met = Date.parse(at) - Date.parse(incident.confirmedAt) <= 10 * 60 * 1000;
          detail = `${mins} min from confirmation — target ${met ? 'met' : 'exceeded'}. ${detail}`;
        }
        dispatch({ type: 'PUBLISH_COMMS', id, draft: toCommsDraft(input, at), detail, at });
      },
      setReview: (id: string, rootCause: string, reviewRequired: boolean, closureNotes?: string | null) =>
        dispatch({ type: 'SET_REVIEW', id, rootCause, reviewRequired, closureNotes: closureNotes ?? null, at: new Date().toISOString() }),
      setActualRestoration: (id: string, actualRestorationAt: string) =>
        dispatch({ type: 'SET_ACTUAL_RESTORATION', id, actualRestorationAt, at: new Date().toISOString() }),
      startReview: (id: string) =>
        dispatch({ type: 'START_REVIEW', id, at: new Date().toISOString() }),
      markCorrectiveDone: (id: string, correctiveId: string) =>
        dispatch({ type: 'MARK_CORRECTIVE_DONE', id, correctiveId, at: new Date().toISOString() }),
      addCorrective: (id: string, corrective: { action: string; owner: string; dueDate: string }) =>
        dispatch({ type: 'ADD_CORRECTIVE', id, corrective, at: new Date().toISOString() }),
      closeIncident: (id: string) =>
        dispatch({ type: 'CLOSE_INCIDENT', id, at: new Date().toISOString() }),
      reopenIncident: (id: string) =>
        dispatch({ type: 'REOPEN_INCIDENT', id, at: new Date().toISOString() }),
    }),
    [state],
  );

  return <AppStoreContext.Provider value={store}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): Store {
  const store = useContext(AppStoreContext);
  if (!store) throw new Error('useAppStore must be used inside <AppStoreProvider>');
  return store;
}

/** Re-exported for domain-level tests without rendering. */
export type { OperationalStatus };
