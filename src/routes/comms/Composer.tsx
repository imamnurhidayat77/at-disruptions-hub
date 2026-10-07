import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CommsTargetBadge, OpStatusBadge, SeverityBadge } from '../../components/badges.js';
import { Section } from '../../components/chrome.js';
import { ConfirmDialog } from '../../components/ConfirmDialog.js';
import { Field } from '../../components/forms.js';
import {
  buildMessageTemplate,
  buildTitle,
  CHANNELS,
  targetProgress,
  validateDraft,
  type DraftErrors,
  type DraftInput,
} from '../../domain/comms.js';
import { lastOperatorUpdateAt } from '../../domain/contractor.js';
import {
  FIRST_COMM_TARGET_MS,
  firstCommunicationKpi,
  formatMmSs,
  formatNzdtTime,
} from '../../domain/kpi.js';
import { operationalStatusLabel } from '../../domain/operations.js';
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
 * Prepare Passenger Update — read-only operational summary, editable
 * passenger message, channel selection, preview, live 10-minute timer and
 * Approve & Publish. First publication stops the KPI clock; follow-up
 * publications never reset firstPublishedAt.
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
  const [followUp, setFollowUp] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setForm(null);
    setErrors({});
    setConfirming(false);
    setFollowUp(false);
    setDraftSavedAt(null);
  }, [id]);

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
          channels: ['AT Mobile App', 'Website'],
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
          Back to overview
        </Link>
      </div>
    );
  }

  if (incident.operationalStatus === 'REPORTED') {
    return (
      <div>
        <div className="pagehead">
          <span className="eyebrow">AT Customer Information</span>
          <h1>Prepare Passenger Update</h1>
          <p>
            <Link to="/comms/queue">← Back to queue</Link>
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

  const set =
    (key: 'title' | 'message' | 'nextUpdateBy' | 'commitmentOwner') =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...draft, [key]: e.target.value });

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
    setFollowUp(false);
  }

  const kpi = firstCommunicationKpi(incident, nowIso);
  const deadline =
    incident.confirmedAt === null
      ? null
      : new Date(Date.parse(incident.confirmedAt) + FIRST_COMM_TARGET_MS).toISOString();
  const published = incident.communicationStatus === 'PUBLISHED';
  const editable = !published || followUp;
  const timeline = [...incident.timeline].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const tasksDone = incident.recoveryTasks.filter((t) => t.doneAt !== null).length;
  const lastUpdate = lastOperatorUpdateAt(incident);
  const progress = targetProgress(kpi.elapsedMs);
  const firstMinutes = kpi.elapsedMs === null ? '–' : `${Math.round(kpi.elapsedMs / 60000)} min`;

  return (
    <div>
      <div className="pagehead">
        <span className="eyebrow">AT Customer Information</span>
        <h1>Prepare Passenger Update</h1>
        <p className="lede">
          Incident {incident.id} · Route {incident.route} ·{' '}
          {incident.severity ?? 'Severity not yet assessed'}
        </p>
        <p>
          <Link to="/comms/queue">← Back to queue</Link>{' '}
          {!published && (
            <button className="btn btn-primary" type="button" onClick={onPublishStart}>
              Approve &amp; Publish
            </button>
          )}
        </p>
      </div>

      {published && !followUp && (
        <div className="success" role="status">
          <strong>
            Passenger update published —{' '}
            {kpi.targetMet ? 'TARGET MET' : kpi.targetMet === false ? 'TARGET EXCEEDED' : ''}
          </strong>
          <div>Published: {incident.firstPublishedAt ? formatNzdtTime(incident.firstPublishedAt) : '–'}</div>
          <div>
            First Communication Time: {firstMinutes}
            {kpi.targetMet ? ' — published within the 10-minute communication target.' : ''}
          </div>
          <div>
            Channels:{' '}
            {incident.selectedChannels.length > 0
              ? incident.selectedChannels.map((c) => `✓ ${c}`).join(' · ')
              : '—'}
          </div>
          <p>
            <a className="btn" href="#incident-summary">
              View Incident
            </a>{' '}
            <button className="btn btn-primary" type="button" onClick={() => setFollowUp(true)}>
              ➤ Publish Follow-Up Update
            </button>
          </p>
        </div>
      )}

      {followUp && (
        <div className="note" role="status">
          Preparing a follow-up update. Publishing it adds a new timeline event but never
          resets the first-publication time ({firstMinutes}).
        </div>
      )}

      <Section id="incident-summary" title="Operational summary (read-only)">
        <p className="muted small">
          <SeverityBadge level={incident.severity} />{' '}
          <OpStatusBadge status={incident.operationalStatus} /> Recovery:{' '}
          {tasksDone}/{incident.recoveryTasks.length} tasks complete
        </p>
        <dl className="facts">
          <dt>Incident ID</dt>
          <dd>{incident.id}</dd>
          <dt>Route</dt>
          <dd>{incident.route}</dd>
          <dt>Location</dt>
          <dd>{incident.location}</dd>
          <dt>Operator</dt>
          <dd>{incident.operator}</dd>
          <dt>Disruption type</dt>
          <dd>{incident.disruptionType}</dd>
          <dt>AT Severity</dt>
          <dd>{incident.severity ?? 'Not yet assessed'}</dd>
          <dt>Operational status</dt>
          <dd>{operationalStatusLabel(incident.operationalStatus)}</dd>
          <dt>Estimated delay</dt>
          <dd>{incident.estimatedDelayMinutes} minutes</dd>
          <dt>Estimated restoration</dt>
          <dd>
            {incident.estimatedRestorationAt
              ? formatNzdtTime(incident.estimatedRestorationAt)
              : 'Not confirmed · do not promise'}
          </dd>
          <dt>Incident owner</dt>
          <dd>{incident.owner ?? '— unassigned'}</dd>
          <dt>Latest operator update</dt>
          <dd>{lastUpdate ? formatNzdtTime(lastUpdate) : '— initial notification only'}</dd>
        </dl>
        <div className="note">
          Severity, ownership and recovery decisions belong to AT Operations and cannot
          be changed here.
        </div>
      </Section>

      <div className="form-layout">
        <div>
          <Section title={published ? 'Passenger update' : 'Initial passenger update'}>
            <Field id="c-title" label="Message title" required error={errors.title}>
              <input
                id="c-title"
                className="input"
                value={draft.title}
                disabled={!editable}
                onChange={set('title')}
                aria-invalid={Boolean(errors.title)}
              />
            </Field>
            <Field
              id="c-message"
              label="Passenger message"
              required
              error={errors.message}
              hint="Plain language. No internal references, unverified detours or unsupported recovery estimates."
            >
              <textarea
                id="c-message"
                className="input"
                rows={6}
                value={draft.message}
                disabled={!editable}
                onChange={set('message')}
                aria-invalid={Boolean(errors.message)}
              />
            </Field>
            <p className="muted small">{draft.message.trim().length} characters</p>
            <div className="form-grid">
              <Field
                id="c-next"
                label="Next update time (NZDT, optional)"
                error={errors.nextUpdateBy}
                hint="Leave blank when no commitment can be made yet."
              >
                <input
                  id="c-next"
                  className="input"
                  placeholder="HH:MM"
                  value={draft.nextUpdateBy}
                  disabled={!editable}
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
                  disabled={!editable}
                  onChange={set('commitmentOwner')}
                  aria-invalid={Boolean(errors.commitmentOwner)}
                />
              </Field>
            </div>
            {draftSavedAt && (
              <p className="muted small">
                Draft saved {formatNzdtTime(draftSavedAt)} — saving a draft does not stop the
                clock.
              </p>
            )}
            {editable && (
              <p>
                <button className="btn" type="button" onClick={onSaveDraft}>
                  ✎ Save draft
                </button>
              </p>
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
                    disabled={!editable}
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
            {editable && (
              <p>
                <button className="btn btn-primary" type="button" onClick={onPublishStart}>
                  {published ? '➤ Publish follow-up update' : '➤ Approve & Publish'}
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
            <h3>First Communication Target</h3>
            {published ? (
              <>
                <div className="count-big">
                  {kpi.elapsedMs === null ? '–' : formatMmSs(kpi.elapsedMs)}
                </div>
                <p>
                  <CommsTargetBadge incident={incident} />
                </p>
                <p className="muted small">
                  Published{' '}
                  {incident.firstPublishedAt ? formatNzdtTime(incident.firstPublishedAt) : '–'} ·
                  target ≤10:00
                </p>
              </>
            ) : (
              <>
                <div className="count-big">
                  {kpi.elapsedMs === null ? '–' : `${formatMmSs(kpi.elapsedMs)} elapsed`}
                </div>
                <p className="muted small">
                  {kpi.remainingMs === null
                    ? 'Target: ≤10:00'
                    : `${formatMmSs(Math.max(0, kpi.remainingMs))} remaining · target ≤10:00`}
                </p>
                <div className="progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                  <div className="progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
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
                  ? `Updated ${incident.firstPublishedAt ? formatNzdtTime(incident.firstPublishedAt) : ''}.`
                  : 'Updated time will be added when published.'}
              </p>
            </div>
            <p className="muted small">Preview only — same message is used for all selected channels.</p>
          </Section>
        </aside>
      </div>

      {confirming && (
        <ConfirmDialog
          title={published ? 'Publish follow-up passenger update?' : 'Publish passenger update?'}
          summary={[
            `Incident: ${record.id}`,
            `Channels: ${draft.channels.join(' + ') || 'none'}`,
            ...(draft.nextUpdateBy.trim() !== ''
              ? [`Next update commitment: ${draft.nextUpdateBy.trim()} NZDT · ${draft.commitmentOwner.trim() || '—'}`]
              : []),
            published
              ? 'This is a follow-up — the first-publication time stays unchanged.'
              : `This records the first-update time (${kpi.elapsedMs === null ? '–' : formatMmSs(kpi.elapsedMs)} elapsed).`,
          ]}
          checkLabel="I have checked the facts and the selected channels"
          disclaimer="Demo publication only. No live channel is connected. The publication result is synthetic."
          confirmLabel="Approve & Publish"
          onConfirm={onPublishConfirm}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
