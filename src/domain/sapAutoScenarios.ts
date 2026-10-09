import type { PassengerImpact } from './types.ts';

/**
 * Deterministic Auckland-flavoured dummy scenarios for SAP auto-intake.
 * Dependency-free (no runtime imports) so the SAP service layer and its
 * node-based tests can use it without dragging the domain graph along.
 * SAP EHS records carry no bus-operation data, so each SAP ID maps to
 * one of 5 coherent scenarios (same ID → same scenario, stable across
 * reloads). Explicitly demo data, never presented as SAP values.
 */
const AUTO_SCENARIOS = [
  {
    route: '70',
    location: 'Newmarket — Broadway near Newmarket interchange',
    disruptionType: 'Vehicle breakdown',
    estimatedDelayMinutes: '25',
    passengerImpact: 'HIGH',
  },
  {
    route: '18',
    location: 'Great North Road — both directions',
    disruptionType: 'Road blocked — no service',
    estimatedDelayMinutes: '40',
    passengerImpact: 'HIGH',
  },
  {
    route: '22N',
    location: 'New North Road — citybound',
    disruptionType: 'Vehicle unavailable',
    estimatedDelayMinutes: '15',
    passengerImpact: 'MEDIUM',
  },
  {
    route: '75',
    location: 'Symonds Street — citybound',
    disruptionType: 'Congestion — delays',
    estimatedDelayMinutes: '12',
    passengerImpact: 'LOW',
  },
  {
    route: '95B',
    location: 'Dominion Road — both directions',
    disruptionType: 'Vehicle breakdown',
    estimatedDelayMinutes: '20',
    passengerImpact: 'MEDIUM',
  },
] as const;

export interface AutoScenario {
  route: string;
  location: string;
  disruptionType: string;
  estimatedDelayMinutes: string;
  passengerImpact: PassengerImpact;
}

export function dummyScenarioFor(sapId: string): AutoScenario {
  let hash = 0;
  for (let i = 0; i < sapId.length; i += 1) hash = (hash + sapId.charCodeAt(i)) >>> 0;
  const s = AUTO_SCENARIOS[hash % AUTO_SCENARIOS.length];
  return { ...s };
}

/**
 * Operational disruption label for a SAP title. Recognised keywords map
 * to AT wording; anything else falls back to the dummy scenario so the
 * type column never shows raw EHS jargon or blanks.
 */
export function disruptionTypeFor(title: string, scenario: AutoScenario): string {
  const t = title.toLowerCase();
  if (/breakdown|fault/.test(t)) return 'Vehicle breakdown';
  if (/blocked|closure|closed/.test(t)) return 'Road blocked — no service';
  if (/unavailable/.test(t)) return 'Vehicle unavailable';
  if (/congest|delay/.test(t)) return 'Congestion — delays';
  if (/inspect/.test(t)) return 'Facility inspection';
  if (/safety|observation/.test(t)) return 'Safety observation';
  if (/maintenance/.test(t)) return 'Maintenance report';
  return scenario.disruptionType;
}
