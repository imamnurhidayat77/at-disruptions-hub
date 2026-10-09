import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { Icon } from './icons.js';

/** Labelled form field with required marker, hint and inline error text. */
export function Field({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required ? ' *' : ''}
      </label>
      {children}
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

export const inputClass = 'input';

/**
 * SAP-style text input with a floating legend label on the top border —
 * same visual language as SapSelect so mixed grids stay aligned.
 */
export function SapInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
  error,
  hint,
  disabled,
  inputMode,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  disabled?: boolean;
  inputMode?: 'text' | 'numeric' | 'decimal';
}): React.JSX.Element {
  const autoId = useId();
  const fieldId = id ?? `sap-input-${autoId}`;
  return (
    <div className="field">
      <div className={`sap-inputwrap${error ? ' invalid' : ''}`}>
        <span className="sap-select-legend" id={`${fieldId}-label`}>
          {label}
          {required === true ? ' *' : ''}
        </span>
        <input
          id={fieldId}
          className="sap-input"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          inputMode={inputMode}
          aria-labelledby={`${fieldId}-label`}
          aria-invalid={Boolean(error)}
        />
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

export interface SapOption {
  value: string;
  label: string;
}

/**
 * SAP-style select (API Business Hub pattern): floating legend label that
 * sits on the top border, a segmented trigger button on the right with a
 * vertical divider + chevron, and a rounded listbox popover. The picked
 * option is highlighted (tinted bg + blue divider); an optional action
 * row (e.g. "Add New Environment +") renders pinned at the bottom.
 */
export function SapSelect({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = 'Select a value..',
  required,
  error,
  hint,
  disabled,
  actionLabel,
  onAction,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SapOption[];
  placeholder?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  disabled?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}): React.JSX.Element {
  const autoId = useId();
  const fieldId = id ?? `sap-select-${autoId}`;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const picked = options.find((o) => o.value === value) ?? null;

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

  function pick(v: string): void {
    onChange(v);
    setOpen(false);
  }

  return (
    <div className="field">
      <div
        className={`sap-select${open ? ' open' : ''}${error ? ' invalid' : ''}${disabled ? ' disabled' : ''}`}
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
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
        >
          <span id={`${fieldId}-value`} className={`sap-select-value${picked ? '' : ' empty'}`}>
            {picked?.label ?? placeholder}
          </span>
          <span className="sap-select-seg" aria-hidden="true">
            <Icon name={open ? 'chevronUp' : 'chevron'} size={16} />
          </span>
        </button>
        {open && !disabled && (
          <ul className="sap-select-pop" role="listbox" aria-labelledby={`${fieldId}-label`}>
            {options.map((o) => (
              <li key={o.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={o.value === value}
                  className={`sap-select-item${o.value === value ? ' picked' : ''}`}
                  onClick={() => pick(o.value)}
                >
                  {o.label}
                </button>
              </li>
            ))}
            {actionLabel && (
              <li role="presentation" className="sap-select-action-row">
                <button
                  type="button"
                  className="sap-select-item sap-select-action"
                  onClick={() => {
                    setOpen(false);
                    onAction?.();
                  }}
                >
                  <span>{actionLabel}</span>
                  <span className="sap-select-plus" aria-hidden="true">
                    <Icon name="plus" size={16} />
                  </span>
                </button>
              </li>
            )}
          </ul>
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
