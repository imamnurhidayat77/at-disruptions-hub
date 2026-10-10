import { useEffect, useState } from 'react';

/**
 * Live clock for KPI countdowns. Returns the current time as an ISO string
 * and re-renders every `stepMs` while `active`. Pass the value as `nowIso`
 * to `firstCommunicationKpi` so elapsed/remaining displays tick.
 */
export function useNowTick(active: boolean, stepMs = 1000): string {
  const [now, setNow] = useState(() => new Date().toISOString());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(new Date().toISOString()), stepMs);
    return () => clearInterval(t);
  }, [active, stepMs]);
  return now;
}
