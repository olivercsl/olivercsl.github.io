/**
 * Windows FILETIME, the format Active Directory stores times in.
 *
 * A count of 100-nanosecond intervals since 1601-01-01 00:00:00 UTC. Two things
 * make it awkward. The values run to 18 digits, past Number.MAX_SAFE_INTEGER,
 * so the arithmetic has to be BigInt or it silently loses precision. And
 * several attributes overload the number: 0 and Int64 max are sentinels meaning
 * "never", while a handful of attributes store negative values that are
 * durations rather than instants.
 *
 * Those sentinels are why the forum threads exist. A converter that renders
 * accountExpires = 0 as "1 January 1601" is not wrong about the arithmetic and
 * is useless to the person asking.
 */
import { zoneTable, type ZoneReading } from './epoch';

/** 1601-01-01 to 1970-01-01, in milliseconds. */
export const FILETIME_EPOCH_OFFSET_MS = 11_644_473_600_000n;

/** Int64 max. Used as "never expires" across Active Directory. */
export const INT64_MAX = 9_223_372_036_854_775_807n;

/** 100-nanosecond intervals per millisecond. */
const PER_MS = 10_000n;

export type LdapKind =
  /** A real instant. */
  | 'timestamp'
  /** Int64 max: the attribute is set to never. */
  | 'never'
  /** Zero: never set, or not applicable, depending on the attribute. */
  | 'zero'
  /** Negative: a duration, as used by maxPwdAge and friends. */
  | 'duration'
  /** Generalized Time string, as used by whenCreated. */
  | 'generalized';

export interface LdapParsed {
  kind: LdapKind;
  /** Unix milliseconds. Present for timestamp and generalized. */
  ms?: number;
  /**
   * Sub-millisecond remainder, 0-9999 in 100ns units. FILETIME is finer than
   * JavaScript dates, and truncating it silently would lose real precision.
   */
  remainder100ns?: number;
  /** Milliseconds of duration, for the negative attributes. Always positive. */
  durationMs?: number;
  /** The raw value, normalised. */
  raw: string;
}

/**
 * Active Directory attributes people arrive holding, and what the sentinels
 * mean for each. The meaning of 0 is attribute-specific, which is the part
 * generic converters get wrong.
 */
export const AD_ATTRIBUTES: {
  name: string;
  what: string;
  zero: string;
  never?: string;
  duration?: true;
}[] = [
  {
    name: 'pwdLastSet',
    what: 'When the password was last changed',
    zero: 'The user must change their password at next logon',
  },
  {
    name: 'accountExpires',
    what: 'When the account expires',
    zero: 'Never expires',
    never: 'Never expires',
  },
  {
    name: 'lastLogon',
    what: 'Last interactive logon, not replicated between domain controllers',
    zero: 'No logon recorded on this domain controller',
  },
  {
    name: 'lastLogonTimestamp',
    what: 'Last logon, replicated, but lagging by up to 14 days by design',
    zero: 'No logon recorded',
  },
  {
    name: 'badPasswordTime',
    what: 'Last failed password attempt',
    zero: 'No failed attempt recorded',
  },
  {
    name: 'lockoutTime',
    what: 'When the account was locked out',
    zero: 'Not locked out',
  },
  {
    name: 'maxPwdAge',
    what: 'How long a password stays valid',
    zero: 'Passwords never expire',
    duration: true,
  },
  {
    name: 'lockoutDuration',
    what: 'How long a lockout lasts',
    zero: 'Locked until an administrator unlocks it',
    duration: true,
  },
  {
    name: 'minPwdAge',
    what: 'How long before a password may be changed again',
    zero: 'May be changed immediately',
    duration: true,
  },
];

/**
 * Generalized Time, the other format AD uses: YYYYMMDDHHMMSS.0Z on whenCreated
 * and whenChanged. Always UTC, and always a fixed width, so a regex is honest
 * here in a way it would not be for a general date parser.
 */
const GENERALIZED = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\.(\d+))?Z$/;

export function parseLdap(input: string): LdapParsed | null {
  const raw = input.trim().replace(/[\s,_]/g, '');
  if (!raw) return null;

  const gen = GENERALIZED.exec(raw);
  if (gen) {
    const [, y, mo, d, h, mi, s] = gen;
    const ms = Date.UTC(+y!, +mo! - 1, +d!, +h!, +mi!, +s!);
    if (Number.isNaN(ms)) return null;
    return { kind: 'generalized', ms, remainder100ns: 0, raw };
  }

  if (!/^-?\d+$/.test(raw)) return null;

  let value: bigint;
  try {
    value = BigInt(raw);
  } catch {
    return null;
  }

  if (value === 0n) return { kind: 'zero', raw };
  if (value === INT64_MAX) return { kind: 'never', raw };

  if (value < 0n) {
    // Duration attributes store the span as a negative count.
    const abs = -value;
    return { kind: 'duration', durationMs: Number(abs / PER_MS), raw };
  }

  const msSince1601 = value / PER_MS;
  const remainder = value % PER_MS;
  const unixMs = msSince1601 - FILETIME_EPOCH_OFFSET_MS;

  // Outside the range JavaScript dates can represent, so there is nothing
  // useful to render even though the arithmetic succeeded.
  if (unixMs > 8_640_000_000_000_000n || unixMs < -8_640_000_000_000_000n) return null;

  return {
    kind: 'timestamp',
    ms: Number(unixMs),
    remainder100ns: Number(remainder),
    raw,
  };
}

/** Unix milliseconds to a FILETIME value, as a string since it exceeds 2^53. */
export function msToFiletime(ms: number): string {
  return ((BigInt(Math.round(ms)) + FILETIME_EPOCH_OFFSET_MS) * PER_MS).toString();
}

/** Generalized Time string for an instant, the form whenCreated uses. */
export function msToGeneralized(ms: number): string {
  return new Date(ms).toISOString().replace(/[-:T]/g, '').replace(/\.\d+Z$/, '.0Z');
}

/**
 * ISO 8601 with seven fractional digits, the precision FILETIME actually
 * carries and the form .NET prints.
 */
export function isoWithTicks(ms: number, remainder100ns = 0): string {
  const base = new Date(ms).toISOString(); // ...THH:MM:SS.mmmZ
  const millis = base.slice(-4, -1);
  return `${base.slice(0, -5)}.${millis}${String(remainder100ns).padStart(4, '0')}Z`;
}

/** Human reading of a duration attribute: "42 days", "30 minutes". */
export function formatDurationMs(ms: number): string {
  const units: [number, string][] = [
    [86_400_000, 'day'],
    [3_600_000, 'hour'],
    [60_000, 'minute'],
    [1000, 'second'],
  ];
  for (const [size, label] of units) {
    if (ms >= size && ms % size === 0) {
      const n = ms / size;
      return `${n} ${label}${n === 1 ? '' : 's'}`;
    }
  }
  for (const [size, label] of units) {
    if (ms >= size) {
      const n = Math.round((ms / size) * 10) / 10;
      return `${n} ${label}${n === 1 ? '' : 's'}`;
    }
  }
  return `${ms} ms`;
}

/** The instant read across the usual zones, reusing the epoch converter's table. */
export function readAcrossZones(ms: number, localZone?: string): ZoneReading[] {
  return zoneTable(ms, localZone);
}
