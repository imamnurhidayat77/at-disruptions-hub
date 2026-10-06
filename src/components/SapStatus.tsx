import { useState } from 'react';
import { fetchLiveIncidents } from '../services/sapIncidentService.js';

/**
 * Live-source status with an explicit retry. Failure is shown, never
 * hidden, and the demo continues only on labelled demo data.
 */
export function SapStatus(): React.JSX.Element {
  const [state, setState] = useState<'idle' | 'loading' | 'failed'>('idle');

  async function retry(): Promise<void> {
    setState('loading');
    try {
      await fetchLiveIncidents();
      setState('idle');
    } catch {
      setState('failed');
    }
  }

  return (
    <div>
      <p className="muted small">
        Live source: not connected — continuing with labelled demo data. No live
        channels or SAP connections in this workspace.
      </p>
      {state === 'failed' && (
        <p className="field-error" role="alert">
          SAP incident service is temporarily unavailable.
        </p>
      )}
      <button className="btn" type="button" onClick={() => void retry()} disabled={state === 'loading'}>
        {state === 'loading' ? 'Retrying…' : 'Retry live source'}
      </button>
    </div>
  );
}
