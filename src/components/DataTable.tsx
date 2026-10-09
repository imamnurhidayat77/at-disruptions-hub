import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { FioriButton } from './Button.js';
import { EmptyState } from './EmptyState.js';
import { SapSelect } from './forms.js';
import { Icon } from './icons.js';

/**
 * Fiori responsive table (sap.m.Table + FilterBar best practice).
 * - Column headers: sortable via header press, `aria-sort` announced.
 * - FilterBar above the table: global search field plus one dropdown per
 *   `filter: 'select'` column, live filtering, Clear resets everything.
 * - Growing/pagination footer: pager with page info, Horizon styling.
 * - Empty set renders an IllustratedMessage-style empty state.
 */

export interface DataColumn<T> {
  key: string;
  label: string;
  /** Enable header-press sorting (needs `sortValue` or plain-text compare). */
  sortable?: boolean;
  /** Value used for sorting. Defaults to the filter string. */
  sortValue?: (row: T) => string | number | null;
  /** Filter UI for this column in the FilterBar. */
  filter?: 'select' | false;
  /** Plain-text value used for select options and matching. */
  filterValue?: (row: T) => string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  rows: T[];
  columns: Array<DataColumn<T>>;
  rowKey: (row: T) => string;
  /** Concatenated plain text used by the global search field. Omit to hide search. */
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  /** Hide the whole FilterBar (e.g. tiny tables). Defaults to filters/search presence. */
  showFilterBar?: boolean;
  defaultSortKey?: string;
  defaultSortDir?: 'asc' | 'desc';
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Notified (via effect) whenever the filtered row count changes. */
  onFilteredCount?: (count: number) => void;
}

type SortDir = 'asc' | 'desc' | null;

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  searchText,
  searchPlaceholder = 'Search',
  showFilterBar,
  defaultSortKey,
  defaultSortDir = 'asc',
  pageSize = 10,
  emptyTitle = 'No records to show',
  emptyDescription = 'Adjust the filters or check back later.',
  onFilteredCount,
}: DataTableProps<T>): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [selects, setSelects] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey ?? null);
  const [sortDir, setSortDir] = useState<SortDir>(defaultSortKey ? defaultSortDir : null);
  const [page, setPage] = useState(0);

  const selectColumns = useMemo(() => columns.filter((c) => c.filter === 'select'), [columns]);
  const barVisible = showFilterBar ?? (searchText !== undefined || selectColumns.length > 0);

  const options = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const col of selectColumns) {
      const seen = new Map<string, string>();
      for (const row of rows) {
        const v = col.filterValue?.(row) ?? '';
        if (v !== '' && !seen.has(v)) seen.set(v, v);
      }
      map[col.key] = [...seen.keys()].sort((a, b) => a.localeCompare(b));
    }
    return map;
  }, [rows, selectColumns]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows;
    if (searchText && q !== '') {
      out = out.filter((r) => searchText(r).toLowerCase().includes(q));
    }
    for (const col of selectColumns) {
      const picked = selects[col.key];
      if (picked) {
        out = out.filter((r) => (col.filterValue?.(r) ?? '') === picked);
      }
    }
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      if (col) {
        const dir = sortDir === 'desc' ? -1 : 1;
        out = [...out].sort((a, b) => {
          const va = col.sortValue?.(a) ?? col.filterValue?.(a) ?? '';
          const vb = col.sortValue?.(b) ?? col.filterValue?.(b) ?? '';
          if (va === vb) return 0;
          if (va === null || va === '') return 1;
          if (vb === null || vb === '') return -1;
          if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
          return String(va).localeCompare(String(vb)) * dir;
        });
      }
    }
    return out;
  }, [rows, columns, query, searchText, selects, selectColumns, sortKey, sortDir]);

  useEffect(() => {
    onFilteredCount?.(filtered.length);
  }, [filtered.length, onFilteredCount]);

  useEffect(() => {
    setPage(0);
  }, [query, selects, rows]);

  const pageCount = pageSize > 0 ? Math.max(1, Math.ceil(filtered.length / pageSize)) : 1;
  const safePage = Math.min(page, pageCount - 1);
  const visible =
    pageSize > 0 ? filtered.slice(safePage * pageSize, safePage * pageSize + pageSize) : filtered;

  function toggleSort(key: string): void {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else if (sortDir === 'desc') {
      setSortKey(null);
      setSortDir(null);
    } else {
      setSortDir('asc');
    }
  }

  function onClear(): void {
    setQuery('');
    setSelects({});
    setSortKey(defaultSortKey ?? null);
    setSortDir(defaultSortKey ? defaultSortDir : null);
    setPage(0);
  }

  const hasActiveFilters =
    query.trim() !== '' || Object.values(selects).some((v) => v !== '' && v !== undefined);

  return (
    <div className="sap-table">
      {barVisible && (
        <div className="sap-filterbar" role="search">
          {searchText && (
            <label className="filter-field search-field sap-filterbar-search">
              <span className="sap-filterbar-label">Search</span>
              <input
                className="input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
              />
              <span className="search-icon" aria-hidden="true">
                <Icon name="search" size={16} />
              </span>
            </label>
          )}
          {selectColumns.map((col) => (
            <SapSelect
              key={col.key}
              id={`filter-${col.key}`}
              label={col.label}
              value={selects[col.key] ?? ''}
              onChange={(v) => setSelects((s) => ({ ...s, [col.key]: v }))}
              options={[
                { value: '', label: 'All' },
                ...options[col.key].map((o) => ({ value: o, label: o })),
              ]}
            />
          ))}
          <span className="sap-filterbar-actions">
            <FioriButton
              design="transparent"
              small
              icon="filterClear"
              onClick={onClear}
              disabled={!hasActiveFilters && sortKey === (defaultSortKey ?? null)}
              ariaLabel="Clear all filters"
            >
              Clear
            </FioriButton>
          </span>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState illustration="▭" title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="table-scroll">
          <table className="records sap-records">
            <thead>
              <tr>
                {columns.map((col) =>
                  col.sortable ? (
                    <th key={col.key} aria-sort={sortKey === col.key ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}>
                      <button
                        type="button"
                        className="sap-sorthead"
                        onClick={() => toggleSort(col.key)}
                        aria-label={`Sort by ${col.label}`}
                      >
                        <span>{col.label}</span>
                        <span className="sap-sortglyph" aria-hidden="true">
                          {sortKey === col.key ? (sortDir === 'desc' ? '▼' : '▲') : '△'}
                        </span>
                      </button>
                    </th>
                  ) : (
                    <th key={col.key}>{col.label}</th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={rowKey(row)}>
                  {columns.map((col) => (
                    <td key={col.key}>{col.render(row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageSize > 0 && pageCount > 1 && (
        <div className="sap-pager">
          <FioriButton
            small
            icon="chevronLeft"
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </FioriButton>
          <span className="muted small" aria-live="polite">
            Page {safePage + 1} of {pageCount} · {filtered.length} records
          </span>
          <FioriButton
            small
            icon="chevronRight"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            Next
          </FioriButton>
        </div>
      )}
    </div>
  );
}
