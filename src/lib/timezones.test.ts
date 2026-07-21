import { describe, it, expect } from 'vitest';
import {
  wallTimeIn,
  offsetMinutes,
  wallTimeToInstant,
  zoneAbbreviation,
  formatOffset,
  describeDifference,
  rateHour,
  searchCities,
  flagEmoji,
  countryName,
  cityForZone,
  CITIES,
} from './timezones';

// A fixed instant: 2026-07-21T12:00:00Z (southern winter, northern summer).
const JULY = new Date('2026-07-21T12:00:00Z');
// And one in January, so we catch zones whose offset flips.
const JANUARY = new Date('2026-01-21T12:00:00Z');

describe('wallTimeIn', () => {
  it('reads the wall clock in a zone', () => {
    expect(wallTimeIn(JULY, 'UTC')).toMatchObject({ year: 2026, month: 7, day: 21, hour: 12 });
    // Sydney is UTC+10 in July (no DST in winter)
    expect(wallTimeIn(JULY, 'Australia/Sydney')).toMatchObject({ day: 21, hour: 22 });
    // New York is UTC-4 in July (EDT)
    expect(wallTimeIn(JULY, 'America/New_York')).toMatchObject({ day: 21, hour: 8 });
  });

  it('rolls the date across the dateline', () => {
    const lateUTC = new Date('2026-07-21T20:00:00Z');
    // 06:00 the following day in Sydney
    expect(wallTimeIn(lateUTC, 'Australia/Sydney')).toMatchObject({ day: 22, hour: 6 });
  });

  it('handles midnight without returning hour 24', () => {
    const midnightUTC = new Date('2026-07-21T00:00:00Z');
    expect(wallTimeIn(midnightUTC, 'UTC').hour).toBe(0);
  });
});

describe('offsetMinutes', () => {
  it('computes fixed offsets', () => {
    expect(offsetMinutes(JULY, 'UTC')).toBe(0);
    expect(offsetMinutes(JULY, 'Asia/Hong_Kong')).toBe(8 * 60);
    expect(offsetMinutes(JULY, 'Asia/Tokyo')).toBe(9 * 60);
  });

  it('handles half-hour and quarter-hour zones', () => {
    expect(offsetMinutes(JULY, 'Asia/Kolkata')).toBe(5 * 60 + 30);
    expect(offsetMinutes(JULY, 'Asia/Kathmandu')).toBe(5 * 60 + 45);
  });

  it('tracks DST across the year', () => {
    // New York: EDT (-4) in July, EST (-5) in January
    expect(offsetMinutes(JULY, 'America/New_York')).toBe(-4 * 60);
    expect(offsetMinutes(JANUARY, 'America/New_York')).toBe(-5 * 60);
    // Sydney: AEST (+10) in July, AEDT (+11) in January
    expect(offsetMinutes(JULY, 'Australia/Sydney')).toBe(10 * 60);
    expect(offsetMinutes(JANUARY, 'Australia/Sydney')).toBe(11 * 60);
  });
});

describe('wallTimeToInstant', () => {
  it('round-trips against wallTimeIn', () => {
    for (const zone of ['UTC', 'Australia/Sydney', 'America/New_York', 'Asia/Kolkata', 'Europe/London']) {
      const wall = wallTimeIn(JULY, zone);
      const instant = wallTimeToInstant(wall, zone);
      expect(wallTimeIn(instant, zone)).toMatchObject(wall);
    }
  });

  it('resolves a wall time to the correct UTC instant', () => {
    // 22:00 on 21 Jul in Sydney (UTC+10) is 12:00Z the same day
    const d = wallTimeToInstant({ year: 2026, month: 7, day: 21, hour: 22, minute: 0 }, 'Australia/Sydney');
    expect(d.toISOString()).toBe('2026-07-21T12:00:00.000Z');
  });

  it('is correct on both sides of a DST transition', () => {
    // US DST ends 2026-11-01. 12:00 local on Oct 31 is EDT (-4); on Nov 2 it is EST (-5).
    const before = wallTimeToInstant({ year: 2026, month: 10, day: 31, hour: 12, minute: 0 }, 'America/New_York');
    const after = wallTimeToInstant({ year: 2026, month: 11, day: 2, hour: 12, minute: 0 }, 'America/New_York');
    expect(before.toISOString()).toBe('2026-10-31T16:00:00.000Z');
    expect(after.toISOString()).toBe('2026-11-02T17:00:00.000Z');
  });

  it('still round-trips for a time just after a spring-forward gap', () => {
    // US DST starts 2026-03-08; 03:00 exists, 02:30 does not.
    const valid = wallTimeToInstant({ year: 2026, month: 3, day: 8, hour: 3, minute: 0 }, 'America/New_York');
    expect(wallTimeIn(valid, 'America/New_York')).toMatchObject({ hour: 3, minute: 0 });
  });

  it('maps a nonexistent gap time to a real instant', () => {
    // 02:30 on 2026-03-08 never occurs in New York. We must still return a
    // usable instant rather than NaN or a wildly wrong time.
    const gap = wallTimeToInstant({ year: 2026, month: 3, day: 8, hour: 2, minute: 30 }, 'America/New_York');
    expect(Number.isNaN(gap.getTime())).toBe(false);
    const back = wallTimeIn(gap, 'America/New_York');
    expect(back.day).toBe(8);
    expect(back.hour).toBe(3); // clocks jump to 03:xx
  });
});

describe('formatting', () => {
  it('formats offsets', () => {
    expect(formatOffset(0)).toBe('UTC');
    expect(formatOffset(600)).toBe('UTC +10');
    expect(formatOffset(-240)).toBe('UTC -4');
    expect(formatOffset(330)).toBe('UTC +5:30');
    expect(formatOffset(-270)).toBe('UTC -4:30');
  });

  it('describes differences relative to a reference', () => {
    expect(describeDifference(0)).toBe('same time');
    expect(describeDifference(-840)).toBe('14 hours behind');
    expect(describeDifference(120)).toBe('2 hours ahead');
    expect(describeDifference(-90)).toBe('1 hour 30 min behind');
  });

  it('uses the abbreviation ICU provides', () => {
    expect(zoneAbbreviation(JULY, 'America/New_York')).toBe('EDT');
    expect(zoneAbbreviation(JANUARY, 'America/New_York')).toBe('EST');
  });

  it('fills in abbreviations ICU renders as GMT+n', () => {
    // ICU short-forms these as "GMT+10"/"GMT+8"; the table supplies the real one.
    expect(zoneAbbreviation(JULY, 'Australia/Sydney')).toBe('AEST');
    expect(zoneAbbreviation(JANUARY, 'Australia/Sydney')).toBe('AEDT'); // DST-aware
    expect(zoneAbbreviation(JULY, 'Asia/Hong_Kong')).toBe('HKT');
    expect(zoneAbbreviation(JULY, 'Asia/Singapore')).toBe('SGT');
    expect(zoneAbbreviation(JULY, 'Asia/Bangkok')).toBe('ICT');
    expect(zoneAbbreviation(JULY, 'Asia/Kolkata')).toBe('IST');
    expect(zoneAbbreviation(JULY, 'Europe/London')).toBe('BST');
    expect(zoneAbbreviation(JANUARY, 'Europe/London')).toBe('GMT');
    expect(zoneAbbreviation(JULY, 'Europe/Paris')).toBe('CEST');
    expect(zoneAbbreviation(JANUARY, 'Europe/Paris')).toBe('CET');
  });

  it('falls back to a GMT offset rather than inventing an abbreviation', () => {
    // São Paulo must never render as "BST" — that reads as British Summer Time.
    const sp = zoneAbbreviation(JULY, 'America/Sao_Paulo');
    expect(sp).not.toBe('BST');
    expect(sp).toMatch(/^GMT/);
  });
});

describe('rateHour', () => {
  it('rates business hours as good', () => {
    for (const h of [9, 12, 17]) expect(rateHour(h)).toBe('good');
  });
  it('rates shoulder hours as ok', () => {
    for (const h of [7, 8, 18, 21]) expect(rateHour(h)).toBe('ok');
  });
  it('rates night hours as poor', () => {
    for (const h of [22, 23, 0, 3, 6]) expect(rateHour(h)).toBe('poor');
  });
});

describe('searchCities', () => {
  it('finds a city that is not an IANA zone name', () => {
    // The whole reason the curated list exists.
    const [top] = searchCities('boston');
    expect(top).toMatchObject({ city: 'Boston', zone: 'America/New_York' });
  });

  it('ranks exact and prefix matches first', () => {
    expect(searchCities('sydney')[0]!.zone).toBe('Australia/Sydney');
    expect(searchCities('hong')[0]!.zone).toBe('Asia/Hong_Kong');
  });

  it('is case and accent insensitive', () => {
    expect(searchCities('SAO PAULO')[0]!.zone).toBe('America/Sao_Paulo');
    expect(searchCities('sao paulo')[0]!.zone).toBe('America/Sao_Paulo');
  });

  it('matches by country name', () => {
    const zones = searchCities('japan').map((r) => r.zone);
    expect(zones).toContain('Asia/Tokyo');
  });

  it('returns nothing for an empty query', () => {
    expect(searchCities('')).toEqual([]);
    expect(searchCities('   ')).toEqual([]);
  });

  it('respects the limit', () => {
    expect(searchCities('a', 5).length).toBeLessThanOrEqual(5);
  });

  it('falls back to raw IANA zones for places not in the curated list', () => {
    const zones = searchCities('reunion').map((r) => r.zone);
    expect(zones.some((z) => /Reunion/i.test(z))).toBe(true);
  });
});

describe('city data', () => {
  it('has no duplicate city+zone pairs', () => {
    const seen = new Set(CITIES.map((c) => `${c.c}|${c.z}`));
    expect(seen.size).toBe(CITIES.length);
  });

  it('references only zones the runtime accepts', () => {
    for (const city of CITIES) {
      expect(() => new Intl.DateTimeFormat('en-US', { timeZone: city.z }), city.z).not.toThrow();
    }
  });

  it('derives flags and country names', () => {
    expect(flagEmoji('AU')).toBe('🇦🇺');
    expect(flagEmoji('US')).toBe('🇺🇸');
    expect(flagEmoji('')).toBe('🌐');
    expect(countryName('AU')).toBe('Australia');
    expect(countryName('')).toBe('');
  });

  it('labels a zone with its city', () => {
    expect(cityForZone('Australia/Sydney').city).toBe('Sydney');
    expect(cityForZone('Antarctica/Troll').city).toBe('Troll');
  });
});
