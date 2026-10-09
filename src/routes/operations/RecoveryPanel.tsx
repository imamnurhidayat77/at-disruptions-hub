import { useState } from 'react';
import { Field } from '../../components/forms.js';
import { SapDateTime } from '../../components/DateTimeField.js';
import { Section } from '../../components/chrome.js';
import { FioriButton } from '../../components/Button.js';
import { DataTable, type DataColumn } from '../../components/DataTable.js';
import { formatNzdtShort } from '../../domain/kpi.js';
import { OWNER_TITLES } from '../../domain/operations.js';
import type { Incident } from '../../domain/types.js';
import { useAppStore } from '../../state/AppStore.js';

interface RecoveryRecordRow {
  key: string;
}

/**
 * Recovery completion editor — Figma "03 AT Operations" frame.
 * The only place the recovery checklist is editable: check every task,
 * record the actual restoration time, save updates, then complete.
 * Completing requires all tasks done plus an actual time.
 */
export function RecoveryPanel({ incident }: { incident: Incident }): React.JSX.Element {
  const { toggleRecoveryTask, logOperatorNote, updateRestoration, completeRecovery } =
    useAppStore();
  const [note, setNote] = useState('');
  const [ert, setErt] = useState(incident.estimatedRestorationAt?.slice(0, 16) ?? '');
  const [actual, setActual] = useState(incident.restoredAt?.slice(0, 16) ?? '');
  const [completeError, setCompleteError] = useState<string | undefined>(undefined);
  const [noteError, setNoteError] = useState<string | undefined>(undefined);
  const [saved, setSaved] = useState(false);

  const locked = incident.operationalStatus === 'CLOSED';
  const done = incident.recoveryTasks.filter((t) => t.doneAt !== null).length;
  const total = incident.recoveryTasks.length;
  const allDone = total > 0 && done === total;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  function onSave(): void {
    updateRestoration(
      incident.id,
      ert.trim() === '' ? null : `${ert}:00+13:00`,
    );
    const trimmedNote = note.trim();
    if (trimmedNote.length > 0 && trimmedNote.length < 10) {
      setNoteError('Recovery notes need at least 10 characters — kept as a draft, not logged.');
      setSaved(false);
      return;
    }
    setNoteError(undefined);
    if (trimmedNote.length >= 10) {
      logOperatorNote(incident.id, trimmedNote);
      setNote('');
    }
    setSaved(true);
  }

  function onComplete(): void {
    if (!allDone) {
      setCompleteError('Complete every recovery task before completing recovery.');
      return;
    }
    if (actual.trim() === '' || Number.isNaN(Date.parse(actual))) {
      setCompleteError('Record the actual restoration time to complete recovery.');
      return;
    }
    setCompleteError(undefined);
    completeRecovery(incident.id, `${actual}:00+13:00`);
  }

  const recordRows: RecoveryRecordRow[] = [{ key: incident.id }];

  const recordColumns: Array<DataColumn<RecoveryRecordRow>> = [
    {
      key: 'incident',
      label: 'Incident',
      sortable: true,
      sortValue: () => incident.id,
      render: () => incident.id,
    },
    {
      key: 'route',
      label: 'Route',
      sortable: true,
      filter: 'select',
      filterValue: () => `Route ${incident.route}`,
      sortValue: () => incident.route,
      render: () => incident.route,
    },
    {
      key: 'ert',
      label: 'Estimated Restoration',
      sortable: true,
      sortValue: () => incident.estimatedRestorationAt ?? '',
      render: () =>
        incident.estimatedRestorationAt
          ? formatNzdtShort(incident.estimatedRestorationAt)
          : 'Not yet confirmed',
    },
    {
      key: 'actual',
      label: 'Actual Restoration',
      sortable: true,
      sortValue: () => incident.restoredAt ?? '',
      render: () => (incident.restoredAt ? formatNzdtShort(incident.restoredAt) : '—'),
    },
    {
      key: 'owner',
      label: 'Owner',
      sortable: true,
      sortValue: () => incident.owner ?? '',
      render: () => incident.owner ?? '— unassigned',
    },
    {
      key: 'next',
      label: 'Next action',
      sortable: true,
      sortValue: () => (incident.operationalStatus === 'RESTORED' ? 'Close Incident' : '—'),
      render: () =>
        incident.operationalStatus === 'RESTORED' ? (
          <FioriButton
            small
            icon="arrowRight"
            to={`/operations/incident/${incident.id}/close`}
          >
            Close Incident
          </FioriButton>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <div>
      <Section title="Operational Recovery">
        <div className="recovery-head">
          <p className="recovery-status">
            {allDone ? (
              <span className="badge tg-good">✓ Ready to complete</span>
            ) : (
              <span className="badge st-ops">◈ In Progress</span>
            )}
          </p>
          <p className="recovery-progress-label muted small" aria-live="polite">
            {done} of {total} tasks · {pct}%
          </p>
        </div>
        <div
          className="progress"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Recovery task progress"
        >
          <span className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <ul className="tasks">
          {incident.recoveryTasks.map((t) => {
            const isDone = t.doneAt !== null;
            return (
              <li key={t.id} className={`task${isDone ? ' done' : ''}`}>
                <label className="task-check">
                  <input
                    type="checkbox"
                    className="check"
                    checked={isDone}
                    disabled={locked}
                    onChange={() => toggleRecoveryTask(incident.id, t.id)}
                  />
                  <span className="task-label">{t.label}</span>
                </label>
                <span className="task-meta">
                  <span className="task-owner">{t.responsible}</span>
                  {t.doneAt ? (
                    <span className="task-done">Done {formatNzdtShort(t.doneAt)}</span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
        {!locked && (
          <>
            <div className="form-grid">
              <SapDateTime
                id={`ert-${incident.id}`}
                label="Estimated Restoration"
                value={ert}
                onChange={(v) => {
                  setErt(v);
                  setSaved(false);
                }}
              />
              <SapDateTime
                id={`actual-${incident.id}`}
                label="Actual Restoration Time"
                required
                value={actual}
                onChange={(v) => {
                  setActual(v);
                  setCompleteError(undefined);
                }}
                error={completeError}
              />
            </div>
            <Field
              id={`note-${incident.id}`}
              label="Operational Notes"
              error={noteError}
              hint={
                note.trim().length >= 10
                  ? 'Ready to log with Save.'
                  : `At least 10 characters to log with Save (${note.trim().length}/10).`
              }
            >
              <textarea
                id={`note-${incident.id}`}
                className="input"
                rows={3}
                value={note}
                disabled={locked}
                onChange={(e) => {
                  setNote(e.target.value);
                  setNoteError(undefined);
                }}
                placeholder="e.g. Replacement vehicle in service; normal service restored."
              />
            </Field>
            {saved && (
              <p className="success-inline" role="status">
                Recovery update saved.
              </p>
            )}
            <div className="actions-bar">
              <FioriButton icon="save" onClick={onSave}>
                Save Recovery Update
              </FioriButton>
              <FioriButton design="emphasized" icon="check" onClick={onComplete}>
                Complete Recovery
              </FioriButton>
            </div>
          </>
        )}
      </Section>

      <Section title="Recovery update">
        <dl className="facts-grid">
          <div className="fact">
            <dt>Owner</dt>
            <dd>{incident.owner ?? '— unassigned'}</dd>
          </div>
          <div className="fact">
            <dt>Operator</dt>
            <dd>{incident.operator}</dd>
          </div>
        </dl>
        <p className="muted small">
          {incident.owner && OWNER_TITLES[incident.owner]
            ? `${OWNER_TITLES[incident.owner]} · Recovery coordination`
            : 'Recovery coordination'}
        </p>
        <p>
          {incident.communicationStatus === 'PUBLISHED' ? (
            <span className="badge tg-good">✓ Passenger Communication Published</span>
          ) : (
            <span className="badge tg-warn">▲ Passenger Communication Required</span>
          )}
        </p>
      </Section>

      <Section title="Recovery record" count="1 record">
        <DataTable<RecoveryRecordRow>
          rows={recordRows}
          columns={recordColumns}
          rowKey={(r) => r.key}
          showFilterBar={false}
          pageSize={10}
          emptyTitle="No recovery record"
          emptyDescription="Recovery details appear here."
        />
        <p className="table-foot">Showing all records</p>
      </Section>
    </div>
  );
}
