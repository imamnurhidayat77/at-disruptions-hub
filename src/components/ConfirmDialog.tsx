import { useState } from 'react';
import { FioriButton } from './Button.js';
import { Icon } from './icons.js';

/**
 * Confirmation dialog per the UI kit: states consequences, requires an
 * explicit check, and always carries the demo disclaimer. Used before
 * passenger publication and incident closure.
 */
export function ConfirmDialog({
  title,
  subtitle,
  summary,
  checkLabel = '',
  requireCheck = true,
  disclaimer,
  confirmLabel,
  tone = 'primary',
  onConfirm,
  onCancel,
}: {
  title: string;
  /** Small caption under the title (Figma dialog header). */
  subtitle?: string;
  summary: string[];
  checkLabel?: string;
  /** When false, no acknowledgement checkbox is shown and confirm is immediate. */
  requireCheck?: boolean;
  disclaimer: string;
  confirmLabel: string;
  /** Figma buttons: Emphasized (default) or Negative (destructive). */
  tone?: 'primary' | 'negative';
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
        <h2>
          <span className="dialog-icon" aria-hidden="true">
            ⚠
          </span>{' '}
          {title}
        </h2>
        {subtitle && <p className="muted small">{subtitle}</p>}
        <button className="dialog-close" type="button" onClick={onCancel} aria-label="Close dialog">
          <Icon name="decline" size={16} />
        </button>
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
          <FioriButton icon="decline" onClick={onCancel}>
            Cancel
          </FioriButton>
          <FioriButton
            design={tone === 'negative' ? 'negative' : 'emphasized'}
            icon="check"
            disabled={requireCheck && !checked}
            onClick={onConfirm}
          >
            {confirmLabel}
          </FioriButton>
        </div>
      </div>
    </div>
  );
}
