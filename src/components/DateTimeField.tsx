import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { FioriButton } from './Button.js';
import { SapSelect } from './forms.js';
import { Icon } from './icons.js';

/**
 * SAP Fiori-style date-time field (sap.m.DateTimePicker pattern).
 * Floating legend label, segmented calendar button, and a popover with a
 * month calendar plus hour/minute steppers. Value shape matches the native
 * inputs it replaces so existing state code is untouched:
 * - datetime: "YYYY-MM-DDTHH:mm" (display "dd/mm/yyyy, hh:mm")
 * - date:     "YYYY-MM-DD"        (display "dd/mm/yyyy")
 * - time:     "HH:mm"             (display "hh:mm")
 */

type PickerMode = 'datetime' | 'date' | 'time';

interface Parts {
  y: number;
  m: number;
  d: number;
  hh: number;
  mm: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function parseValue(v: string, mode: PickerMode): Parts | null {
  const s = v.trim();
  if (mode === 'time') {
    const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(s);
    if (!m) return null;
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth(), d: now.getDate(), hh: Number(m[1]), mm: Number(m[2]) };
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(s);
  if (!m) return null;
  if (mode === 'datetime' && (m[4] === undefined || m[5] === undefined)) return null;
  if (mode === 'date' && m[4] !== undefined) return null;
  const parts: Parts = {
    y: Number(m[1]),
    m: Number(m[2]) - 1,
    d: Number(m[3]),
    hh: m[4] === undefined ? 0 : Number(m[4]),
    mm: m[5] === undefined ? 0 : Number(m[5]),
  };
  if (parts.m < 0 || parts.m > 11 || parts.d < 1 || parts.d > 31) return null;
  if (parts.hh > 23 || parts.mm > 59) return null;
  return parts;
}

function toValue(p: Parts, mode: PickerMode): string {
  if (mode === 'time') return `${pad(p.hh)}:${pad(p.mm)}`;
  const date = `${p.y}-${pad(p.m + 1)}-${pad(p.d)}`;
  return mode === 'date' ? date : `${date}T${pad(p.hh)}:${pad(p.mm)}`;
}

function formatDisplay(v: string, mode: PickerMode): string | null {
  const p = parseValue(v, mode);
  if (!p) return null;
  if (mode === 'time') return `${pad(p.hh)}:${pad(p.mm)}`;
  const date = `${pad(p.d)}/${pad(p.m + 1)}/${p.y}`;
  return mode === 'date' ? date : `${date}, ${pad(p.hh)}:${pad(p.mm)}`;
}

function nowParts(): Parts {
  const n = new Date();
  return { y: n.getFullYear(), m: n.getMonth(), d: n.getDate(), hh: n.getHours(), mm: n.getMinutes() };
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}

const DEFAULT_PLACEHOLDER: Record<PickerMode, string> = {
  datetime: 'Select date and time',
  date: 'Select a date',
  time: 'HH:MM',
};

export function SapDateTime({
  id,
  label,
  value,
  onChange,
  mode = 'datetime',
  placeholder,
  required,
  error,
  hint,
  disabled,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  mode?: PickerMode;
  placeholder?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  disabled?: boolean;
}): React.JSX.Element {
  const autoId = useId();
  const fieldId = id ?? `sap-datetime-${autoId}`;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Parts>(() => parseValue(value, mode) ?? nowParts());
  const rootRef = useRef<HTMLDivElement>(null);

  // Refresh the draft from the committed value each time the picker opens.
  function onToggle(): void {
    if (!open) setDraft(parseValue(value, mode) ?? nowParts());
    setOpen((v) => !v);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') setOpen(false);
    }
    function onClick(e: MouseEvent): void {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open ]);

  const shown = formatDisplay(value, mode);
  const text = placeholder ?? DEFAULT_PLACEHOLDER[mode];

  const cells = useMemo(() => {
    const offset = (new Date(draft.y, draft.m, 1).getDay() + 6) % 7; // Monday-first
    const total = daysInMonth(draft.y, draft.m);
    const count = Math.ceil((offset + total) / 7) * 7;
    return Array.from({ length: count }, (_, i) => {
      const day = i - offset + 1;
      return day >= 1 && day <= total ? day : null;
    });
  }, [draft.y, draft.m]);

  const committed = parseValue(value, mode);
  const isPickedDay = (day: number): boolean =>
    committed !== null && committed.y === draft.y && committed.m === draft.m && committed.d === day;

  const today = new Date();
  const isToday = (day: number): boolean =>
    today.getFullYear() === draft.y && today.getMonth() === draft.m && today.getDate() === day;

  function shiftMonth(delta: number): void {
    setDraft((p) => {
      const base = new Date(p.y, p.m + delta, 1);
      const max = daysInMonth(base.getFullYear(), base.getMonth());
      return { ...p, y: base.getFullYear(), m: base.getMonth(), d: Math.min(p.d, max) };
    });
  }

  const hours = useMemo(
    () => Array.from({ length: 24 }, (_, h) => ({ value: pad(h), label: pad(h) })),
    [],
  );
  const minutes = useMemo(() => {
    const list = Array.from({ length: 12 }, (_, k) => pad(k * 5));
    const cur = pad(draft.mm);
    if (!list.includes(cur)) list.push(cur);
    return list.sort().map((x) => ({ value: x, label: x }));
  }, [draft.mm]);

  return (
    <div className="field">
      <div
        className={`sap-select sap-datetime${open ? ' open' : ''}${error ? ' invalid' : ''}${disabled ? ' disabled' : ''}`}
        ref={rootRef}
      >
        <span className="sap-select-legend" id={`${fieldId}-label`}>
          {label}
          {required === true ? ' *' : ''}
        </span>
        <button
          id={fieldId}
          type="button"
          className="sap-select-trigger"
          aria-labelledby={`${fieldId}-label ${fieldId}-value`}
          aria-haspopup="dialog"
          aria-expanded={open}
          disabled={disabled}
          onClick={onToggle}
        >
          <span id={`${fieldId}-value`} className={`sap-select-value${shown ? '' : ' empty'}`}>
            {shown ?? text}
          </span>
          <span className="sap-select-seg" aria-hidden="true">
            <Icon name={mode === 'time' ? 'clock' : 'calendar'} size={16} />
          </span>
        </button>
        {open && !disabled && (
          <div
            className={`sap-select-pop sap-datetime-pop${mode === 'time' ? ' time-only' : ''}`}
            role="dialog"
            aria-label={label}
          >
            {mode !== 'time' && (
              <>
                <div className="sap-cal-head">
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Previous month"
                    onClick={() => shiftMonth(-1)}
                  >
                    <Icon name="chevronLeft" size={16} />
                  </button>
                  <strong>
                    {MONTHS[draft.m]} {draft.y}
                  </strong>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Next month"
                    onClick={() => shiftMonth(1)}
                  >
                    <Icon name="chevronRight" size={16} />
                  </button>
                </div>
                <div className="sap-cal-grid" role="grid" aria-label="Choose a date">
                  {WEEKDAYS.map((w) => (
                    <span key={w} className="sap-cal-dow" aria-hidden="true">
                      {w}
                    </span>
                  ))}
                  {cells.map((day, i) =>
                    day === null ? (
                      <span key={`x-${i}`} className="sap-cal-empty" />
                    ) : (
                      <button
                        key={day}
                        type="button"
                        role="gridcell"
                        aria-selected={isPickedDay(day)}
                        className={`sap-cal-day${isPickedDay(day) ? ' picked' : ''}${isToday(day) ? ' today' : ''}`}
                        onClick={() => setDraft((p) => ({ ...p, d: day }))}
                      >
                        {day}
                      </button>
                    ),
                  )}
                </div>
              </>
            )}
            {mode !== 'date' && (
              <div className="sap-datetime-time">
                <SapSelect
                  id={`${fieldId}-hh`}
                  label="Hour"
                  value={pad(draft.hh)}
                  onChange={(v) => setDraft((p) => ({ ...p, hh: Number(v) }))}
                  options={hours}
                />
                <span className="sap-datetime-colon" aria-hidden="true">
                  :
                </span>
                <SapSelect
                  id={`${fieldId}-mm`}
                  label="Minute"
                  value={pad(draft.mm)}
                  onChange={(v) => setDraft((p) => ({ ...p, mm: Number(v) }))}
                  options={minutes}
                />
              </div>
            )}
            <div className="sap-datetime-foot">
              <FioriButton
                design="transparent"
                small
                onClick={() => setDraft((p) => ({ ...nowParts(), hh: p.hh, mm: p.mm }))}
              >
                Today
              </FioriButton>
              <span className="sap-datetime-spacer" />
              <FioriButton design="transparent" small onClick={() => {
                onChange('');
                setOpen(false);
              }}>
                Clear
              </FioriButton>
              <FioriButton design="emphasized" small onClick={() => {
                onChange(toValue(draft, mode));
                setOpen(false);
              }}>
                OK
              </FioriButton>
            </div>
          </div>
        )}
      </div>
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="hint">{hint}</p>
      ) : null}
    </div>
  );
}
