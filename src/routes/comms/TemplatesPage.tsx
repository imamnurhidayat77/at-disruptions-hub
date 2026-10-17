import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FioriButton } from '../../components/Button.js';
import { Crumbs, Section } from '../../components/chrome.js';
import { DataTable, type DataColumn } from '../../components/DataTable.js';
import {
  TEMPLATE_KINDS,
  buildTemplateMessage,
  buildTemplateTitle,
  needsFirstPublication,
  type TemplateKind,
} from '../../domain/comms.js';
import type { Incident } from '../../domain/types.js';
import { useAppStore } from '../../state/AppStore.js';

function selectPreviewExample(incidents: Incident[]): Incident | undefined {
  return (
    incidents.find(needsFirstPublication) ??
    incidents.find((i) => i.id === 'INC-1043') ??
    incidents.find((i) => i.operationalStatus !== 'REPORTED') ??
    incidents[0]
  );
}

function openComposerFor(
  navigate: (to: string, options?: { state?: unknown }) => void,
  example: Incident | undefined,
  kindToUse: TemplateKind,
): void {
  if (example) navigate(`/comms/incident/${example.id}`, { state: { template: kindToUse } });
  else navigate('/comms/queue');
}

/**
 * Templates: scenario wording patterns for passenger updates. Use Template
 * opens the composer prefilled.
 */
export function TemplatesPage(): React.JSX.Element {
  const { state, setRole } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    setRole('CUSTOMER_INFORMATION');
  }, [setRole]);

  // Preview example prefers an incident that actually needs a publication;
  // INC-1043 is only the fallback demo reference.
  const example = selectPreviewExample(state.incidents);

  function openComposer(kindToUse: TemplateKind): void {
    openComposerFor(navigate, example, kindToUse);
  }

  type TemplateRow = (typeof TEMPLATE_KINDS)[number];
  const columns: Array<DataColumn<TemplateRow>> = [
    {
      key: 'template',
      label: 'Template',
      sortable: true,
      sortValue: (t) => t.label,
      render: (t) => (
        <Link to={`/comms/templates/${t.kind}`}>
          <strong>{t.label}</strong>
        </Link>
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
        <button type="button" className="tbl-link" onClick={() => openComposer(t.kind)}>
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
    </div>
  );
}

/**
 * TemplateDetail: dedicated detail page for a single passenger message
 * template. Shows the same preview previously rendered inline below the
 * table (title/message/channels/note + Use Template).
 */
export function TemplateDetail(): React.JSX.Element {
  const { kind } = useParams<{ kind: string }>();
  const { state, setRole } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    setRole('CUSTOMER_INFORMATION');
  }, [setRole]);

  const template = TEMPLATE_KINDS.find((t) => t.kind === kind);

  // Same example-incident preference as the templates list.
  const example = selectPreviewExample(state.incidents);

  if (!template) {
    return (
      <div>
        <div className="pagehead">
          <Crumbs trail={['Customer Information', 'Templates']} />
          <h1>Template not found</h1>
          <p className="lede">No template found with ID {kind ?? '(unknown)'}.</p>
        </div>
        <div className="actions-bar">
          <FioriButton icon="back" to="/comms/templates">
            Back to templates
          </FioriButton>
        </div>
      </div>
    );
  }

  const templateKind: TemplateKind = template.kind;

  function onUseTemplate(): void {
    openComposerFor(navigate, example, templateKind);
  }

  return (
    <div>
      <div className="pagehead">
        <Crumbs trail={['Customer Information', 'Templates', template.label]} />
        <h1>{template.label}</h1>
        <p className="lede">{template.purpose}</p>
      </div>

      <Section
        title={
          example ? `${template.label} · ${example.route} preview` : 'Template preview'
        }
      >
        {example ? (
          <>
            <div className="preview">
              <p className="muted small">BUS SERVICE ALERT · AT Mobile App + Website</p>
              <h3>{buildTemplateTitle(example, template.kind)}</h3>
              <p>{buildTemplateMessage(example, template.kind)}</p>
            </div>
            <div className="note" role="note">
              Templates supply wording only. Route, location and recovery estimates come
              from the validated shared incident.
            </div>
            <div className="actions-bar">
              <FioriButton icon="back" to="/comms/templates">
                Back to templates
              </FioriButton>
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
