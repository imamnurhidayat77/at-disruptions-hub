import { useState } from 'react';
import { Field } from '../../components/forms.js';
import { Section } from '../../components/chrome.js';
import { formatNzdtTime } from '../../domain/kpi.js';
import type { Incident } from '../../domain/types.js';
import { useAppStore } from '../../state/AppStore.js';

/**
 * Operational recovery checklist — the parallel track to passenger
 * communication. Checking every task records restoration; unchecking
 * the final task reopens recovery (statuses follow automatically).
 */
export function RecoveryPanel({ incident }: { incident: Incident }): React.JSX.Element {
  const { toggleRecoveryTask, addRecoveryTask, logOperatorNote } = useAppStore();
  const [label, setLabel] = useState('');
  const [responsible, setResponsible] = useState('Operator liaison');
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | undefined>(undefined);
  const [labelError, setLabelError] = useState<string | undefined>(undefined);

  const locked = incident.operationalStatus === 'CLOSED';
  const done = incident.recoveryTasks.filter((t) => t.doneAt !== null).length;
  const firstDone = incident.recoveryTasks
    .map((t) => t.doneAt)
    .filter((d): d is string => d !== null)
    .sort()[0];

  function onAddTask(): void {
    if (label.trim().length < 5) {
      setLabelError('Task needs at least 5 characters.');
      return;
    }
    setLabelError(undefined);
    addRecoveryTask(incident.id, label.trim(), responsible.trim() || 'Incident owner');
    setLabel('');
  }

  function onLogNote(): void {
    if (note.trim().length < 10) {
      setNoteError('Coordination notes need at least 10 characters.');
      return;
    }
    setNoteError(undefined);
    logOperatorNote(incident.id, note.trim());
    setNote('');
  }

  return (
    <div>
      <Section title={`Recovery task board (${done}/${incident.recoveryTasks.length} complete)`}>
        <table className="records">
          <thead>
            <tr>
              <th>Done</th>
              <th>Task</th>
              <th>Responsible</th>
              <th>Checkpoint</th>
            </tr>
          </thead>
          <tbody>
            {incident.recoveryTasks.map((t) => (
              <tr key={t.id}>
                <td>
                  <input
                    type="checkbox"
                    className="check"
                    checked={t.doneAt !== null}
                    disabled={locked}
                    onChange={() => toggleRecoveryTask(incident.id, t.id)}
                    aria-label={t.label}
                  />
                </td>
                <td>
                  <strong>{t.label}</strong>
                </td>
                <td>{t.responsible}</td>
                <td>{t.doneAt ? `Done ${formatNzdtTime(t.doneAt)}` : 'Pending'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!locked && (
          <div className="form-grid" style={{ marginTop: 12 }}>
            <Field id="nt-label" label="New task" error={labelError}>
              <input
                id="nt-label"
                className="input"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Confirm depot standby bus"
              />
            </Field>
            <Field id="nt-resp" label="Responsible">
              <input
                id="nt-resp"
                className="input"
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
              />
            </Field>
          </div>
        )}
        {!locked && (
          <button className="btn" type="button" onClick={onAddTask}>
            + Add task
          </button>
        )}
      </Section>

      <Section title="Operator & dispatch coordination">
        <Field
          id="op-note"
          label="Latest coordination note"
          error={noteError}
          hint="Checkpoints are operator check-ins, not promises of recovery."
        >
          <textarea
            id="op-note"
            className="input"
            rows={3}
            value={note}
            disabled={locked}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Operator is arranging a replacement bus; arrival time not yet confirmed."
          />
        </Field>
        {!locked && (
          <button className="btn" type="button" onClick={onLogNote}>
            Log operator contact
          </button>
        )}
      </Section>

      <Section title="Recovery milestones">
        <dl className="facts">
          <dt>Recovery started</dt>
          <dd>{firstDone ? formatNzdtTime(firstDone) : 'Not yet confirmed'}</dd>
          <dt>Normal service restored</dt>
          <dd>{incident.restoredAt ? formatNzdtTime(incident.restoredAt) : 'Not yet confirmed'}</dd>
        </dl>
        {!incident.restoredAt && (
          <div className="note warn">
            <strong>No confirmed restoration time.</strong> Checkpoints are operator
            check-ins, not promises of recovery. Passenger updates must not present them
            as arrival or restoration times.
          </div>
        )}
      </Section>
    </div>
  );
}
