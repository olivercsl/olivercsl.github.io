/**
 * Epoch / timestamp conversion. Pure math and parsing, no dependencies.
 *
 * The useful trick is unit auto-detection: 1721600000 is clearly seconds and
 * 1721600000000 clearly milliseconds, because the magnitudes are five orders
 * apart. Detection by magnitude is unambiguous for any date between 1971 and
 * roughly year 5000, which covers every timestamp anyone pastes in practice.
 */

export type EpochUnit = 's' | 'ms' | 'us' | 'ns';

export const UNIT_LABELS: Record<EpochUnit, string> = {
  s: 'seconds',
  ms: 'milliseconds',
  us: 'microseconds',
  ns: 'nanoseconds',
};

/** Detect the unit of a raw epoch number by magnitude. */
export function detectUnit(value: number): EpochUnit {
  const abs = Math.abs(value);
  if (abs < 1e11) return 's'; // up to year ~5138
  if (abs < 1e14) return 'ms';
  if (abs < 1e17) return 'us';
  return 'ns';
}

/** Convert a raw epoch value in a given unit to milliseconds. */
export function toMilliseconds(value: number, unit: EpochUnit): number {
  switch (unit) {
    case 's':
      return value * 1000;
    case 'ms':
      return value;
    case 'us':
      return value / 1000;
    case 'ns':
      return value / 1e6;
  }
}

export interface ParsedInput {
  kind: 'epoch' | 'date';
  ms: number;
  /** Present when kind is epoch. */
  unit?: EpochUnit;
}

/**
 * Interpret free-form input: a numeric epoch (unit auto-detected, overridable)
 * or a date string such as ISO 8601, RFC 2822, or "2026-07-22 14:30".
 */
export function smartParse(input: string, forcedUnit?: EpochUnit): ParsedInput | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const value = Number(trimmed);
    if (!Number.isFinite(value)) return null;
    const unit = forcedUnit ?? detectUnit(value);
    const ms = toMilliseconds(value, unit);
    // Reject values outside JS Date range (±8.64e15 ms).
    if (Math.abs(ms) > 8.64e15) return null;
    return { kind: 'epoch', ms, unit };
  }

  // "2026-07-22 14:30" is not ISO; make it so before handing to Date.parse,
  // otherwise engines disagree about it.
  const normalized = /^\d{4}-\d{2}-\d{2} \d/.test(trimmed) ? trimmed.replace(' ', 'T') : trimmed;
  const ms = Date.parse(normalized);
  if (Number.isNaN(ms)) return null;
  return { kind: 'date', ms };
}

/** Epoch value of an instant in each unit, as strings safe from float noise. */
export function epochStrings(ms: number): Record<EpochUnit, string> {
  return {
    s: String(Math.floor(ms / 1000)),
    ms: String(Math.floor(ms)),
    us: String(Math.floor(ms) * 1000),
    ns: `${Math.floor(ms)}000000`,
  };
}

/** Milliseconds for a wall-clock reading interpreted as UTC. */
export function utcToMs(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number,
  second: number,
): number {
  return Date.UTC(year, month - 1, day, hour, minute, second);
}

/**
 * Relative description of an instant vs a reference: "3 days ago", "in 2h".
 * Rounded to the largest sensible unit, matching how people say it.
 */
export function formatRelative(ms: number, now: number): string {
  const diff = ms - now;
  const abs = Math.abs(diff);
  const suffix = diff <= 0 ? ' ago' : '';
  const prefix = diff > 0 ? 'in ' : '';

  const units: [number, string][] = [
    [1000, 'second'],
    [60_000, 'minute'],
    [3_600_000, 'hour'],
    [86_400_000, 'day'],
    [31_557_600_000, 'year'],
  ];

  if (abs < 1000) return 'just now';
  for (let i = units.length - 1; i >= 0; i--) {
    const [size, label] = units[i]!;
    if (abs >= size) {
      const n = Math.round(abs / size);
      return `${prefix}${n} ${label}${n === 1 ? '' : 's'}${suffix}`;
    }
  }
  return 'just now';
}
