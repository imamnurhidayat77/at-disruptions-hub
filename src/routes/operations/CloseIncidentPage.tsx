import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { SeverityBadge } from '../../components/badges.js';
import { Crumbs, Section } from '../../components/chrome.js';
import { EmptyState } from '../../components/EmptyState.js';
import { Field, SapInput, SapSelect } from '../../components/forms.js';
import { SapDateTime } from '../../components/DateTimeField.js';
import { KpiCard } from '../../components/KpiCard.js';
import { FioriButton } from '../../components/Button.js';
import { DataTable, type DataColumn } from '../../components/DataTable.js';
import { formatMmSs, firstCommunicationKpi, formatNzdtShort } from '../../domain/kpi.js';
import type { CorrectiveAction, Incident } from '../../domain/types.js';
import { useAppStore } from '../../state/AppStore.js';

const correctiveColumns: Array<DataColumn<CorrectiveAction>> = [
  {
    key: 'action',
    label: 'Action',
    sortable: true,
    sortValue: (c) => c.action,
    render: (c) => c.action,
  },
  {
    key: 'owner',
    label: 'Owner',
    sortable: true,
    sortValue: (c) => c.owner,
    render: (c) => c.owner,
  },
  {
    key: 'due',
    label: 'Due Date',
    sortable: true,
    sortValue: (c) => c.dueDate,
    render: (c) => c.dueDate,
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    filter: 'select',
    filterValue: (c) => (c.status === 'OPEN' ? 'Open' : 'Done'),
    sortValue: (c) => c.status,
    render: (c) => (
      <span className={`badge ${c.status === 'OPEN' ? 'tg-warn' : 'tg-good'}`}>
        {c.status === 'OPEN' ? '▲ Open' : '✓ Done'}
      </span>
    ),
  },
];

function correctiveSearch(c: CorrectiveAction): string {
  return `${c.action} ${c.owner} ${c.dueDate} ${c.status}`;
}

// TODO: OwnerPage does not export its roster — keep this copy in sync with the
// OwnerPage/OWNER_ROSTER list (or share it) when a common source is available.
const CORRECTIVE_OWNER_ROSTER = ['Sarah Chen', 'James Wilson', 'Mia Roberts'];

function defaultCorrectiveDue(): string {
  const due = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  return due.toISOString().slice(0, 10);
}

/**
 * Close Incident + Incident Closed — Figma "05 Incident Closure & Review".
 * Closure collects actual restoration, root cause, review decision and
 * notes, then closes directly (no dialog in Figma). Closed records show
 * the review summary; corrective actions stay open after closure.
 */
export function CloseIncidentPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const {
    setRole,
    getIncident,
    setReview,
    addCorrective,
    closeIncident,
  } = useAppStore();

  const [rootCause, setRootCause] = useState('');
  const [reviewRequired, setReviewRequired] = useState(true);
  const [notes, setNotes] = useState('');
  const [caAction, setCaAction] = useState('');
  const [caOwner, setCaOwner] = useState(CORRECTIVE_OWNER_ROSTER[0]);
  const [caDue, setCaDue] = useState(defaultCorrectiveDue);
  const [caError, setCaError] = useState<string | undefined>(undefined);
  const [closeError, setCloseError] = useState<string | undefined>(undefined);

  useEffect(() => {
    setRole('OPERATIONS');
  }, [setRole]);

  const incident = id ? getIncident(id) : undefined;

  useEffect(() => {
    if (incident) {
      if (rootCause === '' && incident.rootCause) setRootCause(incident.rootCause);
      if (notes === '' && incident.closureNotes) setNotes(incident.closureNotes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!incident) {
    return (
      <div>
        <div className="pagehead">
          <Crumbs trail={['Operations', 'Incidents', 'Close Incident']} />
          <h1>Incident not found</h1>
          <p className="lede">No record found with ID {id ?? '(unknown)'}.</p>
        </div>
        <div className="actions-bar">
          <FioriButton icon="back" to="/operations/incidents">
            Back to incidents
          </FioriButton>
        </div>
      </div>
    );
  }

  if (incident.operationalStatus !== 'RESTORED' && incident.operationalStatus !== 'CLOSED') {
    return (
      <div>
        <div className="pagehead">
          <Crumbs trail={['Operations', 'Incidents', 'Close Incident']} />
          <h1>Close Incident</h1>
          <p className="lede">
            {incident.id} · Route {incident.route} — {incident.disruptionType} · Normal
            service restored
          </p>
        </div>
        <Section title="Restore service first">
          <p className="muted">
            Closure opens after service is restored and recovery is complete.
          </p>
          <div className="actions-bar">
            <FioriButton
              design="emphasized"
              icon="detail"
              to={`/operations/incident/${incident.id}`}
            >
              Open workspace
            </FioriButton>
          </div>
        </Section>
      </div>
    );
  }

  if (incident.operationalStatus === 'CLOSED') {
    return <ClosedRecord incident={incident} />;
  }

  const commsComplete = incident.communicationStatus === 'PUBLISHED';
  // Only HIGH/CRITICAL force the review checkbox; LOW/MEDIUM keep the
  // checkbox value (default checked). The store still requires a truthy
  // review flag to close, so LOW/MEDIUM default through as checked.
  const needsReview = incident.severity === 'HIGH' || incident.severity === 'CRITICAL';
  const missingActual = incident.restoredAt === null;

  function onAddCorrective(): void {
    if (caAction.trim().length < 10) {
      setCaError('Corrective action needs at least 10 characters.');
      return;
    }
    if (caOwner.trim().length === 0 || caDue.trim() === '') {
      setCaError('Owner and due date are required.');
      return;
    }
    setCaError(undefined);
    addCorrective(incident!.id, { action: caAction.trim(), owner: caOwner.trim(), dueDate: caDue });
    setCaAction('');
  }

  function onClose(e: FormEvent): void {
    e.preventDefault();
    if (missingActual) {
      setCloseError('Record the actual restoration time in Recovery before closing.');
      return;
    }
    if (rootCause.trim().length < 10) {
      setCloseError('Root cause needs at least 10 characters.');
      return;
    }
    if (needsReview && !reviewRequired) {
      setCloseError('HIGH / CRITICAL incidents require a post-incident review.');
      return;
    }
    setCloseError(undefined);
    setReview(
      incident!.id,
      rootCause.trim(),
      needsReview ? true : reviewRequired,
      notes.trim() === '' ? null : notes.trim(),
    );
    closeIncident(incident!.id);
  }

  return (
    <div>
      <div className="pagehead">
        <Crumbs trail={['Operations', 'Incidents', 'Close Incident']} />
        <h1>Close Incident</h1>
        <p className="lede">
          {incident.id} · Route {incident.route} — {incident.disruptionType} · Normal
          service restored
        </p>
      </div>

      <div className="note warn" role="note">
        Post-Incident Review Required
      </div>

      <form onSubmit={onClose} noValidate>
        <Section title="Closure Details">
          {closeError && (
            <p className="field-error" role="alert">
              {closeError}
            </p>
          )}
          {missingActual ? (
            <div className="note warn" role="alert">
              Actual restoration time is not recorded yet. Record it in Recovery
              before closing — restoration time is edited only there.
              <div className="actions-bar">
                <FioriButton design="emphasized" icon="arrowRight" to="/operations/recovery">
                  Back to Recovery
                </FioriButton>
              </div>
            </div>
          ) : (
            <dl className="facts-grid">
              <div className="fact">
                <dt>Actual Restoration Time</dt>
                <dd>{incident.restoredAt ? formatNzdtShort(incident.restoredAt) : '—'}</dd>
              </div>
            </dl>
          )}
          <div className="form-grid">
            <SapInput
              id={`rc-${incident.id}`}
              label="Root Cause"
              required
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              placeholder="e.g. Vehicle mechanical failure"
            />
          </div>
          <div className="field field-check">
            <input id={`cc-${incident.id}`} type="checkbox" checked={commsComplete} disabled />
            <label htmlFor={`cc-${incident.id}`}>Passenger Communication Complete</label>
          </div>
          <div className="field field-check">
            <input
              id={`rr-${incident.id}`}
              type="checkbox"
              checked={reviewRequired}
              onChange={(e) => setReviewRequired(e.target.checked)}
            />
            <label htmlFor={`rr-${incident.id}`}>Review Required</label>
          </div>
          <Field id={`cn-${incident.id}`} label="Closure Notes">
            <textarea
              id={`cn-${incident.id}`}
              className="input"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Normal services restored; review follow-up actions."
            />
          </Field>
        </Section>

        <Section
          title="Corrective Actions"
          count={`${incident.correctiveActions.length} record${incident.correctiveActions.length === 1 ? '' : 's'}`}
        >
          {incident.correctiveActions.length === 0 ? (
            <EmptyState
              illustration="✎"
              title="No corrective actions yet"
              description="We recommend recording at least the first follow-up action before closing."
            />
          ) : (
            <DataTable<CorrectiveAction>
              rows={incident.correctiveActions}
              columns={correctiveColumns}
              rowKey={(c) => c.id}
              searchText={correctiveSearch}
              searchPlaceholder="Search corrective actions"
              pageSize={8}
              emptyTitle="No corrective actions yet"
              emptyDescription="We recommend recording at least the first follow-up action before closing."
            />
          )}
          <p className="muted small">
            HIGH / CRITICAL incidents require a post-incident review. Corrective actions
            remain open after incident closure.
          </p>
          <SapInput
            id={`ca-${incident.id}`}
            label="New corrective action"
            value={caAction}
            onChange={(e) => setCaAction(e.target.value)}
            placeholder="e.g. Review operator early-notification procedure"
            error={caError}
          />
          <div className="form-grid">
            <SapSelect
              id={`cao-${incident.id}`}
              label="Action owner"
              value={CORRECTIVE_OWNER_ROSTER.includes(caOwner) ? caOwner : CORRECTIVE_OWNER_ROSTER[0]}
              onChange={setCaOwner}
              options={CORRECTIVE_OWNER_ROSTER.map((o) => ({ value: o, label: o }))}
            />
            <SapDateTime
              id={`cad-${incident.id}`}
              label="Due date"
              mode="date"
              value={caDue}
              onChange={setCaDue}
            />
          </div>
          <div className="actions-bar">
            <FioriButton icon="plus" onClick={onAddCorrective}>
              Add follow-up action
            </FioriButton>
          </div>
        </Section>

        <div className="actions-bar">
          <FioriButton design="transparent" icon="back" to={`/operations/incident/${incident.id}`}>
            Cancel
          </FioriButton>
          <FioriButton design="negative" icon="decline" type="submit" disabled={missingActual}>
            Close Incident
          </FioriButton>
        </div>
        {missingActual && (
          <p className="muted small">
            Closure is disabled until the actual restoration time is recorded in Recovery.
          </p>
        )}
      </form>
    </div>
  );
}

function ClosedRecord({ incident }: { incident: Incident }): React.JSX.Element {
  const kpi = firstCommunicationKpi(incident);
  const durationMs =
    incident.restoredAt && incident.detectedAt
      ? Date.parse(incident.restoredAt) - Date.parse(incident.detectedAt)
      : null;
  const openActions = incident.correctiveActions.filter((c) => c.status === 'OPEN').length;

  return (
    <div>
      <div className="pagehead">
        <Crumbs trail={['Operations', 'Incidents', incident.id]} />
        <div className="pagehead-with-action">
          <h1>{incident.id} · Incident Closed</h1>
          <div className="actions-bar">
            <span className="badge st-idle">○ CLOSED</span>
          </div>
        </div>
        <p className="lede">
          Route {incident.route} — {incident.disruptionType} · {incident.location}
        </p>
      </div>

      <div className="success" role="status">
        Incident closed. The post-incident review and corrective action remain open.
      </div>

      <div className="kpi-grid">
        <KpiCard
          title="Duration"
          value={durationMs === null ? '—' : `${Math.round(durationMs / 60000)} min`}
          context={
            incident.restoredAt
              ? `${formatNzdtShort(incident.detectedAt)}–${formatNzdtShort(incident.restoredAt)}`
              : '—'
          }
        />
        <KpiCard
          title="First Passenger Communication"
          value={kpi.elapsedMs === null ? '—' : formatMmSs(kpi.elapsedMs)}
          context={
            incident.firstPublishedAt
              ? `Published at ${formatNzdtShort(incident.firstPublishedAt)}`
              : 'Not published'
          }
        />
        <KpiCard
          title="Target"
          value={kpi.targetMet ? 'Met' : '—'}
          tone={kpi.targetMet ? 'good' : undefined}
          context="≤10 minutes"
        />
        <KpiCard
          title="Communication Coverage"
          value={incident.communicationStatus === 'PUBLISHED' ? 'Complete' : 'Pending'}
          context={
            incident.selectedChannels.length > 0
              ? incident.selectedChannels.join(' · ')
              : 'No channels'
          }
        />
      </div>

      <Section title="Closure Summary">
        <dl className="facts-grid">
          <div className="fact">
            <dt>Actual Restoration Time</dt>
            <dd>{incident.restoredAt ? formatNzdtShort(incident.restoredAt) : '—'}</dd>
          </div>
          <div className="fact">
            <dt>Root Cause</dt>
            <dd>{incident.rootCause ?? '—'}</dd>
          </div>
          <div className="fact">
            <dt>Owner</dt>
            <dd>{incident.owner ?? '— unassigned'}</dd>
          </div>
        </dl>
        <p>
          {incident.severity && <SeverityBadge level={incident.severity} />}{' '}
          {incident.reviewRequired && <span className="badge tg-warn">▲ Review Required</span>}
        </p>
        {incident.closureNotes && <p>{incident.closureNotes}</p>}
        <div className="actions-bar">
          <FioriButton design="emphasized" icon="detail" to="/operations/reviews">
            View Post-Incident Review
          </FioriButton>
        </div>
      </Section>

      <Section title="Corrective Actions">
        <p className="muted small">
          {incident.correctiveActions.length} record
          {incident.correctiveActions.length === 1 ? '' : 's'}
        </p>
        {incident.correctiveActions.length === 0 ? (
          <EmptyState
            illustration="✎"
            title="No corrective actions"
            description="No follow-up actions were recorded for this incident."
          />
        ) : (
          <DataTable<CorrectiveAction>
            rows={incident.correctiveActions}
            columns={correctiveColumns}
            rowKey={(c) => c.id}
            searchText={correctiveSearch}
            searchPlaceholder="Search corrective actions"
            pageSize={8}
            emptyTitle="No corrective actions"
            emptyDescription="No follow-up actions were recorded for this incident."
          />
        )}
        <p className="muted small">
          {openActions} open action{openActions === 1 ? '' : 's'} · Showing all records
        </p>
      </Section>
    </div>
  );
}
