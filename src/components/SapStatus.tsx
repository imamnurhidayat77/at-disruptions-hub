import { useEffect, useState } from 'react';
import {
  SapNotConfiguredError,
  SapUnavailableError,
  fetchSapStatus,
  type SapStatusInfo,
} from '../services/sap/sapIncidentService.ts';

/**
 * Live-source status with an explicit retry. Failure is shown, never
 * hidden, and the demo continues only on labelled demo data.
 */
export function SapStatus(): React.JSX.Element {
  const [info, setInfo] = useState<SapStatusInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [failed, setFailed] = useState(false);

  async function refresh(): Promise<void> {
    setChecking(true);
    setFailed(false);
    try {
      setInfo(await fetchSapStatus());
    } catch (err) {
      setFailed(true);
      if (err instanceof SapNotConfiguredError || err instanceof SapUnavailableError) {
        setInfo(null);
      }
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div>
      <p className="muted small">
        {info === null
          ? 'Live source: not connected — continuing with labelled demo data. No live channels or SAP connections in this workspace.'
          : info.state === 'connected'
            ? `Live source: connected — last sync ${info.lastSync ?? 'unknown'}${
                info.lastCount === null ? '' : ` (${info.lastCount} records)`
              }.`
            : info.state === 'not-configured'
              ? 'Live source: not configured — continuing with labelled demo data.'
              : 'Live source: unavailable — continuing with labelled demo data.'}
      </p>
      {failed && (
        <p className="field-error" role="alert">
          SAP Incident Service is temporarily unavailable.
        </p>
      )}
      <button className="btn" type="button" onClick={() => void refresh()} disabled={checking}>
        {checking ? '↻ Retrying…' : '↻ Retry live source'}
      </button>
    </div>
  );
}

/** Subtle ops-only connection chip for navigation areas. */
export function SapNavChip(): React.JSX.Element {
  const [label, setLabel] = useState('SAP ○ Not configured');

  useEffect(() => {
    let live = true;
    fetchSapStatus()
      .then((info: SapStatusInfo) => {
        if (!live) return;
        setLabel(
          info.state === 'connected'
            ? 'SAP ● Connected'
            : info.state === 'unavailable'
              ? 'SAP ⚠ Unavailable'
              : 'SAP ○ Not configured',
        );
      })
      .catch(() => {
        if (live) setLabel('SAP ⚠ Unavailable');
      });
    return () => {
      live = false;
    };
  }, []);

  return (
    <span className="sap-chip" title="SAP Incident Service connection (demo probe, no SAP call)">
      {label}
    </span>
  );
}
