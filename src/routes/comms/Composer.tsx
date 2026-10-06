import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CommsTargetBadge, SeverityBadge } from '../../components/badges.js';
import { Section } from '../../components/chrome.js';
import { ConfirmDialog } from '../../components/ConfirmDialog.js';
import { Field } from '../../components/forms.js';
import {
  buildMessageTemplate,
  buildTitle,
  CHANNELS,
  validateDraft,
  type DraftErrors,
  type DraftInput,
} from '../../domain/comms.js';
import {
  FIRST_COMM_TARGET_MS,
  firstCommunicationKpi,
  formatMmSs,
  formatNzdtTime,
} from '../../domain/kpi.js';
import type { Incident } from '../../domain/types.js';
import { useAppStore } from '../../state/AppStore.js';

function useNowTick(active: boolean): string {
  const [now, setNow] = useState(() => new Date().toISOString());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(new Date().toISOString()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

/**
 * Passenger message composer. Drafts from incident facts, previews the
 * passenger notice, and publishes through a confirmation dialog. Publishing
 * records firstPublishedAt and stops the 10-minute KPI clock.
 */
export function Composer(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { setRole, getIncident, saveDraft, publishComms } = useAppStore();

  useEffect(() => {
    setRole('CUSTOMER_INFORMATION');
  }, [setRole]);

  const incident = id ? getIncident(id) : undefined;

  const existing = incident?.commsDraft;
  const [form, setForm] = useState<DraftInput | null>(null);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [confirming, setConfirming] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);

  const draft: DraftInput =
    form ??
    (existing
      ? {
          title: existing.title,
          message: existing.message,
          channels: [...existing.channels],
          nextUpdateBy: existing.nextUpdateBy,
          commitmentOwner: existing.commitmentOwner,
        }
      : null) ??
    (incident
      ? {
          title: buildTitle(incident),
          message: buildMessageTemplate(incident),
          channels: [],
          nextUpdateBy: '',
          commitmentOwner: 'Talia Reed',
        }
      : { title: '', message: '', channels: [], nextUpdateBy: '', commitmentOwner: '' });

  const counting = incident !== undefined && incident.firstPublishedAt === null;
  const nowIso = useNowTick(counting);

  if (!incident) {
    return (
      <div>
        <h1>Incident not found</h1>
        <p className="muted">No shared record with ID {id ?? '(unknown)'} in this demo state.</p>
        <Link className="btn btn-link" to="/comms">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (incident.operationalStatus === 'REPORTED') {
    return (
      <div>
        <div className="pagehead">
          <span className="eyebrow">AT Customer Information</span>
          <h1>Prepare passenger communication</h1>
          <p>
            <Link to="/comms">← Back to dashboard</Link>
          </p>
        </div>
        <Section title={`${incident.id} — awaiting validation`}>
          <p className="muted">
            Customer Information works from validated information. This notification is
            still REPORTED — AT Operations must validate it before a draft can be
            prepared.
          </p>
        </Section>
      </div>
    );
  }

  // Narrowed once for handlers below (direct code after the guards is fine).
  const record: Incident = incident;

  const set = (key: 'title' | 'message' | 'nextUpdateBy' | 'commitmentOwner') => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm({ ...draft, [key]: e.target.value });

  function toggleChannel(channel: string): void {
    setForm({
      ...draft,
      channels: draft.channels.includes(channel)
        ? draft.channels.filter((c) => c !== channel)
        : [...draft.channels, channel],
    });
  }

  function onSaveDraft(): void {
    const found = validateDraft(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    saveDraft(record.id, draft);
    setForm({ ...draft });
    setDraftSavedAt(new Date().toISOString());
  }

  function onPublishStart(): void {
    const found = validateDraft(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setConfirming(true);
  }

  function onPublishConfirm(): void {
    publishComms(record.id, draft);
    setForm({ ...draft });
    setConfirming(false);
  }

  const kpi = firstCommunicationKpi(incident, nowIso);
  const deadline =
    incident.confirmedAt === null
      ? null
      : new Date(Date.parse(incident.confirmedAt) + FIRST_COMM_TARGET_MS).toISOString();
  const published = incident.communicationStatus === 'PUBLISHED';
  const timeline = [...incident.timeline].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const tasksDone = incident.recoveryTasks.filter((t) => t.doneAt !== null).length;

  return (
    <div>
      <div className="pagehead">
        <span className="eyebrow">AT Customer Information</span>
        <h1>Prepare passenger communication</h1>
        <p className="lede">
          Publish accurate service information from verified facts, with a clear
          next-update commitment.
        </p>
        <p>
          <Link to="/comms">← Back to dashboard</Link>{' '}
          {!published && (
            <button className="btn btn-primary" type="button" onClick={onPublishStart}>
              ➤ Publish initial update
            </button>
          )}
        </p>
      </div>

      {published && (
        <div className="success" role="status">
          <strong>
            Initial update published — target {kpi.targetMet ? 'achieved' : 'exceeded'}
            {kpi.elapsedMs === null ? '' : ` (${Math.round(kpi.elapsedMs / 60000)} min)`}.
          </strong>
          <div>
            AT Operations can immediately see this publication status on the same shared
            record.
          </div>
        </div>
      )}

      <Section title="Confirmed incident facts">
        <p className="muted small">
          <SeverityBadge level={incident.severity} /> Owner: {incident.owner ?? '—'} ·
          Recovery: {tasksDone}/{incident.recoveryTasks.length} tasks complete
        </p>
        <dl className="facts">
          <dt>Service</dt>
          <dd>
            Route {incident.route} · {incident.vehicleOrServiceId}
          </dd>
          <dt>Location</dt>
          <dd>{incident.location}</dd>
          <dt>Cause</dt>
          <dd>{incident.disruptionType}</dd>
          <dt>Impact</dt>
          <dd>
            {incident.estimatedDelayMinutes}-min delay · {incident.passengerImpact} passenger
            impact
          </dd>
          <dt>Restoration time</dt>
          <dd>{incident.restoredAt ? formatNzdtTime(incident.restoredAt) : 'Not confirmed · do not promise'}</dd>
        </dl>
      </Section>

      <div className="form-layout">
        <div>
          <Section title="Initial passenger update">
            <Field id="c-title" label="Passenger-facing title" required error={errors.title}>
              <input
                id="c-title"
                className="input"
                value={draft.title}
                disabled={published}
                onChange={set('title')}
                aria-invalid={Boolean(errors.title)}
              />
            </Field>
            <Field
              id="c-message"
              label="Passenger-facing message"
              required
              error={errors.message}
              hint="Plain language. No internal references, unverified detours or unsupported recovery estimates."
            >
              <textarea
                id="c-message"
                className="input"
                rows={6}
                value={draft.message}
                disabled={published}
                onChange={set('message')}
                aria-invalid={Boolean(errors.message)}
              />
            </Field>
            <div className="form-grid">
              <Field
                id="c-next"
                label="Next passenger update by (NZDT)"
                required
                error={errors.nextUpdateBy}
              >
                <input
                  id="c-next"
                  className="input"
                  placeholder="HH:MM"
                  value={draft.nextUpdateBy}
                  disabled={published}
                  onChange={set('nextUpdateBy')}
                  aria-invalid={Boolean(errors.nextUpdateBy)}
                />
              </Field>
              <Field
                id="c-owner"
                label="Commitment owner"
                required
                error={errors.commitmentOwner}
              >
                <input
                  id="c-owner"
                  className="input"
                  value={draft.commitmentOwner}
                  disabled={published}
                  onChange={set('commitmentOwner')}
                  aria-invalid={Boolean(errors.commitmentOwner)}
                />
              </Field>
            </div>
            {draftSavedAt && (
              <p className="muted small">Draft saved {formatNzdtTime(draftSavedAt)} — saving a draft does not stop the clock.</p>
            )}
            {!published && (
              <button className="btn" type="button" onClick={onSaveDraft}>
                Save draft
              </button>
            )}
          </Section>

          <Section title="Channels & publication approval">
            <p className="muted small">
              Selected destinations are illustrative; no live messages will be sent.
            </p>
            <fieldset className="channels">
              <legend className="muted small">Publication channels *</legend>
              {CHANNELS.map((c) => (
                <label key={c} className="channel">
                  <input
                    type="checkbox"
                    checked={draft.channels.includes(c)}
                    disabled={published}
                    onChange={() => toggleChannel(c)}
                  />
                  {c}
                </label>
              ))}
            </fieldset>
            {errors.channels && (
              <p className="field-error" role="alert">
                {errors.channels}
              </p>
            )}
            <ul className="checklist">
              <li className="ok">
                <span aria-hidden="true">☑</span> Facts match the incident record
              </li>
              <li className="ok">
                <span aria-hidden="true">☑</span> No unsupported recovery time promised
              </li>
              <li className="ok">
                <span aria-hidden="true">☑</span> Next update and owner confirmed
              </li>
            </ul>
            {!published && (
              <p>
                <button className="btn btn-primary" type="button" onClick={onPublishStart}>
                  ➤ Publish initial update
                </button>
              </p>
            )}
          </Section>

          <Section title="Audit timeline (newest first)">
            <ul className="timeline">
              {timeline.map((e) => (
                <li key={e.id}>
                  <span className="t-at">{formatNzdtTime(e.at)}</span>
                  <span className="t-action">{e.action}</span>
                  <div className="t-detail">
                    {e.actorRole} · {e.detail}
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <aside>
          <div className={`countcard${published ? (kpi.targetMet ? ' good' : ' bad') : ''}`}>
            <h3>Initial passenger update</h3>
            {published ? (
              <>
                <div className="count-big">
                  {kpi.elapsedMs === null ? '–' : `${Math.round(kpi.elapsedMs / 60000)}:00`}
                </div>
                <p>
                  <CommsTargetBadge incident={incident} />
                </p>
                <p className="muted small">
                  Published{' '}
                  {incident.firstPublishedAt ? formatNzdtTime(incident.firstPublishedAt) : '–'}
                </p>
              </>
            ) : (
              <>
                <div className="count-big">
                  {kpi.remainingMs === null
                    ? '–'
                    : kpi.remainingMs <= 0
                      ? formatMmSs(-kpi.remainingMs)
                      : formatMmSs(kpi.remainingMs)}
                </div>
                <p>
                  <CommsTargetBadge incident={incident} />
                </p>
                <p className="muted small">
                  Elapsed {kpi.elapsedMs === null ? '–' : formatMmSs(kpi.elapsedMs)} · deadline{' '}
                  {deadline ? formatNzdtTime(deadline) : '–'}
                </p>
              </>
            )}
            <div className="note">
              Publishing records the first-update time. The target is measured when the
              initial update is published, not when the draft is saved.
            </div>
          </div>

          <Section title="Passenger preview">
            <div className="preview">
              <p className="muted small">BUS SERVICE ALERT · DEMO · {draft.channels.join(' + ') || 'No channel selected'}</p>
              <h3>{draft.title || '(untitled)'}</h3>
              <p>{draft.message || '(no message)'}</p>
              <p className="muted small">
                {published
                  ? `Published ${incident.firstPublishedAt ? formatNzdtTime(incident.firstPublishedAt) : ''}.`
                  : 'Publication time will be added when published.'}
              </p>
            </div>
            <p className="muted small">Preview only — same message is used for all selected channels.</p>
          </Section>
        </aside>
      </div>

      {confirming && (
        <ConfirmDialog
          title="Publish initial passenger update?"
          summary={[
            `Title: ${draft.title}`,
            `Channels: ${draft.channels.join(' + ')}`,
            `Next update commitment: ${draft.nextUpdateBy} NZDT · ${draft.commitmentOwner}`,
            `This records the first-update time (${kpi.elapsedMs === null ? '–' : formatMmSs(kpi.elapsedMs)} elapsed).`,
          ]}
          checkLabel="I have checked the facts and the selected channels"
          disclaimer="Demo publication only. No live channel is connected. The publication result is synthetic."
          confirmLabel="Confirm & publish"
          onConfirm={onPublishConfirm}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
