import { describe, it, expect } from 'vitest';
import {
  serialToDate,
  dateToSerial,
  convertSystem,
  unixToSerial,
  serialToUnix,
  timeOfDay,
  formulas,
  UNIX_EPOCH_SERIAL,
  SYSTEM_OFFSET_DAYS,
} from './excelserial';

const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);

describe('1900 system', () => {
  it('puts serial 1 on 1 January 1900', () => {
    expect(day(serialToDate(1)!.ms)).toBe('1900-01-01');
  });

  it('puts 25569 on the Unix epoch', () => {
    expect(day(serialToDate(UNIX_EPOCH_SERIAL)!.ms)).toBe('1970-01-01');
  });

  it('reads the fraction as time of day', () => {
    expect(new Date(serialToDate(45321.75)!.ms).toISOString()).toBe('2024-01-30T18:00:00.000Z');
    expect(timeOfDay(45321.75)).toBe('18:00:00');
    expect(timeOfDay(45321.5)).toBe('12:00:00');
    expect(timeOfDay(45321)).toBe('00:00:00');
  });

  it('is unaffected by the leap bug from 1 March 1900', () => {
    const r = serialToDate(61)!;
    expect(day(r.ms)).toBe('1900-03-01');
    expect(r.beforeLeapBug).toBe(false);
    expect(r.sheetsMs).toBeNull();
  });
});

describe('the 1900 leap year bug', () => {
  it('flags serial 60 as the nonexistent 29 February', () => {
    const r = serialToDate(60)!;
    expect(r.phantomLeapDay).toBe(true);
    // No real date exists, so the nearest real one is given
    expect(day(r.ms)).toBe('1900-02-28');
  });

  it('keeps serial 59 as 28 February', () => {
    const r = serialToDate(59)!;
    expect(day(r.ms)).toBe('1900-02-28');
    expect(r.phantomLeapDay).toBe(false);
    expect(r.beforeLeapBug).toBe(true);
  });

  it('shows where Google Sheets disagrees, before March 1900', () => {
    // Sheets counts from 30 Dec 1899 with no phantom day, so it is a day behind
    expect(day(serialToDate(1)!.sheetsMs!)).toBe('1899-12-31');
    expect(day(serialToDate(59)!.sheetsMs!)).toBe('1900-02-27');
  });

  it('round-trips dates either side of the bug', () => {
    for (const d of [Date.UTC(1900, 0, 1), Date.UTC(1900, 1, 28), Date.UTC(1900, 2, 1), Date.UTC(2024, 0, 30, 18)]) {
      expect(serialToDate(dateToSerial(d))!.ms).toBe(d);
    }
  });

  it('computes the serials either side of the bug', () => {
    expect(dateToSerial(Date.UTC(1900, 0, 1))).toBe(1);
    expect(dateToSerial(Date.UTC(1900, 1, 28))).toBe(59);
    expect(dateToSerial(Date.UTC(1900, 2, 1))).toBe(61);
  });
});

describe('1904 system', () => {
  it('starts on 1 January 1904', () => {
    expect(day(serialToDate(0, '1904')!.ms)).toBe('1904-01-01');
  });

  it('is 1,462 days offset from 1900', () => {
    expect(dateToSerial(Date.UTC(1904, 0, 1), '1900')).toBe(SYSTEM_OFFSET_DAYS);
    const d = Date.UTC(2024, 0, 30);
    expect(dateToSerial(d, '1900') - dateToSerial(d, '1904')).toBe(1462);
  });

  it('converts a serial between systems without changing the date', () => {
    const serial1900 = 45321;
    const serial1904 = convertSystem(serial1900, '1900', '1904');
    expect(serial1904).toBe(43859);
    expect(serialToDate(serial1904, '1904')!.ms).toBe(serialToDate(serial1900, '1900')!.ms);
    expect(convertSystem(serial1904, '1904', '1900')).toBe(serial1900);
  });
});

describe('Unix conversion', () => {
  it('matches the standard formulas', () => {
    expect(unixToSerial(0)).toBe(25569);
    expect(serialToUnix(25569)).toBe(0);
    expect(unixToSerial(86_400)).toBe(25570);
  });

  it('round-trips', () => {
    expect(serialToUnix(unixToSerial(1_706_637_600))).toBeCloseTo(1_706_637_600, 3);
  });

  it('agrees with the date route', () => {
    const unix = 1_706_637_600; // 2024-01-30T18:00Z
    expect(unixToSerial(unix)).toBeCloseTo(dateToSerial(unix * 1000), 9);
  });
});

describe('rejections and formulas', () => {
  it('rejects negative and non-finite serials', () => {
    expect(serialToDate(-1)).toBeNull();
    expect(serialToDate(-1, '1904')).toBeNull();
    expect(serialToDate(Number.NaN)).toBeNull();
  });

  it('writes formulas against the given cell', () => {
    const f = formulas('B2');
    expect(f.find((x) => x.label === 'Unix seconds to Excel date')!.formula).toBe('=B2/86400+25569');
    expect(f.find((x) => x.label === 'Excel date to Unix seconds')!.formula).toBe('=(B2-25569)*86400');
  });
});
