/**
 * Epoch / timestamp conversion. Pure math and parsing; the zone readings at the
 * bottom lean on ./timezones, which is itself only the browser's Intl API.
 *
 * The useful trick is unit auto-detection: 1721600000 is clearly seconds and
 * 1721600000000 clearly milliseconds, because the magnitudes are five orders
 * apart. Detection by magnitude is unambiguous for any date between 1971 and
 * roughly year 5000, which covers every timestamp anyone pastes in practice.
 */
import { wallTimeIn, offsetMinutes, zoneAbbreviation, formatOffset } from './timezones';

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

/* ------------------------------------------------------------------ */
/* Time zones                                                          */
/* ------------------------------------------------------------------ */

/**
 * A timestamp is an instant, so "what time is that" has a different answer in
 * every zone. UTC alone is not enough: people converting a log line want it in
 * the zone the incident was reported in, which is usually theirs or the one
 * their users are in.
 *
 * These are the zones worth showing without being asked. Ordered west to east
 * so the row order matches the offsets.
 */
export const ZONE_PRESETS: { zone: string; label: string }[] = [
  { zone: 'UTC', label: 'UTC' },
  { zone: 'America/Los_Angeles', label: 'Los Angeles' },
  { zone: 'America/Denver', label: 'Denver' },
  { zone: 'America/Chicago', label: 'Chicago' },
  { zone: 'America/New_York', label: 'New York' },
  { zone: 'America/Sao_Paulo', label: 'São Paulo' },
  { zone: 'Europe/London', label: 'London' },
  { zone: 'Europe/Berlin', label: 'Berlin' },
  { zone: 'Asia/Dubai', label: 'Dubai' },
  { zone: 'Asia/Kolkata', label: 'Kolkata' },
  { zone: 'Asia/Shanghai', label: 'Shanghai' },
  { zone: 'Asia/Tokyo', label: 'Tokyo' },
  { zone: 'Australia/Sydney', label: 'Sydney' },
];

export interface ZoneReading {
  zone: string;
  label: string;
  /** Zone abbreviation at that instant: PDT in July, PST in January. */
  abbr: string;
  /** Offset from UTC at that instant, as "+10:00". */
  offset: string;
  /** "26 Aug 2026, 14:05:09" */
  formatted: string;
  /** ISO 8601 with the zone's own offset, not UTC. */
  iso: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Seconds are the same in every zone, so they come from the instant rather than
 * the zone reading. True for every zone since 1972; before that a few carried
 * offsets that were not whole minutes.
 */
const secondsOf = (ms: number) => new Date(ms).getUTCSeconds();

/**
 * ISO 8601 carrying the zone's own offset. Distinct from toISOString(), which
 * always normalises to UTC and so loses the zone the reading was taken in.
 */
export function isoInZone(ms: number, zone: string): string {
  const d = new Date(ms);
  const w = wallTimeIn(d, zone);
  const off = offsetMinutes(d, zone);
  const sign = off < 0 ? '-' : '+';
  const abs = Math.abs(off);
  const suffix = off === 0 ? 'Z' : `${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
  return `${w.year}-${pad2(w.month)}-${pad2(w.day)}T${pad2(w.hour)}:${pad2(w.minute)}:${pad2(secondsOf(ms))}${suffix}`;
}

/** One instant read in a given zone, with the labels people search by. */
export function readInZone(ms: number, zone: string, label = zone): ZoneReading {
  const d = new Date(ms);
  const w = wallTimeIn(d, zone);
  return {
    zone,
    label,
    abbr: zoneAbbreviation(d, zone),
    offset: formatOffset(offsetMinutes(d, zone)),
    formatted: `${w.day} ${MONTHS[w.month - 1]} ${w.year}, ${pad2(w.hour)}:${pad2(w.minute)}:${pad2(secondsOf(ms))}`,
    iso: isoInZone(ms, zone),
  };
}

/** The preset zones, plus the visitor's own when it is not already listed. */
export function zoneTable(ms: number, localZone?: string): ZoneReading[] {
  const rows = ZONE_PRESETS.map((p) => readInZone(ms, p.zone, p.label));
  if (localZone && !ZONE_PRESETS.some((p) => p.zone === localZone)) {
    rows.push(readInZone(ms, localZone, localZone.split('/').pop()!.replace(/_/g, ' ')));
  }
  return rows;
}
