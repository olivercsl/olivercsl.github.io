import { describe, it, expect } from 'vitest';
import {
  toUnixMs,
  fromUnixMs,
  decodeAll,
  isSentinel,
  EPOCH_OFFSET_S,
  KNOWN_COLUMNS,
  FORMATS,
} from './browsertime';

describe('epoch offsets', () => {
  // Derived from Date.UTC rather than copied from a reference, since the first
  // LDAP example I found online was wrong by two months.
  it('matches the offsets computed from the calendar', () => {
    expect(EPOCH_OFFSET_S.webkit).toBe(-Date.UTC(1601, 0, 1) / 1000);
    expect(EPOCH_OFFSET_S.hfs).toBe(-Date.UTC(1904, 0, 1) / 1000);
    expect(EPOCH_OFFSET_S.cocoa).toBe(-Date.UTC(2001, 0, 1) / 1000);
  });
});

describe('conversion', () => {
  const MS = Date.UTC(2024, 0, 17, 21, 20, 0);

  it('converts a Chrome History value', () => {
    expect(new Date(toUnixMs(13350000000000000, 'webkit')).toISOString()).toBe(
      '2024-01-17T21:20:00.000Z',
    );
  });

  it('converts a Cocoa timestamp', () => {
    // Seconds since 2001-01-01
    expect(new Date(toUnixMs(0, 'cocoa')).toISOString()).toBe('2001-01-01T00:00:00.000Z');
    expect(new Date(toUnixMs(725843000, 'cocoa')).getUTCFullYear()).toBe(2024);
  });

  it('converts an HFS+ timestamp', () => {
    expect(new Date(toUnixMs(0, 'hfs')).toISOString()).toBe('1904-01-01T00:00:00.000Z');
  });

  it('round-trips every format', () => {
    for (const f of FORMATS) {
      const raw = fromUnixMs(MS, f.id);
      expect(new Date(toUnixMs(Number(raw), f.id)).toISOString()).toBe(new Date(MS).toISOString());
    }
  });

  it('keeps the 17-digit WebKit value exact', () => {
    const raw = fromUnixMs(MS, 'webkit');
    expect(raw).toBe('13350000000000000');
    expect(raw.length).toBe(17);
  });
});

describe('decoding an unlabelled value', () => {
  it('offers every reading rather than guessing one', () => {
    // A 10-digit number is a valid Cocoa, HFS+ and Unix value at once
    const r = decodeAll('1700000000');
    const years = r.filter((x) => x.plausible).map((x) => new Date(x.ms).getUTCFullYear());
    expect(years.length).toBeGreaterThan(1);
  });

  it('puts the plausible readings first', () => {
    const r = decodeAll('13350000000000000');
    expect(r[0]!.plausible).toBe(true);
    expect(r[0]!.format).toBe('webkit');
  });

  it('drops readings that fall outside what a date can hold', () => {
    // 13350000000000000 read as Unix seconds is hundreds of millions of years
    // out, past what a Date represents, so it is not offered at all rather
    // than offered and flagged.
    const r = decodeAll('13350000000000000');
    expect(r.find((x) => x.format === 'unix_s')).toBeUndefined();
    expect(r.find((x) => x.format === 'webkit')!.plausible).toBe(true);
  });

  it('flags a representable reading that is not from the browser era', () => {
    const r = decodeAll('1700000000');
    const asMs = r.find((x) => x.format === 'unix_ms')!;
    expect(asMs.plausible).toBe(false); // 1970, twenty days in
  });

  it('reads Cocoa and Unix as decades apart for the same digits', () => {
    const r = decodeAll('725843000');
    const cocoa = r.find((x) => x.format === 'cocoa')!;
    const unix = r.find((x) => x.format === 'unix_s')!;
    expect(new Date(cocoa.ms).getUTCFullYear()).toBe(2024);
    expect(new Date(unix.ms).getUTCFullYear()).toBe(1992);
  });

  it('accepts a fractional Cocoa value', () => {
    expect(decodeAll('725843000.5').length).toBeGreaterThan(0);
  });

  it('tolerates separators pasted from a console', () => {
    expect(decodeAll('13,350,000,000,000,000')[0]!.format).toBe('webkit');
    expect(decodeAll(' 13 350 000 000 000 000 ')[0]!.format).toBe('webkit');
  });

  it('rejects text', () => {
    expect(decodeAll('')).toEqual([]);
    expect(decodeAll('last_visit_time')).toEqual([]);
  });
});

describe('sentinels', () => {
  it('recognises zero, which is not 1601', () => {
    expect(isSentinel('0')).toBe(true);
    expect(isSentinel(' 0 ')).toBe(true);
    expect(isSentinel('0.0')).toBe(true);
    expect(isSentinel('13350000000000000')).toBe(false);
  });
});

describe('column reference', () => {
  it('names the columns people arrive holding', () => {
    const cols = KNOWN_COLUMNS.map((c) => c.column);
    expect(cols).toContain('last_visit_time');
    expect(cols).toContain('visit_time');
    expect(cols).toContain('expires_utc');
    expect(cols).toContain('creation_utc');
  });

  it('maps every column to a format that exists', () => {
    const ids = new Set(FORMATS.map((f) => f.id));
    for (const c of KNOWN_COLUMNS) expect(ids.has(c.format)).toBe(true);
  });
});
