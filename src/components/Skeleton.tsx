/**
 * Skeleton loading primitives — shimmer placeholders shown while async
 * work (SAP sync) is in flight. All blocks are aria-hidden decoration;
 * containers carry role="status" with a text label so assistive tech
 * announces *what* is loading instead of fake content.
 */

interface SkeletonProps {
  /** CSS width, e.g. "60%" or 120. Defaults to 100%. */
  width?: string | number;
  /** CSS height in px. Defaults to 12. */
  height?: number;
  /** Border radius in px. Defaults to 4. */
  radius?: number;
  className?: string;
}

function toCss(value: string | number | undefined, fallback: string): string {
  if (value === undefined) return fallback;
  return typeof value === 'number' ? `${value}px` : value;
}

/** Single shimmer block. Decorative — always aria-hidden. */
export function Skeleton({ width, height = 12, radius = 4, className }: SkeletonProps): React.JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={`skel${className ? ` ${className}` : ''}`}
      style={{ width: toCss(width, '100%'), height: height, borderRadius: radius }}
    />
  );
}

/** Stacked text-line placeholders; the last line is shortened. */
export function SkeletonText({
  lines = 3,
  widths,
}: {
  lines?: number;
  widths?: (string | number)[];
}): React.JSX.Element {
  const rows = Array.from({ length: Math.max(1, lines) }, (_, i) => i);
  return (
    <span className="skel-text">
      {rows.map((i) => (
        <Skeleton
          key={i}
          width={widths?.[i] ?? (i === rows.length - 1 ? '62%' : '100%')}
        />
      ))}
    </span>
  );
}

/**
 * Table-shaped placeholder mirroring `.sap-table` markup so the layout
 * does not jump when real rows arrive. Column headers render as plain
 * text (structure), cells as shimmer blocks.
 */
export function SkeletonTable({
  label,
  columns,
  rows = 4,
  widths,
}: {
  /** Accessible status label, e.g. "Syncing SAP records". */
  label: string;
  /** Header labels mirroring the real table. */
  columns: string[];
  rows?: number;
  /** Per-column shimmer widths (first cell renders two lines). */
  widths?: (string | number)[];
}): React.JSX.Element {
  const body = Array.from({ length: Math.max(1, rows) }, (_, i) => i);
  return (
    <div className="sap-table skel-wrap" role="status" aria-label={label}>
      <p className="muted small skel-status">
        <span className="skel-pulse" aria-hidden="true" />
        {label}…
      </p>
      <div className="table-scroll">
        <table className="records sap-records" aria-hidden="true">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((r) => (
              <tr key={r}>
                {columns.map((c, ci) => (
                  <td key={c}>
                    {ci === 0 ? (
                      <span className="skel-cell-main">
                        <Skeleton width={widths?.[ci] ?? '72%'} />
                        <Skeleton width="48%" height={10} />
                      </span>
                    ) : (
                      <Skeleton width={widths?.[ci] ?? '65%'} />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** KPI-card-shaped placeholder (title + value + context lines). */
export function SkeletonCard(): React.JSX.Element {
  return (
    <div className="kpi-card" aria-hidden="true">
      <h3>
        <Skeleton width="55%" height={11} />
      </h3>
      <div className="kpi-value">
        <Skeleton width="42%" height={30} radius={6} />
      </div>
      <p className="muted small">
        <Skeleton width="78%" height={10} />
      </p>
    </div>
  );
}
