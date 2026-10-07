import { useState } from 'react';

/**
 * Confirmation dialog per the UI kit: states consequences, requires an
 * explicit check, and always carries the demo disclaimer. Used before
 * passenger publication and incident closure.
 */
export function ConfirmDialog({
  title,
  summary,
  checkLabel = '',
  requireCheck = true,
  disclaimer,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  summary: string[];
  checkLabel?: string;
  /** When false, no acknowledgement checkbox is shown and confirm is immediate. */
  requireCheck?: boolean;
  disclaimer: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}): React.JSX.Element {
  const [checked, setChecked] = useState(false);

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{title}</h2>
        <ul>
          {summary.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {requireCheck && (
          <label className="dialog-check">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            {checkLabel}
          </label>
        )}
        <div className="note">{disclaimer}</div>
        <div className="dialog-actions">
          <button className="btn" type="button" onClick={onCancel}>
            × Cancel
          </button>
          <button
            className="btn btn-primary"
            type="button"
            disabled={requireCheck && !checked}
            onClick={onConfirm}
          >
            ➤ {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
