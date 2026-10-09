import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { FioriButton } from '../../components/Button.js';
import { Crumbs, Section } from '../../components/chrome.js';
import { Field, SapInput, SapSelect } from '../../components/forms.js';
import { SapDateTime } from '../../components/DateTimeField.js';
import {
  DISRUPTION_TYPES,
  EMPTY_REPORT,
  ROUTE_70_DEMO_VALUES,
  validateReport,
  validateReportStep1,
  validateReportStep2,
  type ReportErrors,
  type ReportInput,
} from '../../domain/reporting.js';
import { useAppStore } from '../../state/AppStore.js';

const DRAFT_KEY = 'at-disruption-hub/report-draft/v1';

const STEPS = ['Incident Details', 'Service Impact', 'Review'];

function loadDraft(): ReportInput {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY_REPORT;
    const parsed = JSON.parse(raw) as Partial<ReportInput>;
    return { ...EMPTY_REPORT, ...parsed };
  } catch {
    return EMPTY_REPORT;
  }
}

/**
 * Contractor disruption notification — Figma "02 Bus Contractor"
 * 3-step wizard (Incident Details → Service Impact → Review).
 * Submitting creates one shared REPORTED incident and opens the
 * Notification Sent screen; it never publishes passenger information.
 */
export function ReportPage(): React.JSX.Element {
  const { setRole, createIncident } = useAppStore();
  const navigate = useNavigate();
  const [form, setForm] = useState<ReportInput>(() => loadDraft());
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<ReportErrors>({});
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setRole('CONTRACTOR');
  }, [setRole]);

  const set =
    (key: keyof ReportInput) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value =
        e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
      setForm((f) => ({ ...f, [key]: value }));
      setDraftSavedAt(null);
    };

  const setVal =
    (key: 'disruptionType' | 'serviceContinues' | 'passengerImpact') =>
    (value: string): void => {
      setForm((f) => ({ ...f, [key]: value }) as ReportInput);
      setDraftSavedAt(null);
    };

  const setDetected = (value: string): void => {
    setForm((f) => ({ ...f, detectedAt: value }));
    setDraftSavedAt(null);
  };

  function onNext(): void {
    const found = step === 1 ? validateReportStep1(form) : validateReportStep2(form);
    setErrors(found);
    if (Object.keys(found).length === 0) setStep((s) => Math.min(3, s + 1));
  }

  function onSaveDraft(): void {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      setDraftSavedAt(new Date().toISOString());
    } catch {
      // Demo convenience only.
    }
  }

  function onNotify(): void {
    const found = validateReport(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setStep(Object.keys(validateReportStep1(form)).length > 0 ? 1 : 2);
      return;
    }
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // Ignore.
    }
    const id = createIncident(form);
    navigate(`/contractor/sent/${id}`);
  }

  return (
    <div>
      <div className="pagehead">
        <Crumbs trail={['Bus Operator Portal', 'Report Disruption']} />
        <h1>Report Disruption</h1>
        <p className="lede">
          Step {step} of 3 · {STEPS[step - 1]}
        </p>
      </div>

      <ol className="steps" aria-label="Report progress">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const cls = n < step ? 'step done' : n === step ? 'step current' : 'step';
          return (
            <li key={label} className={cls}>
              <span className="step-n">{n < step ? '✓' : n}</span> {label}
            </li>
          );
        })}
      </ol>

      <form onSubmit={(e) => e.preventDefault()} noValidate>
        {step === 1 && (
          <>
            <div className="note" role="note">
              Provide the details available now. You can send an operator update after
              notification.
            </div>
            <Section title="Incident Details">
              <p className="muted small">Required fields are marked with *</p>
              <div className="form-grid form-grid-3">
                <SapInput
                  id="f-operator"
                  label="Operator"
                  value={form.operator}
                  onChange={() => undefined}
                  disabled
                />
                <SapInput
                  id="f-route"
                  label="Route"
                  required
                  value={form.route}
                  onChange={set('route')}
                  placeholder="e.g. 70"
                  error={errors.route}
                />
                <SapInput
                  id="f-vehicle"
                  label="Vehicle / Service ID"
                  value={form.vehicleOrServiceId}
                  onChange={set('vehicleOrServiceId')}
                  placeholder="e.g. BUS-070"
                />
              </div>
              <div className="form-grid form-grid-3">
                <SapInput
                  id="f-location"
                  label="Location"
                  required
                  value={form.location}
                  onChange={set('location')}
                  placeholder="e.g. Newmarket"
                  error={errors.location}
                />
                <SapSelect
                  id="f-type"
                  label="Disruption Type"
                  required
                  value={form.disruptionType}
                  onChange={setVal('disruptionType')}
                  options={DISRUPTION_TYPES.map((t) => ({ value: t, label: t }))}
                  placeholder="Select…"
                  error={errors.disruptionType}
                />
                <SapDateTime
                  id="f-detected"
                  label="Detection Time"
                  required
                  value={form.detectedAt}
                  onChange={(v) => setDetected(v)}
                  error={errors.detectedAt}
                />
              </div>
            </Section>

            <Section title="Reporting guidance">
              <p>
                Notify Auckland Transport promptly when service cannot continue, passenger
                impact is high or a major interchange is affected.
              </p>
              <p className="muted small">
                Your notification creates one shared incident record. AT Operations will
                validate and assess it.
              </p>
            </Section>
          </>
        )}

        {step === 2 && (
          <>
            <Section title="Service Impact">
              <div className="form-grid form-grid-3">
                <SapSelect
                  id="f-continue"
                  label="Can Service Continue?"
                  required
                  value={form.serviceContinues}
                  onChange={setVal('serviceContinues')}
                  options={[
                    { value: 'yes', label: 'Yes' },
                    { value: 'no', label: 'No' },
                  ]}
                  placeholder="Select…"
                  error={errors.serviceContinues}
                />
                <SapInput
                  id="f-delay"
                  label="Estimated Delay"
                  required
                  value={form.estimatedDelayMinutes}
                  onChange={set('estimatedDelayMinutes')}
                  placeholder="e.g. 25 min"
                  inputMode="numeric"
                  error={errors.estimatedDelayMinutes}
                />
                <SapSelect
                  id="f-impact"
                  label="Passenger Impact"
                  required
                  value={form.passengerImpact}
                  onChange={setVal('passengerImpact')}
                  options={[
                    { value: 'LOW', label: 'Low' },
                    { value: 'MEDIUM', label: 'Medium' },
                    { value: 'HIGH', label: 'High' },
                  ]}
                  placeholder="Select…"
                  error={errors.passengerImpact}
                />
              </div>
              <div className="field field-check">
                <input
                  id="f-interchange"
                  type="checkbox"
                  checked={form.majorInterchangeAffected}
                  onChange={set('majorInterchangeAffected')}
                />
                <label htmlFor="f-interchange">Major Interchange Affected</label>
              </div>
            </Section>

            <Section title="Description">
              <Field
                id="f-description"
                label="Description"
                required
                error={errors.description}
              >
                <textarea
                  id="f-description"
                  className="input"
                  rows={4}
                  value={form.description}
                  onChange={set('description')}
                  aria-invalid={Boolean(errors.description)}
                />
              </Field>
              {form.serviceContinues === 'no' && (
                <div className="note warn" role="note">
                  Service cannot continue. Auckland Transport will assess passenger impact
                  and coordinate recovery.
                </div>
              )}
            </Section>
          </>
        )}

        {step === 3 && (
          <>
            <div className="note" role="note">
              Review your notification before sending it to Auckland Transport.
            </div>
            <Section title="Incident Details">
              <div className="actions-bar">
                <FioriButton
                  design="transparent"
                  small
                  icon="edit"
                  type="button"
                  onClick={() => setStep(1)}
                >
                  Edit
                </FioriButton>
              </div>
              <dl className="facts-grid">
                <div className="fact">
                  <dt>Operator</dt>
                  <dd>{form.operator || '—'}</dd>
                </div>
                <div className="fact">
                  <dt>Route</dt>
                  <dd>{form.route || '—'}</dd>
                </div>
                <div className="fact">
                  <dt>Vehicle / Service ID</dt>
                  <dd>{form.vehicleOrServiceId || '—'}</dd>
                </div>
                <div className="fact">
                  <dt>Location</dt>
                  <dd>{form.location || '—'}</dd>
                </div>
                <div className="fact">
                  <dt>Disruption Type</dt>
                  <dd>{form.disruptionType || '—'}</dd>
                </div>
                <div className="fact">
                  <dt>Detection Time</dt>
                  <dd>{form.detectedAt.replace('T', ' ') || '—'}</dd>
                </div>
              </dl>
            </Section>

            <Section title="Service Impact">
              <div className="actions-bar">
                <FioriButton
                  design="transparent"
                  small
                  icon="edit"
                  type="button"
                  onClick={() => setStep(2)}
                >
                  Edit
                </FioriButton>
              </div>
              <dl className="facts-grid">
                <div className="fact">
                  <dt>Can Service Continue?</dt>
                  <dd>
                    {form.serviceContinues === ''
                      ? '—'
                      : form.serviceContinues === 'yes'
                        ? 'Yes'
                        : 'No'}
                  </dd>
                </div>
                <div className="fact">
                  <dt>Estimated Delay</dt>
                  <dd>{form.estimatedDelayMinutes || '—'}</dd>
                </div>
                <div className="fact">
                  <dt>Passenger Impact</dt>
                  <dd>{form.passengerImpact || '—'}</dd>
                </div>
                <div className="fact">
                  <dt>Major Interchange Affected</dt>
                  <dd>{form.majorInterchangeAffected ? 'Yes' : 'No'}</dd>
                </div>
              </dl>
              <p>{form.description || '—'}</p>
            </Section>
          </>
        )}

        <div className="actions-bar">
          {step > 1 && (
            <FioriButton icon="back" type="button" onClick={() => setStep((s) => s - 1)}>
              Back
            </FioriButton>
          )}
          <FioriButton design="transparent" icon="decline" to="/contractor">
            Cancel
          </FioriButton>
          <FioriButton icon="save" type="button" onClick={onSaveDraft}>
            Save Draft
          </FioriButton>
          {step === 1 && (
            <FioriButton
              design="transparent"
              icon="refresh"
              type="button"
              onClick={() => {
                setForm(ROUTE_70_DEMO_VALUES);
                setErrors({});
                setDraftSavedAt(null);
              }}
            >
              Fill example values
            </FioriButton>
          )}
          {step < 3 ? (
            <FioriButton design="emphasized" icon="arrowRight" type="button" onClick={onNext}>
              Next: {STEPS[step]}
            </FioriButton>
          ) : (
            <FioriButton design="emphasized" icon="send" type="button" onClick={() => onNotify()}>
              Notify Auckland Transport
            </FioriButton>
          )}
          {draftSavedAt && <span className="muted small">Draft saved.</span>}
        </div>
      </form>
    </div>
  );
}
