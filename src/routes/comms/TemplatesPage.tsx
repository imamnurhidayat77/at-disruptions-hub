import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FioriButton } from '../../components/Button.js';
import { Crumbs, Section } from '../../components/chrome.js';
import { DataTable, type DataColumn } from '../../components/DataTable.js';
import {
  TEMPLATE_KINDS,
  buildTemplateMessage,
  buildTemplateTitle,
  type TemplateKind,
} from '../../domain/comms.js';
import { useAppStore } from '../../state/AppStore.js';

/**
 * Templates — Figma "04 Customer Information". Three static wording
 * patterns; the preview renders the selected pattern with shared
 * incident values, and Use Template opens the composer prefilled.
 */
export function TemplatesPage(): React.JSX.Element {
  const { state, setRole } = useAppStore();
  const navigate = useNavigate();
  const [kind, setKind] = useState<TemplateKind>('breakdown');

  useEffect(() => {
    setRole('CUSTOMER_INFORMATION');
  }, [setRole]);

  const example =
    state.incidents.find((i) => i.id === 'INC-1043') ??
    state.incidents.find((i) => i.operationalStatus !== 'REPORTED') ??
    state.incidents[0];

  function onUseTemplate(): void {
    const target = state.incidents.find((i) => i.id === 'INC-1043') ?? example;
    if (target) navigate(`/comms/incident/${target.id}`, { state: { template: kind } });
    else navigate('/comms/queue');
  }

  type TemplateRow = (typeof TEMPLATE_KINDS)[number];
  const columns: Array<DataColumn<TemplateRow>> = [
    {
      key: 'template',
      label: 'Template',
      sortable: true,
      sortValue: (t) => t.label,
      render: (t) => (
        <button type="button" className="tbl-link" onClick={() => setKind(t.kind)}>
          <strong>{t.label}</strong>
        </button>
      ),
    },
    {
      key: 'purpose',
      label: 'Purpose',
      sortable: true,
      sortValue: (t) => t.purpose,
      render: (t) => t.purpose,
    },
    {
      key: 'channels',
      label: 'Channels',
      filter: 'select',
      filterValue: () => 'AT Mobile App · Website',
      render: () => 'AT Mobile App · Website',
    },
    {
      key: 'status',
      label: 'Status',
      filter: 'select',
      filterValue: () => 'Available',
      render: () => <span className="badge tg-idle">○ Available</span>,
    },
    {
      key: 'action',
      label: 'Action',
      render: (t) => (
        <button type="button" className="tbl-link" onClick={() => setKind(t.kind)}>
          Use Template
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="pagehead">
        <Crumbs trail={['Customer Information', 'Templates']} />
        <h1>Templates</h1>
        <p className="lede">
          Use consistent language for passenger updates. Validate incident details before
          publication.
        </p>
      </div>

      <Section
        title="Passenger Message Templates"
        count={`${TEMPLATE_KINDS.length} records`}
      >
        <DataTable<TemplateRow>
          rows={[...TEMPLATE_KINDS]}
          columns={columns}
          rowKey={(t) => t.kind}
          searchText={(t) => `${t.label} ${t.purpose}`}
          searchPlaceholder="Search templates"
          pageSize={8}
          emptyTitle="No templates available"
          emptyDescription="Passenger message templates appear here."
        />
      </Section>

      <Section
        title={
          example
            ? `${TEMPLATE_KINDS.find((t) => t.kind === kind)?.label} · ${example.route} preview`
            : 'Template preview'
        }
      >
        {example ? (
          <>
            <div className="preview">
              <p className="muted small">BUS SERVICE ALERT · DEMO · AT Mobile App + Website</p>
              <h3>{buildTemplateTitle(example, kind)}</h3>
              <p>{buildTemplateMessage(example, kind)}</p>
            </div>
            <div className="note" role="note">
              Templates supply wording only. Route, location and recovery estimates come
              from the validated shared incident.
            </div>
            <div className="actions-bar">
              <FioriButton design="emphasized" icon="arrowRight" onClick={onUseTemplate}>
                Use Template
              </FioriButton>
            </div>
          </>
        ) : (
          <p className="muted">No incidents found.</p>
        )}
      </Section>
    </div>
  );
}
