import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Crumbs, Section } from '../../components/chrome.js';
import { EmptyState } from '../../components/EmptyState.js';
import { FioriButton } from '../../components/Button.js';
import { SapSelect } from '../../components/forms.js';
import { useAppStore } from '../../state/AppStore.js';
import { RecoveryPanel } from './RecoveryPanel.js';

/** Recovery — Figma "03 AT Operations" completion screen. */
export function Recovery(): React.JSX.Element {
  const { state, setRole } = useAppStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setRole('OPERATIONS');
  }, [setRole]);

  const open = state.incidents.filter(
    (i) =>
      i.operationalStatus === 'ACTIVE' ||
      i.operationalStatus === 'RECOVERY_IN_PROGRESS' ||
      i.operationalStatus === 'RESTORED',
  );
  const justRestored = state.incidents.filter((i) => i.operationalStatus === 'RESTORED');
  const paramId = searchParams.get('incident');
  const effectiveId = selectedId ?? paramId;
  const selected = open.find((i) => i.id === effectiveId) ?? open[0] ?? null;
  const backId =
    (paramId && open.some((i) => i.id === paramId) ? paramId : selected?.id) ?? null;

  function onSelectIncident(nextId: string): void {
    setSelectedId(nextId);
    setSearchParams({ incident: nextId });
  }

  return (
    <div>
      <div className="pagehead">
        <Crumbs trail={['Operations', 'Recovery']} />
        <h1>Recovery</h1>
        <p className="lede">
          {selected
            ? `${selected.id} · Route ${selected.route} — ${selected.disruptionType} · ${selected.location}`
            : 'Service recovery across open incidents — updated here.'}
        </p>
        {paramId && backId && (
          <div className="actions-bar">
            <FioriButton
              design="transparent"
              icon="back"
              to={`/operations/incident/${backId}`}
            >
              Back to incident workspace
            </FioriButton>
          </div>
        )}
      </div>

      {justRestored.length > 0 && (
        <div className="success" role="status">
          Normal service restored. Confirm the recovery record before proceeding to
          closure.
          <div className="actions-bar">
            <FioriButton
              design="emphasized"
              icon="arrowRight"
              to={`/operations/incident/${justRestored[0].id}/close`}
            >
              Close {justRestored[0].id}
            </FioriButton>
          </div>
        </div>
      )}

      {open.length === 0 ? (
        <Section title="Recovery board">
          <EmptyState
            illustration="↻"
            title="No open recovery"
            description="No incidents in active recovery. Validate and assess incoming notifications first."
            action={
              <FioriButton design="emphasized" icon="inbox" to="/operations/incoming">
                Open incoming
              </FioriButton>
            }
          />
        </Section>
      ) : (
        <>
          <Section title={`Open recovery (${open.length})`}>
            <SapSelect
              id="recovery-incident"
              label="Recovery incident"
              value={selected?.id ?? ''}
              onChange={onSelectIncident}
              options={open.map((i) => ({
                value: i.id,
                label: `${i.id} · Route ${i.route} — ${i.disruptionType}`,
              }))}
            />
            {selected && (
              <p className="muted small">
                {selected.location} · Owner {selected.owner ?? '— unassigned'}
              </p>
            )}
          </Section>
          {selected && <RecoveryPanel key={selected.id} incident={selected} />}
        </>
      )}
    </div>
  );
}
