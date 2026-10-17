/**
 * Demo calendar day for seed and example timestamps (yyyy-mm-dd, NZDT).
 *
 * Seeded clock times stay canonical (Route 70 is detected at 09:02) but sit
 * on the current day, so durations measured against live actions stay
 * realistic. Seeded times run up to 09:30, so before 10:00 NZDT the previous
 * day is used and nothing is ever seeded in the future.
 */

const NZDT_OFFSET_MS = 13 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const SEED_DAY_READY_HOUR = 10;

export function demoDay(daysAgo = 0, nowMs: number = Date.now()): string {
  const local = new Date(nowMs + NZDT_OFFSET_MS);
  const shift = local.getUTCHours() < SEED_DAY_READY_HOUR ? 1 : 0;
  return new Date(local.getTime() - (daysAgo + shift) * DAY_MS).toISOString().slice(0, 10);
}
