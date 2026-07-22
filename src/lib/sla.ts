/**
 * SLA and error-budget arithmetic. Pure math, no dependencies.
 *
 * Period lengths use the astronomical year (365.25 days) with a month defined
 * as one twelfth of it (30.44 days). Stated on the page, since "per month"
 * figures differ slightly between tools that assume 30 days and those that
 * assume this average.
 */

export const PERIODS = {
  day: 86_400,
  week: 604_800,
  month: 2_629_800, // 365.25d / 12
  quarter: 7_889_400,
  year: 31_557_600,
} as const;

export type PeriodKey = keyof typeof PERIODS;

export const COMMON_TARGETS = [90, 95, 99, 99.5, 99.9, 99.95, 99.99, 99.999] as const;

/** Allowed downtime in seconds for an availability percentage over a period. */
export function downtimeSeconds(percent: number, periodSeconds: number): number {
  const p = clampPercent(percent);
  return periodSeconds * (1 - p / 100);
}

/** Serial chain: the whole is up only when every dependency is up. */
export function compositeAvailability(percents: number[]): number {
  return percents.reduce((acc, p) => acc * (clampPercent(p) / 100), 1) * 100;
}

/** Redundant pair/set: down only when every instance is down at once. */
export function redundantAvailability(percents: number[]): number {
  const allDown = percents.reduce((acc, p) => acc * (1 - clampPercent(p) / 100), 1);
  return (1 - allDown) * 100;
}

export interface ErrorBudget {
  allowedSeconds: number;
  usedSeconds: number;
  remainingSeconds: number;
  burnedPercent: number; // 0..100+, can exceed 100 when the budget is blown
}

export function errorBudget(targetPercent: number, period: PeriodKey, usedSeconds: number): ErrorBudget {
  const allowed = downtimeSeconds(targetPercent, PERIODS[period]);
  const used = Math.max(0, usedSeconds);
  return {
    allowedSeconds: allowed,
    usedSeconds: used,
    remainingSeconds: allowed - used,
    burnedPercent: allowed > 0 ? (used / allowed) * 100 : used > 0 ? Infinity : 0,
  };
}

function clampPercent(p: number): number {
  if (!Number.isFinite(p)) return 0;
  return Math.min(100, Math.max(0, p));
}

/**
 * Human-readable duration: the two most significant units, e.g. "3d 16h",
 * "52m 36s", "0.9s". Sub-second values keep one decimal so a 99.999% day
 * budget does not display as zero.
 */
export function formatDuration(seconds: number): string {
  const s = Math.abs(seconds);
  const sign = seconds < 0 ? '-' : '';
  if (s < 1) return `${sign}${(Math.round(s * 10) / 10).toString()}s`;

  const units: [number, string][] = [
    [86_400, 'd'],
    [3_600, 'h'],
    [60, 'm'],
    [1, 's'],
  ];

  const parts: string[] = [];
  let rest = Math.round(s);
  for (const [size, label] of units) {
    if (parts.length === 2) break;
    const n = Math.floor(rest / size);
    if (n > 0 || (parts.length === 1 && label === 's' && n >= 0)) {
      if (n > 0) parts.push(`${n}${label}`);
      rest -= n * size;
    }
  }
  return sign + (parts.length ? parts.join(' ') : '0s');
}

/** "Three and a half nines" style label for a percentage, when it has one. */
export function ninesLabel(percent: number): string | null {
  const map: Record<string, string> = {
    '90': 'one nine',
    '99': 'two nines',
    '99.9': 'three nines',
    '99.95': 'three and a half nines',
    '99.99': 'four nines',
    '99.999': 'five nines',
    '99.9999': 'six nines',
  };
  return map[String(percent)] ?? null;
}
