import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Section } from '../../components/chrome.js';
import { Field } from '../../components/forms.js';
import { ContractorNav } from './ContractorTable.js';import {
  DISRUPTION_TYPES,
  EMPTY_REPORT,
  ROUTE_70_DEMO_VALUES,
  SERVICE_IMPACTS,
  validateReport,
  type ReportErrors,
  type ReportInput,
} from '../../domain/reporting.js';
import { useAppStore } from '../../state/AppStore.js';

/**
 * Contractor disruption notification form.
 * Layout follows design/Capture new bus disruption.png: Service & location,
 * Onset & source, Disruption & initial impact + readiness rail. Creating the
 * record opens AT assessment — it does NOT publish passenger communications.
 */
export function ReportPage(): React.JSX.Element {
  const { setRole, createIncident } = useAppStore();
  const navigate = useNavigate();
  const [form, setForm] = useState<ReportInput>(EMPTY_REPORT);
  const [errors, setErrors] = useState<ReportErrors>({});

  useEffect(() => {
    setRole('CONTRACTOR');
  }, [setRole]);

  const set = (key: keyof ReportInput) => (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const value =
      e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const readiness = [
    { ok: form.route.trim() !== '' && form.direction !== '', label: 'Route and direction identified' },
    {
      ok: form.location.trim() !== '' && /^\d{2}:\d{2}$/.test(form.onsetTime),
      label: 'Location and onset confirmed',
    },
    { ok: form.operator.trim() !== '', label: 'Operator source recorded' },
  ];

  function onSubmit(e: FormEvent): void {
    e.preventDefault();
    const found = validateReport(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return; // input preserved; errors inline
    const id = createIncident(form);
    navigate(`/contractor/incident/${id}`, { state: { fresh: true } });
  }

  return (
    <div>
      <div className="pagehead">
        <span className="eyebrow">Bus Operator Portal</span>
        <h1>Report bus disruption</h1>
        <p className="lede">
          Record what is known now. Refine the assessment as confirmed information
          arrives. Required fields are marked *.
        </p>
        <p>
          <button
            className="btn"
            type="button"
            onClick={() => {
              setForm(ROUTE_70_DEMO_VALUES);
              setErrors({});
            }}
          >
            ↻ Use Route 70 demo values
          </button>
        </p>
      </div>

      <ContractorNav />

      <form onSubmit={onSubmit} noValidate>
        <div className="form-layout">
          <div>
            <Section title="Service & location">
              <div className="form-grid">
                <Field id="f-mode" label="Mode">
                  <input id="f-mode" className="input" value="Bus" disabled aria-disabled="true" />
                </Field>
                <Field id="f-route" label="Affected route(s)" required error={errors.route}>
                  <input
                    id="f-route"
                    className="input"
                    value={form.route}
                    onChange={set('route')}
                    placeholder="e.g. 70"
                    aria-invalid={Boolean(errors.route)}
                  />
                </Field>
                <Field id="f-direction" label="Direction" required error={errors.direction}>
                  <select
                    id="f-direction"
                    className="input"
                    value={form.direction}
                    onChange={set('direction')}
                    aria-invalid={Boolean(errors.direction)}
                  >
                    <option value="">Select…</option>
                    <option>Citybound</option>
                    <option>Outbound</option>
                    <option>Both directions</option>
                  </select>
                </Field>
              </div>
              <div className="form-grid">
                <Field
                  id="f-location"
                  label="Location / road"
                  required
                  error={errors.location}
                  hint="Use the confirmed location."
                >
                  <input
                    id="f-location"
                    className="input"
                    value={form.location}
                    onChange={set('location')}
                    placeholder="e.g. Newmarket — Broadway"
                    aria-invalid={Boolean(errors.location)}
                  />
                </Field>
                <Field id="f-vehicles" label="Affected vehicles / trips">
                  <input
                    id="f-vehicles"
                    className="input"
                    value={form.vehicleOrServiceId}
                    onChange={set('vehicleOrServiceId')}
                    placeholder="e.g. Bus 2147 · Route 70 citybound"
                  />
                </Field>
              </div>
              <Field
                id="f-locdetail"
                label="Location detail"
                hint="Do not add a detour or stop closure unless confirmed."
              >
                <textarea
                  id="f-locdetail"
                  className="input"
                  rows={2}
                  value={form.locationDetail}
                  onChange={set('locationDetail')}
                />
              </Field>
            </Section>

            <Section title="Onset & source">
              <div className="form-grid form-grid-3">
                <Field id="f-date" label="Incident onset date" required error={errors.onsetDate}>
                  <input
                    id="f-date"
                    className="input"
                    type="date"
                    value={form.onsetDate}
                    onChange={set('onsetDate')}
                    aria-invalid={Boolean(errors.onsetDate)}
                  />
                </Field>
                <Field
                  id="f-time"
                  label="Onset time (NZDT)"
                  required
                  error={errors.onsetTime}
                  hint="Earliest confirmed disruption time."
                >
                  <input
                    id="f-time"
                    className="input"
                    type="time"
                    value={form.onsetTime}
                    onChange={set('onsetTime')}
                    aria-invalid={Boolean(errors.onsetTime)}
                  />
                </Field>
                <Field id="f-operator" label="Reporting operator" required error={errors.operator}>
                  <input
                    id="f-operator"
                    className="input"
                    value={form.operator}
                    onChange={set('operator')}
                    aria-invalid={Boolean(errors.operator)}
                  />
                </Field>
              </div>
              <Field id="f-srcref" label="Source reference">
                <input
                  id="f-srcref"
                  className="input"
                  value={form.sourceReference}
                  onChange={set('sourceReference')}
                  placeholder="e.g. radio report reference"
                />
              </Field>
            </Section>

            <Section title="Disruption & initial impact">
              <div className="form-grid">
                <Field
                  id="f-type"
                  label="Disruption type"
                  required
                  error={errors.disruptionType}
                  hint="Select the best match."
                >
                  <select
                    id="f-type"
                    className="input"
                    value={form.disruptionType}
                    onChange={set('disruptionType')}
                    aria-invalid={Boolean(errors.disruptionType)}
                  >
                    <option value="">Select…</option>
                    {DISRUPTION_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Field>
                <Field id="f-impact" label="Service impact" required error={errors.serviceImpact}>
                  <select
                    id="f-impact"
                    className="input"
                    value={form.serviceImpact}
                    onChange={set('serviceImpact')}
                    aria-invalid={Boolean(errors.serviceImpact)}
                  >
                    <option value="">Select…</option>
                    {SERVICE_IMPACTS.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field
                id="f-facts"
                label="Confirmed operational facts"
                required
                error={errors.facts}
                hint="Keep confirmed facts separate from estimates."
              >
                <textarea
                  id="f-facts"
                  className="input"
                  rows={4}
                  value={form.facts}
                  onChange={set('facts')}
                  aria-invalid={Boolean(errors.facts)}
                />
              </Field>
              <div className="form-grid form-grid-3">
                <Field
                  id="f-delay"
                  label="Estimated delay (minutes)"
                  required
                  error={errors.estimatedDelayMinutes}
                >
                  <input
                    id="f-delay"
                    className="input"
                    inputMode="numeric"
                    value={form.estimatedDelayMinutes}
                    onChange={set('estimatedDelayMinutes')}
                    placeholder="e.g. 25"
                    aria-invalid={Boolean(errors.estimatedDelayMinutes)}
                  />
                </Field>
                <Field
                  id="f-pax"
                  label="Passenger impact"
                  required
                  error={errors.passengerImpact}
                >
                  <select
                    id="f-pax"
                    className="input"
                    value={form.passengerImpact}
                    onChange={set('passengerImpact')}
                    aria-invalid={Boolean(errors.passengerImpact)}
                  >
                    <option value="">Select…</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </Field>
                <div className="field field-check">
                  <input
                    id="f-interchange"
                    type="checkbox"
                    checked={form.majorInterchangeAffected}
                    onChange={set('majorInterchangeAffected')}
                  />
                  <label htmlFor="f-interchange">Major interchange affected</label>
                </div>
              </div>
            </Section>
          </div>

          <aside>
            <Section title="Capture readiness">
              <p className="muted small">Use verified facts; unknown details can follow.</p>
              <ul className="checklist">
                {readiness.map((r) => (
                  <li key={r.label} className={r.ok ? 'ok' : ''}>
                    <span aria-hidden="true">{r.ok ? '☑' : '☐'}</span> {r.label}
                  </li>
                ))}
                <li className="ok">
                  <span aria-hidden="true">☑</span> Recovery time not yet confirmed — leave it
                  unknown.
                </li>
              </ul>
            </Section>
            <div className="note">
              Submitting sends this notification to AT. It does not publish
              passenger communications.
            </div>
          </aside>
        </div>

        <div className="actions-bar">
          <Link className="btn btn-link" to="/contractor">
            × Cancel
          </Link>
          <button className="btn btn-primary" type="submit">
            → Submit to AT
          </button>
          <span className="muted small">No passenger update will be published yet.</span>
        </div>
      </form>
    </div>
  );
}
