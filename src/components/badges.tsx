import { firstCommunicationKpi, formatMmSs } from '../domain/kpi.js';
import type { Incident, OperationalStatus, Severity } from '../domain/types.js';

/**
 * Labelled severity badge (never colour-alone).
 * Icon + criticality mapping per SAP Fiori ObjectStatus guidance
 * (Negative/Critical/Information/Positive with status icons).
 */
export function SeverityBadge({ level }: { level: Severity | null }): React.JSX.Element {
  if (level === null) return <span className="badge sev-none">◌ Not assessed</span>;
  const cls =
    level === 'CRITICAL'
      ? 'sev-critical'
      : level === 'HIGH'
        ? 'sev-high'
        : level === 'MEDIUM'
          ? 'sev-medium'
          : 'sev-low';
  const icon = level === 'CRITICAL' ? '■' : level === 'HIGH' ? '⚠' : level === 'MEDIUM' ? 'ℹ' : '✓';
  const label = level.charAt(0) + level.slice(1).toLowerCase();
  return (
    <span className={`badge ${cls}`}>
      {icon} {label}
    </span>
  );
}

/** Operational lifecycle badge. */
export function OpStatusBadge({ status }: { status: OperationalStatus }): React.JSX.Element {
  const done = status === 'RESTORED' || status === 'CLOSED';
  const label = status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c: string) => c.toUpperCase());
  return <span className={`badge ${done ? 'st-done' : 'st-ops'}`}>◈ {label}</span>;
}

/**
 * Post-incident review lifecycle (Figma Reviews): Open → In Progress →
 * Completed (all corrective actions done). NONE when no review required.
 */
export type ReviewDisplay = 'NONE' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';

export function reviewDisplay(incident: Incident): ReviewDisplay {
  if (!incident.reviewRequired) return 'NONE';
  const open = incident.correctiveActions.filter((c) => c.status === 'OPEN').length;
  if (incident.correctiveActions.length > 0 && open === 0) return 'COMPLETED';
  return incident.reviewStatus;
}

export function ReviewBadge({ status }: { status: ReviewDisplay }): React.JSX.Element | null {
  if (status === 'NONE') return null;
  if (status === 'OPEN') return <span className="badge tg-warn">▲ Open</span>;
  if (status === 'IN_PROGRESS') return <span className="badge st-ops">◈ In Progress</span>;
  return <span className="badge tg-good">✓ Completed</span>;
}

/**
 * Communication-target badge, derived from timestamps via the shared KPI
 * function (Due soon / Breached / Achieved / Not published).
 */
export function CommsTargetBadge({ incident }: { incident: Incident }): React.JSX.Element {
  const kpi = firstCommunicationKpi(incident);

  if (incident.communicationStatus === 'PUBLISHED' || kpi.state === 'MET') {
    const mins = kpi.elapsedMs === null ? '–' : Math.round(kpi.elapsedMs / 60000);
    return <span className="badge tg-good">✓ Achieved · {mins} min</span>;
  }
  if (kpi.state === 'EXCEEDED') {
    return <span className="badge tg-bad">⚠ Breached · target exceeded</span>;
  }
  if (kpi.state === 'AWAITING_CONFIRMATION') {
    return <span className="badge tg-idle">◷ Not published</span>;
  }
  const remaining = kpi.remainingMs ?? 0;
  if (remaining <= 0) {
    return <span className="badge tg-bad">⚠ Breached · {formatMmSs(-remaining)} over</span>;
  }
  return <span className="badge tg-warn">⚠ Due soon · {formatMmSs(remaining)} left</span>;
}
