import { describe, it, expect } from 'vitest';
import {
  parseDuration,
  hasCalendarComponents,
  toSecondsNominal,
  toSecondsFrom,
  applyTo,
  formatHuman,
  formatClock,
  secondsToDuration,
  toIso,
} from './isoduration';

describe('parsing', () => {
  it('parses the common time-only form', () => {
    expect(parseDuration('PT1H30M')).toMatchObject({ hours: 1, minutes: 30, seconds: 0 });
  });

  it('parses a full date and time duration', () => {
    expect(parseDuration('P1Y2M3DT4H5M6S')).toMatchObject({
      years: 1,
      months: 2,
      days: 3,
      hours: 4,
      minutes: 5,
      seconds: 6,
    });
  });

  it('tells the two Ms apart by position', () => {
    // Before T it is months, after T it is minutes
    expect(parseDuration('P1M')).toMatchObject({ months: 1, minutes: 0 });
    expect(parseDuration('PT1M')).toMatchObject({ months: 0, minutes: 1 });
  });

  it('parses weeks', () => {
    expect(parseDuration('P2W')).toMatchObject({ weeks: 2 });
  });

  it('accepts fractional components', () => {
    expect(parseDuration('PT0.5H')).toMatchObject({ hours: 0.5 });
    expect(parseDuration('PT1.5S')).toMatchObject({ seconds: 1.5 });
  });

  it('accepts a negative duration', () => {
    expect(parseDuration('-PT1H')).toMatchObject({ negative: true, hours: 1 });
  });

  it('is case insensitive and ignores spaces', () => {
    expect(parseDuration(' pt1h30m ')).toMatchObject({ hours: 1, minutes: 30 });
  });

  it('rejects what is not a duration', () => {
    expect(parseDuration('')).toBeNull();
    expect(parseDuration('P')).toBeNull();
    expect(parseDuration('PT')).toBeNull();
    expect(parseDuration('1H30M')).toBeNull(); // missing the P
    expect(parseDuration('2026-01-01')).toBeNull();
    expect(parseDuration('P1H')).toBeNull(); // hours must follow T
  });

  it('accepts an explicit zero', () => {
    expect(parseDuration('PT0S')).toMatchObject({ seconds: 0 });
  });
});

describe('totals', () => {
  it('is exact when nothing calendar-shaped is present', () => {
    const d = parseDuration('PT1H30M')!;
    expect(hasCalendarComponents(d)).toBe(false);
    expect(toSecondsNominal(d)).toBe(5400);
  });

  it('counts weeks and days at fixed lengths', () => {
    expect(toSecondsNominal(parseDuration('P1W')!)).toBe(604_800);
    expect(toSecondsNominal(parseDuration('P1D')!)).toBe(86_400);
  });

  it('flags years and months as having no fixed length', () => {
    expect(hasCalendarComponents(parseDuration('P1M')!)).toBe(true);
    expect(hasCalendarComponents(parseDuration('P1Y')!)).toBe(true);
    expect(hasCalendarComponents(parseDuration('P30D')!)).toBe(false);
  });

  it('measures a month exactly when given the date it starts from', () => {
    const d = parseDuration('P1M')!;
    // January is 31 days, February 2026 is 28
    expect(toSecondsFrom(d, new Date('2026-01-01T00:00:00Z'))).toBe(31 * 86_400);
    expect(toSecondsFrom(d, new Date('2026-02-01T00:00:00Z'))).toBe(28 * 86_400);
  });

  it('handles a leap February', () => {
    expect(toSecondsFrom(parseDuration('P1M')!, new Date('2028-02-01T00:00:00Z'))).toBe(
      29 * 86_400,
    );
  });

  it('measures a year across a leap year', () => {
    // 2028 is the leap year, so the span starting in 2028 is the long one
    expect(toSecondsFrom(parseDuration('P1Y')!, new Date('2028-01-01T00:00:00Z'))).toBe(
      366 * 86_400,
    );
    expect(toSecondsFrom(parseDuration('P1Y')!, new Date('2027-01-01T00:00:00Z'))).toBe(
      365 * 86_400,
    );
  });

  it('uses the mean Gregorian year when no anchor is given', () => {
    // 365.2425 days, so a year is not 365 days exactly
    expect(toSecondsNominal(parseDuration('P1Y')!)).toBeCloseTo(365.2425 * 86_400, 3);
  });

  it('negates the whole duration', () => {
    expect(toSecondsNominal(parseDuration('-PT1H')!)).toBe(-3600);
  });

  it('applies a duration to a date', () => {
    expect(
      applyTo(parseDuration('P1M')!, new Date('2026-03-15T00:00:00Z')).toISOString().slice(0, 10),
    ).toBe('2026-04-15');
  });

  it('clamps rather than overflowing when the target month is shorter', () => {
    // One month after 31 January is 28 February, not 3 March
    expect(
      applyTo(parseDuration('P1M')!, new Date('2026-01-31T00:00:00Z')).toISOString().slice(0, 10),
    ).toBe('2026-02-28');
    // And 29 February in a leap year
    expect(
      applyTo(parseDuration('P1M')!, new Date('2028-01-31T00:00:00Z')).toISOString().slice(0, 10),
    ).toBe('2028-02-29');
  });
});

describe('formatting', () => {
  it('reads a duration in words', () => {
    expect(formatHuman(parseDuration('PT1H30M')!)).toBe('1 hour, 30 minutes');
    expect(formatHuman(parseDuration('P1DT2H')!)).toBe('1 day, 2 hours');
    expect(formatHuman(parseDuration('PT0S')!)).toBe('zero');
    expect(formatHuman(parseDuration('-PT1H')!)).toBe('minus 1 hour');
  });

  it('formats a clock reading', () => {
    expect(formatClock(5400)).toBe('1:30:00');
    expect(formatClock(253)).toBe('4:13');
    expect(formatClock(0)).toBe('0:00');
  });

  it('converts seconds back to a duration', () => {
    expect(secondsToDuration(5400)).toBe('PT1H30M');
    expect(secondsToDuration(253)).toBe('PT4M13S');
    expect(secondsToDuration(0)).toBe('PT0S');
    expect(secondsToDuration(90_061)).toBe('P1DT1H1M1S');
    expect(secondsToDuration(-3600)).toBe('-PT1H');
  });

  it('stops at days rather than inventing months', () => {
    // 90 days is not "P3M": the input never said which months
    expect(secondsToDuration(90 * 86_400)).toBe('P90D');
  });

  it('round-trips through canonical ISO form', () => {
    for (const s of ['PT1H30M', 'P1Y2M3DT4H5M6S', 'P2W', 'PT0S', '-PT1H']) {
      expect(toIso(parseDuration(s)!)).toBe(s);
    }
  });
});
