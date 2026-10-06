import type { PassengerImpact, Severity } from './types.js';

/**
 * Prototype severity assessment — ONE reusable domain function.
 *
 * DEMONSTRATION ASSUMPTIONS, not official Auckland Transport policy.
 * The UI must label outputs accordingly. Do not duplicate this logic
 * in components; import assessSeverity instead.
 */
export interface SeverityInput {
  estimatedDelayMinutes: number;
  passengerImpact: PassengerImpact;
  majorInterchangeAffected: boolean;
  disruptionType: string;
}

export interface SeverityAssessment {
  level: Severity;
  score: number;
  factors: string[];
  recommendedAction: string;
  /** Disclaimer text the UI must display alongside the result. */
  prototypeNote: string;
}

const PROTOTYPE_NOTE =
  'Prototype severity rules are demonstration assumptions, not official Auckland Transport operational policy.';

const RECOMMENDED_ACTIONS: Record<Severity, string> = {
  CRITICAL:
    'Escalate immediately: assign senior owner, start recovery and publish a passenger update within 10 minutes.',
  HIGH: 'Assign an owner now and prepare the first passenger update within 10 minutes.',
  MEDIUM: 'Assign an owner and monitor; publish a passenger update if delays grow.',
  LOW: 'Monitor; routine passenger advice only.',
};

export function assessSeverity(input: SeverityInput): SeverityAssessment {
  let score = 0;
  const factors: string[] = [];

  if (input.estimatedDelayMinutes >= 20) {
    score += 2;
    factors.push(`Estimated delay ${input.estimatedDelayMinutes} min (≥ 20 min)`);
  } else if (input.estimatedDelayMinutes >= 10) {
    score += 1;
    factors.push(`Estimated delay ${input.estimatedDelayMinutes} min (10–19 min)`);
  }

  if (input.passengerImpact === 'HIGH') {
    score += 2;
    factors.push('High passenger impact');
  } else if (input.passengerImpact === 'MEDIUM') {
    score += 1;
    factors.push('Medium passenger impact');
  }

  if (input.majorInterchangeAffected) {
    score += 2;
    factors.push('Major interchange affected');
  }

  const type = input.disruptionType.trim().toLowerCase();
  if (type.includes('breakdown') || type.includes('blocked') || type.includes('no service')) {
    score += 1;
    factors.push(`Disruption type: ${input.disruptionType}`);
  }

  let level: Severity;
  if (score >= 8) level = 'CRITICAL';
  else if (score >= 5) level = 'HIGH';
  else if (score >= 3) level = 'MEDIUM';
  else level = 'LOW';

  return {
    level,
    score,
    factors,
    recommendedAction: RECOMMENDED_ACTIONS[level],
    prototypeNote: PROTOTYPE_NOTE,
  };
}

/**
 * Validate a severity override. Returns an error message, or null when valid.
 * An override ALWAYS requires a reason (audited in Phase 3).
 */
export function validateSeverityOverride(reason: string): string | null {
  if (reason.trim().length < 10) {
    return 'An override reason of at least 10 characters is required.';
  }
  return null;
}
