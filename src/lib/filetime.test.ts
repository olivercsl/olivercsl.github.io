import { describe, it, expect } from 'vitest';
import {
  parseLdap,
  msToFiletime,
  msToGeneralized,
  isoWithTicks,
  formatDurationMs,
  INT64_MAX,
  AD_ATTRIBUTES,
} from './filetime';

describe('FILETIME parsing', () => {
  it('converts a real Active Directory value', () => {
    // Computed from the epoch offset rather than copied from anywhere: the
    // first example I found online claimed this was 1 January 2025, and it is
    // not, it is 4 March.
    const p = parseLdap('133855488000000000')!;
    expect(p.kind).toBe('timestamp');
    expect(new Date(p.ms!).toISOString()).toBe('2025-03-04T08:00:00.000Z');
  });

  it('round-trips an instant', () => {
    const ms = Date.UTC(2026, 7, 26, 4, 5, 9);
    expect(parseLdap(msToFiletime(ms))!.ms).toBe(ms);
  });

  it('places the 1601 epoch at zero plus the offset', () => {
    expect(msToFiletime(Date.UTC(1601, 0, 1))).toBe('0');
    expect(msToFiletime(Date.UTC(1970, 0, 1))).toBe('116444736000000000');
  });

  it('keeps precision past 2^53', () => {
    // 133801632000000000 is larger than Number.MAX_SAFE_INTEGER, so anything
    // going through a float would come back wrong in the last few digits.
    const raw = '133801632000000001';
    const p = parseLdap(raw)!;
    expect(p.remainder100ns).toBe(1);
    expect(new Date(p.ms!).toISOString()).toBe('2025-01-01T00:00:00.000Z');
    // The float round-trip loses the trailing 1; BigInt keeps it, which is
    // what remainder100ns above is proving.
    expect(String(Number(raw))).not.toBe(raw);
  });

  it('reads the sub-millisecond remainder', () => {
    const p = parseLdap('133801632000009999')!;
    expect(p.remainder100ns).toBe(9999);
  });
});

describe('sentinel values', () => {
  it('treats zero as a sentinel rather than the year 1601', () => {
    expect(parseLdap('0')!.kind).toBe('zero');
  });

  it('treats Int64 max as never', () => {
    expect(parseLdap(INT64_MAX.toString())!.kind).toBe('never');
  });

  it('reads a negative value as a duration', () => {
    // maxPwdAge for the default 42 day policy
    const p = parseLdap('-36288000000000')!;
    expect(p.kind).toBe('duration');
    expect(formatDurationMs(p.durationMs!)).toBe('42 days');
  });

  it('reads the default 30 minute lockout duration', () => {
    const p = parseLdap('-18000000000')!;
    expect(formatDurationMs(p.durationMs!)).toBe('30 minutes');
  });

  it('documents what zero means for each attribute', () => {
    for (const a of AD_ATTRIBUTES) expect(a.zero.length).toBeGreaterThan(0);
    expect(AD_ATTRIBUTES.find((a) => a.name === 'accountExpires')!.zero).toMatch(/never/i);
    expect(AD_ATTRIBUTES.find((a) => a.name === 'pwdLastSet')!.zero).toMatch(/next logon/i);
  });
});

describe('Generalized Time', () => {
  it('parses the whenCreated form', () => {
    const p = parseLdap('20260826040509.0Z')!;
    expect(p.kind).toBe('generalized');
    expect(new Date(p.ms!).toISOString()).toBe('2026-08-26T04:05:09.000Z');
  });

  it('parses it without the fractional part', () => {
    expect(parseLdap('20260826040509Z')!.kind).toBe('generalized');
  });

  it('round-trips', () => {
    const ms = Date.UTC(2026, 7, 26, 4, 5, 9);
    expect(parseLdap(msToGeneralized(ms))!.ms).toBe(ms);
  });
});

describe('formatting', () => {
  it('prints seven fractional digits, as .NET does', () => {
    expect(isoWithTicks(Date.UTC(2026, 7, 26, 4, 5, 9), 1234)).toBe('2026-08-26T04:05:09.0001234Z');
  });

  it('pads the tick remainder', () => {
    expect(isoWithTicks(Date.UTC(2026, 7, 26), 7)).toBe('2026-08-26T00:00:00.0000007Z');
  });

  it('prefers whole units in durations', () => {
    expect(formatDurationMs(86_400_000)).toBe('1 day');
    expect(formatDurationMs(3_600_000)).toBe('1 hour');
    // 90 seconds reads better than 1.5 minutes for a lockout duration
    expect(formatDurationMs(90_000)).toBe('90 seconds');
    expect(formatDurationMs(5_400_000)).toBe('90 minutes');
  });
});

describe('rejections', () => {
  it('rejects text and malformed input', () => {
    expect(parseLdap('')).toBeNull();
    expect(parseLdap('not a timestamp')).toBeNull();
    expect(parseLdap('2026-08-26')).toBeNull();
  });

  it('rejects values outside the range a date can hold', () => {
    expect(parseLdap('99999999999999999999')).toBeNull();
  });

  it('still converts Int64 max minus one, which is a date rather than a sentinel', () => {
    const p = parseLdap('9223372036854775806')!;
    expect(p.kind).toBe('timestamp');
    expect(new Date(p.ms!).getUTCFullYear()).toBe(30828);
  });

  it('tolerates separators pasted from a console', () => {
    expect(parseLdap(' 133 801 632 000 000 000 ')!.kind).toBe('timestamp');
    expect(parseLdap('133,801,632,000,000,000')!.kind).toBe('timestamp');
  });
});
