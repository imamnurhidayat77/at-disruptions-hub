import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { OpStatusBadge, SeverityBadge } from '../../components/badges.js';
import { FioriButton } from '../../components/Button.js';
import { Crumbs, Section } from '../../components/chrome.js';
import { DataTable, type DataColumn } from '../../components/DataTable.js';
import { Field } from '../../components/forms.js';
import { formatNzdtShort } from '../../domain/kpi.js';
import { lastOperatorUpdateAt, hasOperatorUpdates } from '../../domain/contractor.js';
import { validateOperatorUpdate } from '../../domain/reporting.js';
import type { TimelineEvent } from '../../domain/types.js';
import { useAppStore } from '../../state/AppStore.js';

/**
 * Contractor incident detail + operator update (Figma "02 Bus Contractor"
 * detail screen). AT assessment is read-only; confirmed updates append to
 * the shared timeline — visible to all roles.
 */
export function IncidentDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { setRole, getIncident, addOperatorUpdate } = useAppStore();
  const [detail, setDetail] = useState('');
  const [delay, setDelay] = useState('');
  const [restoration, setRestoration] = useState('');
  const [errors, setErrors] = useState<{
    detail?: string;
    estimatedDelayMinutes?: string;
    restoration?: string;
  }>({});
  const [saved, setSaved] = useState(false);
  const [updateCount, setUpdateCount] = useState<number | null>(null);

  useEffect(() => {
    setRole('CONTRACTOR');
  }, [setRole]);

  const incident = id ? getIncident(id) : undefined;

  if (!incident) {
    return (
      <div>
        <div className="pagehead">
          <Crumbs trail={['Bus Operator Portal', 'Incident']} />
          <h1>Incident not found</h1>
          <p className="lede">No record found with ID {id ?? '(unknown)'}.</p>
        </div>
        <div className="actions-bar">
          <FioriButton icon="back" to="/contractor">
            Back to overview
          </FioriButton>
        </div>
      </div>
    );
  }

  const closed = incident.operationalStatus === 'CLOSED';
  const lastUpdate = lastOperatorUpdateAt(incident);
  const requestEvent = [...incident.timeline]
    .reverse()
    .find((e) => e.action === 'More information requested');
  const updates = [...incident.timeline]
    .filter((e) => e.action === 'Operator sent confirmed update')
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  const updateColumns: Array<DataColumn<TimelineEvent>> = [
    {
      key: 'time',
      label: 'Time',
      sortable: true,
      sortValue: (e) => e.at,
      render: (e) => formatNzdtShort(e.at),
    },
    {
      key: 'by',
      label: 'Submitted by',
      render: () => incident.operator,
    },
    {
      key: 'detail',
      label: 'Update',
      render: (e) => e.detail,
    },
    {
      key: 'status',
      label: 'Status',
      render: () => <span className="badge tg-good">✓ Received by AT</span>,
    },
  ];

  function scrollToUpdate(): void {
    document.getElementById('send-update')?.scrollIntoView();
  }

  function onUpdate(e: FormEvent): void {
    e.preventDefault();
    const found = validateOperatorUpdate({ detail, estimatedDelayMinutes: delay });
    const next: {
      detail?: string;
      estimatedDelayMinutes?: string;
      restoration?: string;
    } = { ...found };
    let restorationIso: string | null = null;
    if (restoration.trim() !== '') {
      if (Number.isNaN(Date.parse(restoration))) {
        next.restoration = 'Enter a valid restoration time.';
      } else {
        restorationIso = `${restoration}:00+13:00`;
      }
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    addOperatorUpdate(
      incident!.id,
      detail.trim(),
      delay.trim() === '' ? null : Number.parseInt(delay, 10),
      restorationIso,
    );
    setDetail('');
    setDelay('');
    setRestoration('');
    setSaved(true);
  }

  return (
    <div>
      <div className="pagehead">
        <Crumbs trail={['Bus Operator Portal', 'My Incidents', incident.id]} />
        <div className="pagehead-with-action">
          <h1>{incident.id}</h1>
          {!closed && (
            <div className="actions-bar">
              <FioriButton icon="send" onClick={scrollToUpdate}>
                Send Update
              </FioriButton>
            </div>
          )}
        </div>
        <p className="lede">
          Route {incident.route} — {incident.disruptionType} · {incident.location}
        </p>
      </div>

      <Section title="AT Incident Status">
        <p>
          <OpStatusBadge status={incident.operationalStatus} />{' '}
          <SeverityBadge level={incident.severity} />
        </p>
        <dl className="facts-grid">
          <div className="fact">
            <dt>Operator</dt>
            <dd>{incident.operator}</dd>
          </div>
          <div className="fact">
            <dt>Estimated Delay</dt>
            <dd>{incident.estimatedDelayMinutes} min</dd>
          </div>
          <div className="fact">
            <dt>Estimated Restoration</dt>
            <dd>
              {incident.estimatedRestorationAt
                ? formatNzdtShort(incident.estimatedRestorationAt)
                : 'Not yet confirmed'}
            </dd>
          </div>
          <div className="fact">
            <dt>Last Operator Update</dt>
            <dd>
              {lastUpdate && hasOperatorUpdates(incident)
                ? formatNzdtShort(lastUpdate)
                : '—'}
            </dd>
          </div>
        </dl>
      </Section>

      <div className="grid-2">
        <Section title="Send Operator Update" id="send-update">
          {closed ? (
            <p className="muted">This incident is closed — no further operator updates.</p>
          ) : (
            <form onSubmit={onUpdate} noValidate>
              {saved && (
                <p className="success-inline" role="status">
                  Update recorded in the shared timeline — visible to all roles.
                </p>
              )}
              <Field
                id="u-detail"
                label="Update"
                required
                error={errors.detail}
                hint="Only send facts already confirmed with the depot or driver."
              >
                <textarea
                  id="u-detail"
                  className="input"
                  rows={4}
                  value={detail}
                  onChange={(e) => {
                    setDetail(e.target.value);
                    setSaved(false);
                  }}
                  aria-invalid={Boolean(errors.detail)}
                />
              </Field>
              <div className="form-grid">
                <Field
                  id="u-delay"
                  label="Estimated Delay"
                  error={errors.estimatedDelayMinutes}
                  hint="Leave blank to keep the current estimate."
                >
                  <input
                    id="u-delay"
                    className="input"
                    inputMode="numeric"
                    value={delay}
                    onChange={(e) => {
                      setDelay(e.target.value);
                      setSaved(false);
                    }}
                    aria-invalid={Boolean(errors.estimatedDelayMinutes)}
                  />
                </Field>
                <Field
                  id="u-restoration"
                  label="Estimated Restoration"
                  error={errors.restoration}
                >
                  <input
                    id="u-restoration"
                    className="input"
                    type="datetime-local"
                    value={restoration}
                    onChange={(e) => {
                      setRestoration(e.target.value);
                      setSaved(false);
                    }}
                    aria-invalid={Boolean(errors.restoration)}
                  />
                </Field>
              </div>
              <div className="actions-bar">
                <FioriButton design="emphasized" icon="send" type="submit">
                  Send Update
                </FioriButton>
              </div>
            </form>
          )}
        </Section>

        <Section title="AT request">
          {incident.infoRequested ? (
            <>
              <div className="note" role="note">
                Please confirm replacement vehicle availability and the estimated
                restoration time.
              </div>
              <p className="muted small">
                AT Operations · {incident.owner ?? 'Duty team'} ·{' '}
                {requestEvent ? formatNzdtShort(requestEvent.at) : ''}
              </p>
              <div className="actions-bar">
                <FioriButton icon="edit" onClick={scrollToUpdate}>
                  Respond
                </FioriButton>
              </div>
            </>
          ) : (
            <p className="muted">No open request from AT Operations.</p>
          )}
          <p className="muted small">
            Your updates support the shared incident record. Assessment and recovery
            coordination remain with Auckland Transport.
          </p>
        </Section>
      </div>

      <Section
        title="Operator Updates"
        count={`${updateCount ?? updates.length} record${(updateCount ?? updates.length) === 1 ? '' : 's'}`}
      >
        {updates.length === 0 ? (
          <p className="muted">No operator updates sent yet.</p>
        ) : (
          <DataTable<TimelineEvent>
            rows={updates}
            columns={updateColumns}
            rowKey={(e) => e.id}
            pageSize={8}
            emptyTitle="No operator updates sent yet."
            emptyDescription="Confirmed updates will appear here once sent."
            onFilteredCount={setUpdateCount}
          />
        )}
        <p className="table-foot">Showing all records</p>
      </Section>
    </div>
  );
}
