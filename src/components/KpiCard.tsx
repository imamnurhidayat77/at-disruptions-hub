import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

/** Shared KPI card — one markup for every dashboard (Fiori analytical card). */
export function KpiCard({
  title,
  value,
  tone,
  context,
  linkTo,
  linkLabel,
}: {
  title: string;
  value: ReactNode;
  tone?: 'good' | 'bad' | 'warn';
  context: ReactNode;
  linkTo?: string;
  linkLabel?: string;
}): React.JSX.Element {
  return (
    <div className="kpi-card">
      <h3>{title}</h3>
      <div className={`kpi-value${tone ? ` ${tone}` : ''}`}>{value}</div>
      <p className="muted small">{context}</p>
      {linkTo && linkLabel && (
        <Link className="kpi-link" to={linkTo}>
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
