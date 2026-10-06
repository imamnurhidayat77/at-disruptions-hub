import { firstCommunicationKpi, formatMmSs } from '../domain/kpi.js';
import type { Incident, OperationalStatus, Severity } from '../domain/types.js';

/** Labelled severity badge (never colour-alone). */
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
  const label = level.charAt(0) + level.slice(1).toLowerCase();
  return <span className={`badge ${cls}`}>▲ {label}</span>;
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
 * Communication-target badge, derived from timestamps via the shared KPI
 * function (UI kit: Due soon / Breached / Achieved / Not published).
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
