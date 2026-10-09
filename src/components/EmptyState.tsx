import type { ReactNode } from 'react';

/**
 * Fiori IllustratedMessage pattern: illustration + title + description +
 * optional action. Replaces every one-line muted empty state so all
 * "no data" moments look and read the same.
 */
export function EmptyState({
  illustration,
  title,
  description,
  action,
}: {
  illustration: string;
  title: string;
  description: string;
  action?: ReactNode;
}): React.JSX.Element {
  return (
    <div className="empty">
      <div className="empty-illustration" aria-hidden="true">
        {illustration}
      </div>
      <p className="empty-title">{title}</p>
      <p className="muted">{description}</p>
      {action !== undefined && <div className="actions-bar empty-action">{action}</div>}
    </div>
  );
}
