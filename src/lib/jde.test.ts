import { describe, it, expect } from 'vitest';
import {
  jdeToDate,
  dateToJde,
  read,
  convertColumn,
  parseDateText,
  longDate,
  isLeapYear,
  INVALID,
} from './jde';

describe("Oracle's examples", () => {
  // https://docs.oracle.com/cd/E26228_01/doc.93/e21961/julian_date_conv.htm
  it('reads 098185 as 4 July 1998', () => {
    expect(jdeToDate(98185)?.iso).toBe('1998-07-04');
    expect(jdeToDate(98185)?.padded).toBe('098185');
  });

  it('reads 117001 as 1 January 2017', () => {
    expect(jdeToDate(117001)?.iso).toBe('2017-01-01');
  });

  it('turns both dates back into the same numbers', () => {
    expect(dateToJde({ year: 1998, month: 7, day: 4 })).toBe(98185);
    expect(dateToJde({ year: 2017, month: 1, day: 1 })).toBe(117001);
  });
});

describe("Oracle's EnterpriseOne examples", () => {
  // https://docs.oracle.com/en/applications/jd-edwards/financials/9.2/eoaap/required-fields.html
  it('reads 099152 as 1 June 1999 and 100153 as 1 June 2000', () => {
    expect(jdeToDate(99152)?.iso).toBe('1999-06-01');
    expect(jdeToDate(100153)?.iso).toBe('2000-06-01');
  });
});

describe('values that are not dates', () => {
  // Oracle's World JDBC driver: 0 is NULL, 999999 is 9999-12-31.
  it('names 0 and 999999 instead of calling them bad days', () => {
    expect(read('0', 2026).kind).toBe('no-date');
    expect(read('000000', 2026).kind).toBe('no-date');
    expect(read('999999', 2026).kind).toBe('max-date');
  });

  it('leaves 0 blank and turns 999999 into 9999-12-31 in a column', () => {
    const r = convertColumn('126001\n0\n999999', 'to-date');
    expect(r.output).toBe('2026-01-01\n\n9999-12-31');
    expect(r).toMatchObject({ converted: 2, invalid: 0 });
  });
});

describe('CYYDDD arithmetic', () => {
  it('puts the century digit, year and day where Oracle says', () => {
    const d = jdeToDate(126328)!;
    expect(d).toMatchObject({ year: 2026, month: 11, day: 24, dayOfYear: 328, daysInYear: 365 });
    expect(longDate(d)).toBe('Tuesday 24 November 2026');
  });

  it('allows day 366 only in leap years', () => {
    expect(jdeToDate(124366)?.iso).toBe('2024-12-31');
    expect(jdeToDate(100366)?.iso).toBe('2000-12-31');
    expect(jdeToDate(125366)).toBeNull();
    // 1900 was not a leap year (divisible by 100, not by 400).
    expect(isLeapYear(1900)).toBe(false);
    expect(jdeToDate(366)).toBeNull();
  });

  it('rejects day 000 and values that are not CYYDDD', () => {
    expect(jdeToDate(126000)).toBeNull();
    expect(jdeToDate(0)).toBeNull();
    expect(jdeToDate(-1)).toBeNull();
    expect(jdeToDate(1_000_000)).toBeNull();
    expect(jdeToDate(126001.5)).toBeNull();
  });

  it('round-trips every day from 1900 to 2100', () => {
    for (let ms = Date.UTC(1900, 0, 1); ms <= Date.UTC(2100, 11, 31); ms += 86_400_000) {
      const t = new Date(ms);
      const date = { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
      const v = dateToJde(date)!;
      expect(jdeToDate(v)?.iso).toBe(t.toISOString().slice(0, 10));
    }
  });

  it('covers 1900 to 2899 and nothing outside', () => {
    expect(dateToJde({ year: 1900, month: 1, day: 1 })).toBe(1);
    expect(dateToJde({ year: 2899, month: 12, day: 31 })).toBe(999365);
    expect(dateToJde({ year: 1899, month: 12, day: 31 })).toBeNull();
    expect(dateToJde({ year: 2900, month: 1, day: 1 })).toBeNull();
    expect(dateToJde({ year: 2025, month: 2, day: 29 })).toBeNull();
  });
});

describe('reading pasted input', () => {
  it('reads a JD Edwards number', () => {
    const r = read('126001', 2026);
    expect(r.kind).toBe('jde');
    if (r.kind === 'jde') {
      expect(r.date.iso).toBe('2026-01-01');
      expect(r.asYyddd).toBeNull();
    }
  });

  it('offers the YYDDD reading for a five-digit value only when that year has happened', () => {
    const r = read('17001', 2026);
    if (r.kind !== 'jde') throw new Error(r.kind);
    expect(r.date.iso).toBe('1917-01-01');
    expect(r.asYyddd?.iso).toBe('2017-01-01');

    const later = read('98185', 2026);
    if (later.kind !== 'jde') throw new Error(later.kind);
    expect(later.date.iso).toBe('1998-07-04');
    expect(later.asYyddd).toBeNull();
  });

  it('treats a six-digit value with a leading zero as JD Edwards, with no second reading', () => {
    const r = read('098185', 2026);
    if (r.kind !== 'jde') throw new Error(r.kind);
    expect(r.asYyddd).toBeNull();
  });

  it('converts typed dates the other way', () => {
    expect(read('2026-11-24', 2026)).toMatchObject({ kind: 'date', jde: 126328 });
    expect(read('20260101', 2026)).toMatchObject({ kind: 'date', jde: 126001 });
    expect(read('1850-01-01', 2026)).toMatchObject({ kind: 'date', jde: null });
    expect(read('2025-02-29', 2026).kind).toBe('unreadable');
  });

  it('names the look-alikes instead of misreading them', () => {
    expect(read('2026001', 2026)).toMatchObject({ kind: 'year-day', jde: 126001 });
    expect(read('2461000', 2026)).toMatchObject({ kind: 'julian-day-number', value: 2461000 });
    expect(read('126400', 2026)).toMatchObject({ kind: 'bad-day', year: 2026, dayOfYear: 400 });
    expect(read('12 6001', 2026)).toMatchObject({ kind: 'jde' });
    expect(read('abc', 2026).kind).toBe('unreadable');
    expect(read('  ', 2026).kind).toBe('empty');
  });
});

describe('column conversion', () => {
  it('converts JD Edwards values line by line and keeps blanks', () => {
    const r = convertColumn('126001\n98185\n\n125366\n117001\n', 'to-date');
    expect(r.output).toBe(`2026-01-01\n1998-07-04\n\n${INVALID}\n2017-01-01`);
    expect(r).toMatchObject({ converted: 3, invalid: 1 });
  });

  it('converts dates to JD Edwards values', () => {
    const r = convertColumn('2026-01-01\r\n1998/07/04\r\n20170101\r\n31/12/2026', 'to-jde');
    expect(r.output).toBe(`126001\n98185\n117001\n${INVALID}`);
    expect(r).toMatchObject({ converted: 3, invalid: 1 });
  });

  it('parses only unambiguous date layouts', () => {
    expect(parseDateText('2026-01-31')).toEqual({ year: 2026, month: 1, day: 31 });
    expect(parseDateText('01/02/2026')).toBeNull();
  });
});
