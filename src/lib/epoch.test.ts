import { describe, it, expect } from 'vitest';
import {
  detectUnit,
  toMilliseconds,
  smartParse,
  epochStrings,
  utcToMs,
  formatRelative,
  readInZone,
  isoInZone,
  zoneTable,
  ZONE_PRESETS,
} from './epoch';
import { offsetMinutes } from './timezones';

// 2026-07-22T00:00:00Z
const T = 1784678400;

describe('detectUnit', () => {
  it('detects by magnitude', () => {
    expect(detectUnit(T)).toBe('s');
    expect(detectUnit(T * 1000)).toBe('ms');
    expect(detectUnit(T * 1e6)).toBe('us');
    expect(detectUnit(T * 1e9)).toBe('ns');
  });

  it('handles negative (pre-1970) values', () => {
    expect(detectUnit(-1000000)).toBe('s');
    expect(detectUnit(-1000000000000)).toBe('ms');
  });

  it('handles the boundaries', () => {
    expect(detectUnit(1e11 - 1)).toBe('s'); // year ~5138
    expect(detectUnit(1e11)).toBe('ms');
    expect(detectUnit(1e14)).toBe('us');
    expect(detectUnit(1e17)).toBe('ns');
  });
});

describe('toMilliseconds', () => {
  it('converts every unit', () => {
    expect(toMilliseconds(T, 's')).toBe(T * 1000);
    expect(toMilliseconds(T * 1000, 'ms')).toBe(T * 1000);
    expect(toMilliseconds(T * 1e6, 'us')).toBe(T * 1000);
    expect(toMilliseconds(T * 1e9, 'ns')).toBe(T * 1000);
  });
});

describe('smartParse', () => {
  it('parses epoch seconds with auto-detection', () => {
    const r = smartParse(String(T));
    expect(r).toMatchObject({ kind: 'epoch', unit: 's', ms: T * 1000 });
  });

  it('parses epoch milliseconds with auto-detection', () => {
    const r = smartParse(String(T * 1000));
    expect(r).toMatchObject({ kind: 'epoch', unit: 'ms', ms: T * 1000 });
  });

  it('honours a forced unit over detection', () => {
    const r = smartParse('1000', 'ms');
    expect(r).toMatchObject({ kind: 'epoch', unit: 'ms', ms: 1000 });
  });

  it('parses ISO 8601 date strings', () => {
    expect(smartParse('2026-07-22T00:00:00Z')).toMatchObject({ kind: 'date', ms: T * 1000 });
  });

  it('parses "YYYY-MM-DD HH:MM" with a space', () => {
    const r = smartParse('2026-07-22 00:00Z');
    expect(r).toMatchObject({ kind: 'date', ms: T * 1000 });
  });

  it('rejects garbage and empty input', () => {
    expect(smartParse('')).toBeNull();
    expect(smartParse('not a date')).toBeNull();
    expect(smartParse('12.34.56')).toBeNull();
  });

  it('rejects epochs outside the representable date range', () => {
    // 1e22 ns is ~year 318857, beyond the JS Date range even as nanoseconds.
    expect(smartParse('9999999999999999999999')).toBeNull();
    // And a huge value forced as seconds is out of range immediately.
    expect(smartParse('99999999999999999999', 's')).toBeNull();
  });

  it('accepts negative epochs for pre-1970 instants', () => {
    const r = smartParse('-86400');
    expect(r).toMatchObject({ kind: 'epoch', unit: 's', ms: -86400000 });
  });
});

describe('epochStrings', () => {
  it('renders all four units without float noise', () => {
    const s = epochStrings(T * 1000);
    expect(s.s).toBe('1784678400');
    expect(s.ms).toBe('1784678400000');
    expect(s.us).toBe('1784678400000000');
    expect(s.ns).toBe('1784678400000000000');
  });
});

describe('utcToMs', () => {
  it('round-trips a known instant', () => {
    expect(utcToMs(2026, 7, 22, 0, 0, 0)).toBe(T * 1000);
    expect(utcToMs(1970, 1, 1, 0, 0, 0)).toBe(0);
  });
});

describe('formatRelative', () => {
  const now = T * 1000;
  it('describes past instants', () => {
    expect(formatRelative(now - 500, now)).toBe('just now');
    expect(formatRelative(now - 90_000, now)).toBe('2 minutes ago');
    expect(formatRelative(now - 3 * 86_400_000, now)).toBe('3 days ago');
    expect(formatRelative(now - 2 * 31_557_600_000, now)).toBe('2 years ago');
  });
  it('describes future instants', () => {
    expect(formatRelative(now + 7_200_000, now)).toBe('in 2 hours');
    expect(formatRelative(now + 86_400_000, now)).toBe('in 1 day');
  });
});

describe('zone readings', () => {
  // 2026-08-26T04:05:09Z. Northern summer, so the US zones are on daylight time
  // and Sydney is on standard time.
  const MS = Date.UTC(2026, 7, 26, 4, 5, 9);

  it('reads one instant in a named zone', () => {
    const la = readInZone(MS, 'America/Los_Angeles', 'Los Angeles');
    expect(la.formatted).toBe('25 Aug 2026, 21:05:09');
    expect(la.offset).toBe('UTC -7');
    expect(la.abbr).toBe('PDT');
  });

  it('gives the standard abbreviation in winter', () => {
    const january = Date.UTC(2026, 0, 26, 4, 5, 9);
    expect(readInZone(january, 'America/Los_Angeles').abbr).toBe('PST');
    expect(readInZone(january, 'America/New_York').abbr).toBe('EST');
  });

  it('carries the zone offset in ISO output rather than normalising to UTC', () => {
    expect(isoInZone(MS, 'UTC')).toBe('2026-08-26T04:05:09Z');
    expect(isoInZone(MS, 'Asia/Kolkata')).toBe('2026-08-26T09:35:09+05:30');
    expect(isoInZone(MS, 'America/Los_Angeles')).toBe('2026-08-25T21:05:09-07:00');
  });

  it('agrees with toISOString for UTC', () => {
    expect(isoInZone(MS, 'UTC')).toBe(new Date(MS).toISOString().replace('.000Z', 'Z'));
  });

  it('keeps seconds identical across zones', () => {
    const seconds = zoneTable(MS).map((r) => r.formatted.slice(-2));
    expect(new Set(seconds).size).toBe(1);
  });

  it('appends the visitor zone only when it is not already a preset', () => {
    expect(zoneTable(MS, 'Asia/Tokyo').length).toBe(ZONE_PRESETS.length);
    const withKarachi = zoneTable(MS, 'Asia/Karachi');
    expect(withKarachi.length).toBe(ZONE_PRESETS.length + 1);
    expect(withKarachi[withKarachi.length - 1]!.label).toBe('Karachi');
  });

  it('orders the presets west to east', () => {
    const offsets = ZONE_PRESETS.map((p) => offsetMinutes(new Date(MS), p.zone));
    // UTC leads, then the rest ascend
    expect(offsets[0]).toBe(0);
    const rest = offsets.slice(1);
    expect([...rest].sort((a, b) => a - b)).toEqual(rest);
  });
});
