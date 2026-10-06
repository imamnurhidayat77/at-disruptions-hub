import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';
import { toCommsDraft, type DraftInput } from '../domain/comms.js';
import { buildReportedIncident, nextIncidentId, type ReportInput } from '../domain/reporting.js';
import { assessSeverity } from '../domain/severity.js';
import type {
  CommsDraft,
  CorrectiveAction,
  Incident,
  OperationalStatus,
  Role,
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
      at: string;
    }
  | { type: 'VALIDATE_INCIDENT'; id: string; at: string }
  | {
      type: 'CONFIRM_SEVERITY';
      id: string;
      level: Severity;
      score: number;
      rationale: string;
      overrideReason: string | null;
      at: string;
    }
  | { type: 'ASSIGN_OWNER'; id: string; owner: string; at: string }
  | { type: 'MARK_ACTIVE'; id: string; at: string }
  | { type: 'TOGGLE_RECOVERY_TASK'; id: string; taskId: string; at: string }
  | { type: 'ADD_RECOVERY_TASK'; id: string; label: string; responsible: string; at: string }
  | { type: 'LOG_OPERATOR_NOTE'; id: string; note: string; at: string }
  | { type: 'SAVE_DRAFT'; id: string; draft: CommsDraft; at: string }
  | { type: 'PUBLISH_COMMS'; id: string; draft: CommsDraft; detail: string; at: string }
  | { type: 'SET_REVIEW'; id: string; rootCause: string; reviewRequired: boolean; at: string }
  | {
      type: 'ADD_CORRECTIVE';
      id: string;
      corrective: { action: string; owner: string; dueDate: string };
      at: string;
    }
  | { type: 'CLOSE_INCIDENT'; id: string; at: string }
  | { type: 'REOPEN_INCIDENT'; id: string; at: string };

function initState(initialRole: Role): AppState {
  return { role: initialRole, incidents: loadDemoState() ?? freshDemoState() };
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

  if (allDone && operationalStatus !== 'RESTORED' && operationalStatus !== 'CLOSED') {
    operationalStatus = 'RESTORED';
    recoveryStatus = 'RESTORED';
    restoredAt = at;
    events.push(
      event(
        { ...incident, timeline: events },
        1,
        at,
        'Service restored',
        'All recovery tasks complete — verified with operator.',
      ),
    );
  } else if (!allDone && operationalStatus === 'RESTORED') {
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
      return { ...state, incidents: freshDemoState() };
    }
    case 'CREATE_INCIDENT':
      return { ...state, incidents: [action.incident, ...state.incidents] };
    case 'ADD_OPERATOR_UPDATE':
      return updateIncident(state, action.id, (i) => ({
        ...i,
        estimatedDelayMinutes: action.estimatedDelayMinutes ?? i.estimatedDelayMinutes,
        timeline: [
          ...i.timeline,
          {
            id: `evt-${i.id}-upd-${i.timeline.length + 1}`,
            at: action.at,
            actorRole: 'CONTRACTOR' as const,
            action: 'Operator sent confirmed update',
            detail: action.detail,
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
          timeline: [
            ...i.timeline,
            {
              ...event(i, 1, action.at, 'Notification validated and accepted', ''),
              detail: 'AT Operations accepted the notification — communication KPI clock started.',
            },
          ],
        };
        return next;
      });
    case 'CONFIRM_SEVERITY':
      return updateIncident(state, action.id, (i) => ({
        ...i,
        severity: action.level,
        severityScore: action.score,
        severityReason: action.rationale,
        severityOverrideReason: action.overrideReason,
        timeline: [
          ...i.timeline,
          {
            ...event(i, 1, action.at, 'Severity assessed', ''),
            action:
              action.overrideReason !== null
                ? `Severity overridden to ${action.level}`
                : `Severity confirmed: ${action.level}`,
            detail: action.rationale,
          },
        ],
      }));
    case 'ASSIGN_OWNER':
      return updateIncident(state, action.id, (i) => ({
        ...i,
        owner: action.owner,
        timeline: [
          ...i.timeline,
          {
            ...event(i, 1, action.at, 'Incident owner assigned', ''),
            detail: `${action.owner} accepted accountability through restoration and closure.`,
          },
        ],
      }));
    case 'MARK_ACTIVE':
      return updateIncident(state, action.id, (i) => {
        if (i.operationalStatus !== 'VALIDATED') return i;
        return {
          ...i,
          operationalStatus: 'ACTIVE',
          timeline: [
            ...i.timeline,
            {
              ...event(i, 1, action.at, 'Active management started', ''),
              detail: 'Severity and owner confirmed — recovery and comms tracks open in parallel.',
            },
          ],
        };
      });
    case 'TOGGLE_RECOVERY_TASK':
      return updateIncident(state, action.id, (i) => toggleTaskAndTransitions(i, action.taskId, action.at));
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
    case 'SAVE_DRAFT':
      return updateIncident(state, action.id, (i) => {
        if (i.operationalStatus === 'REPORTED' || i.operationalStatus === 'CLOSED') return i;
        if (i.communicationStatus === 'PUBLISHED') return i;
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
        if (i.communicationStatus === 'PUBLISHED') return i;
        return {
          ...i,
          commsDraft: action.draft,
          communicationStatus: 'PUBLISHED',
          firstPublishedAt: i.firstPublishedAt ?? action.at,
          timeline: [...i.timeline, commsEvent(i, action.at, 'Initial passenger update published', action.detail)],
        };
      });
    case 'SET_REVIEW':
      return updateIncident(state, action.id, (i) => ({
        ...i,
        rootCause: action.rootCause,
        reviewRequired: action.reviewRequired,
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
  /** Contractor: create a REPORTED incident from a validated report. Returns the new ID. */
  createIncident: (input: ReportInput) => string;
  /** Contractor: append a confirmed update to the shared timeline. */
  addOperatorUpdate: (id: string, detail: string, estimatedDelayMinutes: number | null) => void;
  /** Operations: accept a REPORTED notification (starts the KPI clock). */
  validateIncident: (id: string) => void;
  /** Operations: confirm or override severity (override needs a reason). */
  confirmSeverity: (id: string, level: Severity, rationale: string, overrideReason: string | null) => void;
  assignOwner: (id: string, owner: string) => void;
  markActive: (id: string) => void;
  toggleRecoveryTask: (id: string, taskId: string) => void;
  addRecoveryTask: (id: string, label: string, responsible: string) => void;
  logOperatorNote: (id: string, note: string) => void;
  /** Comms: save a draft (REQUIRED → DRAFT). */
  saveDraft: (id: string, input: DraftInput) => void;
  /** Comms: approve & publish (records firstPublishedAt + stops the KPI clock). */
  publishComms: (id: string, input: DraftInput) => void;
  /** Operations: record root cause + review decision. */
  setReview: (id: string, rootCause: string, reviewRequired: boolean) => void;
  addCorrective: (id: string, corrective: { action: string; owner: string; dueDate: string }) => void;
  /** Operations: close a restored incident (requires root cause). */
  closeIncident: (id: string) => void;
  reopenIncident: (id: string) => void;
}

function severityScoreFor(incident: Incident): number {
  return assessSeverity({
    estimatedDelayMinutes: incident.estimatedDelayMinutes,
    passengerImpact: incident.passengerImpact,
    majorInterchangeAffected: incident.majorInterchangeAffected,
    disruptionType: incident.disruptionType,
  }).score;
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
    saveDemoState(state.incidents);
  }, [state.incidents]);

  const store = useMemo<Store>(
    () => ({
      state,
      setRole: (role: Role) => dispatch({ type: 'SET_ROLE', role }),
      resetDemo: () => dispatch({ type: 'RESET_DEMO' }),
      getIncident: (id: string) => state.incidents.find((i) => i.id === id),
      createIncident: (input: ReportInput) => {
        const id = nextIncidentId(state.incidents);
        dispatch({ type: 'CREATE_INCIDENT', incident: buildReportedIncident(input, id) });
        return id;
      },
      addOperatorUpdate: (id: string, detail: string, estimatedDelayMinutes: number | null) =>
        dispatch({
          type: 'ADD_OPERATOR_UPDATE',
          id,
          detail,
          estimatedDelayMinutes,
          at: new Date().toISOString(),
        }),
      validateIncident: (id: string) =>
        dispatch({ type: 'VALIDATE_INCIDENT', id, at: new Date().toISOString() }),
      confirmSeverity: (id: string, level: Severity, rationale: string, overrideReason: string | null) => {
        const incident = state.incidents.find((i) => i.id === id);
        if (!incident) return;
        dispatch({
          type: 'CONFIRM_SEVERITY',
          id,
          level,
          score: severityScoreFor(incident),
          rationale,
          overrideReason,
          at: new Date().toISOString(),
        });
      },
      assignOwner: (id: string, owner: string) =>
        dispatch({ type: 'ASSIGN_OWNER', id, owner, at: new Date().toISOString() }),
      markActive: (id: string) =>
        dispatch({ type: 'MARK_ACTIVE', id, at: new Date().toISOString() }),
      toggleRecoveryTask: (id: string, taskId: string) =>
        dispatch({ type: 'TOGGLE_RECOVERY_TASK', id, taskId, at: new Date().toISOString() }),
      addRecoveryTask: (id: string, label: string, responsible: string) =>
        dispatch({ type: 'ADD_RECOVERY_TASK', id, label, responsible, at: new Date().toISOString() }),
      logOperatorNote: (id: string, note: string) =>
        dispatch({ type: 'LOG_OPERATOR_NOTE', id, note, at: new Date().toISOString() }),
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
      setReview: (id: string, rootCause: string, reviewRequired: boolean) =>
        dispatch({ type: 'SET_REVIEW', id, rootCause, reviewRequired, at: new Date().toISOString() }),
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
