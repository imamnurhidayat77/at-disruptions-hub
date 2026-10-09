import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { OpStatusBadge, SeverityBadge } from '../../components/badges.js';
import { FioriButton } from '../../components/Button.js';
import { Crumbs, Section } from '../../components/chrome.js';
import { Field, SapInput } from '../../components/forms.js';
import { SapDateTime } from '../../components/DateTimeField.js';
import {
  buildTemplateMessage,
  buildTemplateTitle,
  CHANNELS,
  validateDraft,
  type DraftErrors,
  type DraftInput,
  type TemplateKind,
} from '../../domain/comms.js';
import {
  firstCommunicationKpi,
  formatMmSs,
  formatNzdtShort,
  formatNzdtTime,
} from '../../domain/kpi.js';
import { useAppStore } from '../../state/AppStore.js';

const TEMPLATE_KINDS: TemplateKind[] = ['breakdown', 'recovery', 'restored'];

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
 * Passenger Message Workspace — Figma "04 Customer Information".
 * Editable title/message (500 chars), next-update time, channels
 * (Mobile App + Website pre-selected), live target strip, read-only
 * incident context, sticky footer actions, preview dialog, publish
  * confirmation. First publication stops the response timer and opens the
 * publication success page; follow-ups never reset firstPublishedAt.
 */
export function Composer(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state ?? {}) as {
    template?: TemplateKind;
    followUp?: boolean;
  };
  const { setRole, getIncident, saveDraft, publishComms } = useAppStore();

  useEffect(() => {
    setRole('CUSTOMER_INFORMATION');
  }, [setRole]);

  const incident = id ? getIncident(id) : undefined;
  const existing = incident?.commsDraft;

  const [form, setForm] = useState<DraftInput | null>(null);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [followUp, setFollowUp] = useState(locationState.followUp === true);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setForm(null);
    setErrors({});
    setPreviewing(false);
    setConfirming(false);
    setFollowUp(locationState.followUp === true);
    setDraftSavedAt(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const templateKind: TemplateKind = TEMPLATE_KINDS.includes(locationState.template ?? 'breakdown')
    ? (locationState.template ?? 'breakdown')
    : 'breakdown';

  const draft: DraftInput =
    form ??
    (existing
      ? {
          title: existing.title,
          message: existing.message,
          channels: [...existing.channels],
          nextUpdateBy: existing.nextUpdateBy,
        }
      : null) ??
    (incident
      ? {
          title: buildTemplateTitle(incident, templateKind),
          message: buildTemplateMessage(incident, templateKind),
          channels: ['AT Mobile App', 'Website'],
          nextUpdateBy: '',
        }
      : { title: '', message: '', channels: [], nextUpdateBy: '' });

  const counting = incident !== undefined && incident.firstPublishedAt === null;
  const nowIso = useNowTick(counting);

  if (!incident) {
    return (
      <div>
        <div className="pagehead">
          <Crumbs trail={['Customer Information', 'Passenger Message Workspace']} />
          <h1>Incident not found</h1>
          <p className="lede">No record found with ID {id ?? '(unknown)'}.</p>
        </div>
        <div className="actions-bar">
          <FioriButton icon="back" to="/comms">
            Back to overview
          </FioriButton>
        </div>
      </div>
    );
  }

  if (incident.operationalStatus === 'REPORTED') {
    return (
      <div>
        <div className="pagehead">
          <Crumbs trail={['Customer Information', 'Communication Queue', incident.id]} />
          <h1>Passenger Message Workspace</h1>
          <p className="lede">
            Incident {incident.id} · Route {incident.route} · awaiting validation.
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

  const record = incident;
  const published = record.communicationStatus === 'PUBLISHED';
  const editable = !published || followUp;
  const kpi = firstCommunicationKpi(record, nowIso);

  const set =
    (key: 'title' | 'message' | 'nextUpdateBy') =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...draft, [key]: e.target.value });

  const setTime = (value: string): void => {
    setForm({ ...draft, nextUpdateBy: value });
  };

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

  function onPreview(): void {
    const found = validateDraft(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setPreviewing(true);
  }

  function onPublishStart(): void {
    const found = validateDraft(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setPreviewing(false);
      return;
    }
    setPreviewing(false);
    setConfirming(true);
  }

  function onPublishConfirm(): void {
    publishComms(record.id, draft);
    setConfirming(false);
    setFollowUp(false);
    navigate(`/comms/published/${record.id}`);
  }

  return (
    <div>
      <div className="pagehead">
        <Crumbs trail={['Customer Information', 'Communication Queue', record.id]} />
        <h1>Passenger Message Workspace</h1>
        <p className="lede">
          {record.id} · Prepare Passenger Update
        </p>
      </div>

      {!published ? (
        <div className="note warn" role="note">
          {kpi.elapsedMs === null ? '—' : `${formatMmSs(kpi.elapsedMs)} elapsed`} ·{' '}
          {kpi.remainingMs === null ? 'Target: ≤10 minutes' : `${formatMmSs(Math.max(0, kpi.remainingMs))} remaining · Target: ≤10 minutes`} ·{' '}
          Not yet published
        </div>
      ) : (
        <div className="success" role="status">
          Published{kpi.targetMet ? ' within the 10-minute communication target' : ''} · First
          communication {kpi.elapsedMs === null ? '—' : formatMmSs(kpi.elapsedMs)}.
        </div>
      )}

      <div className="form-layout composer-layout">
        <div>
          <Section title="Prepare Passenger Update">
            <SapInput
              id="c-title"
              label="Message Title"
              required
              value={draft.title}
              onChange={set('title')}
              disabled={!editable}
              error={errors.title}
            />
            <Field
              id="c-message"
              label="Passenger Message"
              required
              error={errors.message}
            >
              <textarea
                id="c-message"
                className="input"
                rows={6}
                maxLength={500}
                value={draft.message}
                disabled={!editable}
                onChange={set('message')}
                aria-invalid={Boolean(errors.message)}
              />
            </Field>
            <p className="muted small">{draft.message.trim().length} / 500 characters</p>
            <SapDateTime
              id="c-next"
              label="Next Update Time"
              mode="time"
              value={draft.nextUpdateBy}
              onChange={setTime}
              disabled={!editable}
              error={errors.nextUpdateBy}
            />
            <fieldset className="channels">
              <legend>Channels</legend>
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
            <div className="note" role="note">
              Use validated disruption information. Keep the notice concise and
              passenger-focused.
            </div>
            {draftSavedAt && (
              <p className="muted small">
                Draft saved {formatNzdtTime(draftSavedAt)} — saving a draft does not stop the
                clock.
              </p>
            )}
          </Section>
        </div>

        <aside>
          <Section title="Incident Context">
            <p className="muted small">Read-only operational context</p>
            <p>
              <SeverityBadge level={record.severity} />{' '}
              <OpStatusBadge status={record.operationalStatus} />
            </p>
            <dl className="facts-grid">
              <div className="fact">
                <dt>Incident</dt>
                <dd>{record.id}</dd>
              </div>
              <div className="fact">
                <dt>Route</dt>
                <dd>{record.route}</dd>
              </div>
              <div className="fact">
                <dt>Location</dt>
                <dd>{record.location}</dd>
              </div>
              <div className="fact">
                <dt>Operator</dt>
                <dd>{record.operator}</dd>
              </div>
              <div className="fact">
                <dt>Estimated Delay</dt>
                <dd>{record.estimatedDelayMinutes} min</dd>
              </div>
              <div className="fact">
                <dt>Estimated Restoration</dt>
                <dd>
                  {record.estimatedRestorationAt
                    ? formatNzdtShort(record.estimatedRestorationAt)
                    : 'Not confirmed'}
                </dd>
              </div>
              <div className="fact">
                <dt>Owner</dt>
                <dd>{record.owner ?? '— unassigned'}</dd>
              </div>
            </dl>
            <p className="muted small">
              AT Operations owns service recovery. This workspace contains no recovery
              controls.
            </p>
          </Section>
        </aside>
      </div>

      {editable && (
        <div className="page-actions">
          <div className="actions-bar">
            <FioriButton icon="save" onClick={onSaveDraft}>
              Save Draft
            </FioriButton>
            <FioriButton icon="view" onClick={onPreview}>
              Preview
            </FioriButton>
            <FioriButton design="emphasized" icon="send" onClick={onPublishStart}>
              Approve &amp; Publish
            </FioriButton>
          </div>
        </div>
      )}

      {previewing && (
        <div className="dialog-backdrop" role="presentation" onClick={() => setPreviewing(false)}>
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Passenger update preview"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>
              <span className="dialog-icon info" aria-hidden="true">
                ℹ
              </span>{' '}
              Passenger Update Preview
            </h2>
            <p className="muted small">{record.id} · Preview only — not yet published</p>
            <button
              className="dialog-close"
              type="button"
              onClick={() => setPreviewing(false)}
              aria-label="Close dialog"
            >
              ×
            </button>
            <Section title={draft.title || 'Untitled notice'}>
              <p>
                <span className="badge tg-warn">▲ Service Disruption</span>
              </p>
              <p>{draft.message}</p>
              <dl className="facts-grid">
                <div className="fact">
                  <dt>Next Update</dt>
                  <dd>{draft.nextUpdateBy || '—'}</dd>
                </div>
                <div className="fact">
                  <dt>Channels</dt>
                  <dd>{draft.channels.join(' · ') || '—'}</dd>
                </div>
              </dl>
              <p className="muted small">
                This is a preview of the passenger notice, not a separate passenger
                application.
              </p>
            </Section>
            <div className="dialog-actions">
              <FioriButton icon="back" onClick={() => setPreviewing(false)}>
                Back to Edit
              </FioriButton>
              <FioriButton design="emphasized" icon="send" onClick={onPublishStart}>
                Approve &amp; Publish
              </FioriButton>
            </div>
          </div>
        </div>
      )}

      {confirming && (
        <div className="dialog-backdrop" role="presentation" onClick={() => setConfirming(false)}>
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Publish passenger update"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>
              <span className="dialog-icon" aria-hidden="true">
                ⚠
              </span>{' '}
              Publish Passenger Update?
            </h2>
            <p className="muted small">Confirm the notice and selected channels.</p>
            <button
              className="dialog-close"
              type="button"
              onClick={() => setConfirming(false)}
              aria-label="Close dialog"
            >
              ×
            </button>
            <dl className="facts-grid">
              <div className="fact">
                <dt>Incident</dt>
                <dd>{record.id}</dd>
              </div>
            </dl>
            <p>
              <strong>{draft.title}</strong>
            </p>
            <p className="muted small">Channels</p>
            {CHANNELS.map((c) => (
              <label key={c} className="channel">
                <input type="checkbox" checked={draft.channels.includes(c)} disabled /> {c}
              </label>
            ))}
            <div className="note" role="note">
              This publishes the passenger update and records the first communication time
              on the shared incident.
            </div>
            <div className="dialog-actions">
              <FioriButton icon="decline" onClick={() => setConfirming(false)}>
                Cancel
              </FioriButton>
              <FioriButton design="emphasized" icon="send" onClick={onPublishConfirm}>
                Approve &amp; Publish
              </FioriButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
