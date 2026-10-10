import { useEffect, useState } from 'react';
import { Crumbs, Section } from '../../components/chrome.js';
import { EmptyState } from '../../components/EmptyState.js';
import { FioriButton } from '../../components/Button.js';
import { DataTable, type DataColumn } from '../../components/DataTable.js';
import { SkeletonTable } from '../../components/Skeleton.js';
import { formatNzdtDate, formatNzdtShort } from '../../domain/kpi.js';
import type { Incident } from '../../domain/types.js';
import { fetchLiveEnriched } from '../../services/sap/sapIncidentService.ts';
import { useAppStore } from '../../state/AppStore.js';

/**
 * Incoming Worklist — review new arrivals and route them for assessment.
 */

function IntakeStatus({ tone, icon, label }: { tone: string; icon: string; label: string }): React.JSX.Element {
  return (
    <span className={`badge ${tone}`}>
      {icon} {label}
    </span>
  );
}

function contractorStatus(): React.JSX.Element {
  return <IntakeStatus tone="tg-bad" icon="●" label="Awaiting Assessment" />;
}

interface IntakeRow {
  key: string;
  title: string;
  sub: string;
  statusLabel: string;
  receivedLabel: string;
  receivedMs: number;
  route: string;
  kind: 'contractor' | 'sap';
  incidentId?: string;
  sapId?: string;
  linkedIncidentId?: string | null;
}

export function Incoming(): React.JSX.Element {
  const { state, setRole, autoIntakeSap } = useAppStore();
  const [syncing, setSyncing] = useState(true);
  const [sapOffline, setSapOffline] = useState(false);

  useEffect(() => {
    setRole('OPERATIONS');
  }, [setRole]);

  // Fully automatic SAP intake — no clicks, no forms. Every SAP record is
  // treated as a finished incident: each one completes as a CLOSED archive
  // with deterministic dummy operational data on open.
  // Idempotent: already-linked records are skipped.
  useEffect(() => {
    let cancelled = false;
    setSyncing(true);
    void (async () => {
      const live = await fetchLiveEnriched();
      if (!cancelled) {
        autoIntakeSap(live ? live.candidates : state.sapCandidates);
        setSapOffline(live === null);
        setSyncing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reported: Incident[] = state.incidents.filter((i) => i.operationalStatus === 'REPORTED');
  const active = state.incidents.filter((i) => i.operationalStatus !== 'CLOSED').length;
  // Finished SAP archives (linked) do not belong in intake — only
  // unlinked candidates awaiting auto-intake are shown here.
  const incomingSap = state.sapCandidates.filter((c) => c.linkedIncidentId === null);
  const unlinked = incomingSap;

  const intakeItems = reported.length + incomingSap.length;

  const rows: IntakeRow[] = [
    ...reported.map((i): IntakeRow => ({
      key: i.id,
      title: `${i.id} · Route ${i.route}`,
      sub: `${i.disruptionType} · ${i.location}`,
      statusLabel: 'Awaiting Assessment',
      receivedLabel: `${formatNzdtDate(i.detectedAt)}, ${formatNzdtShort(i.detectedAt)}`,
      receivedMs: Date.parse(i.detectedAt),
      route: `Route ${i.route}`,
      kind: 'contractor',
      incidentId: i.id,
    })),
    ...incomingSap.map((c): IntakeRow => ({
      key: c.sapId,
      title: `${c.sapId} · ${c.title}`,
      sub: `${c.category} · SAP: ${c.sapStatus}`,
      statusLabel: c.linkedIncidentId !== null ? 'Accepted' : 'Queued',
      receivedLabel: `${formatNzdtDate(c.receivedAt)}, ${formatNzdtShort(c.receivedAt)}`,
      receivedMs: Date.parse(c.receivedAt),
      route: '—',
      kind: 'sap',
      sapId: c.sapId,
      linkedIncidentId: c.linkedIncidentId,
    })),
  ];

  const columns: Array<DataColumn<IntakeRow>> = [
    {
      key: 'summary',
      label: 'Summary',
      sortable: true,
      sortValue: (r) => r.title,
      render: (r) => (
        <span>
          <strong>{r.title}</strong>
          <div className="muted small">{r.sub}</div>
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      filter: 'select',
      filterValue: (r) => r.statusLabel,
      sortValue: (r) => r.statusLabel,
      render: (r) => {
        if (r.kind === 'contractor') return contractorStatus();
        return <IntakeStatus tone="tg-warn" icon="◷" label="Queued" />;
      },
    },
    {
      key: 'received',
      label: 'Received',
      sortable: true,
      sortValue: (r) => r.receivedMs,
      render: (r) => r.receivedLabel,
    },
    {
      key: 'route',
      label: 'Intake Route',
      sortable: true,
      filter: 'select',
      filterValue: (r) => (r.kind === 'contractor' ? 'Contractor alert' : 'SAP EHS intake'),
      sortValue: (r) => (r.kind === 'contractor' ? 'Contractor alert' : 'SAP EHS intake'),
      render: (r) => (r.kind === 'contractor' ? 'Contractor alert' : 'SAP EHS intake'),
    },
    {
      key: 'action',
      label: 'Action',
      render: (r) => {
        if (r.kind === 'contractor' && r.incidentId) {
          return (
            <FioriButton small icon="detail" to={`/operations/incoming/${r.incidentId}`}>
              Review
            </FioriButton>
          );
        }
        return <span className="muted">Auto-intake…</span>;
      },
    },
  ];

  return (
    <div>
      <div className="pagehead">
        <Crumbs trail={['Operations', 'Incoming']} />
        <h1>Incoming Worklist</h1>
        <p className="lede">Review new arrivals and route them for assessment.</p>
      </div>

      <Section title="Incoming Worklist">
        {syncing && (
          <SkeletonTable
            label="Syncing SAP records"
            columns={['Summary', 'Status', 'Received', 'Intake Route', 'Action']}
            rows={4}
          />
        )}
        <p className="muted small">
          {intakeItems} intake items · {reported.length} notification · {unlinked.length} SAP
          candidates
        </p>
        {sapOffline && <p className="muted small">SAP unavailable — showing cached records.</p>}
        {intakeItems === 0 ? (
          <EmptyState
            illustration="☰"
            title="Intake queue is clear"
            description="Contractor notifications and SAP records appear here."
          />
        ) : (
          <DataTable<IntakeRow>
            rows={rows}
            columns={columns}
            rowKey={(r) => r.key}
            searchText={(r) => `${r.title} ${r.sub} ${r.statusLabel}`}
            searchPlaceholder="Search intake"
            pageSize={8}
            emptyTitle="Intake queue is clear"
            emptyDescription="Contractor notifications and SAP records appear here."
          />
        )}
        <p className="muted small">
          {reported.length} operator notification · {unlinked.length} SAP candidates ·{' '}
          {active} active shared incident.
        </p>
      </Section>
    </div>
  );
}
