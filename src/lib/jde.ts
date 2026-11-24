/**
 * JD Edwards Julian dates: 126001 for 1 January 2026, 98185 for 4 July 1998.
 *
 * JD Edwards stores dates as a number in CYYDDD form. Oracle: "The Julian
 * (*JUL) date format is CYYDDD, where: C is added to 19 to create the century,
 * i.e. 0 + 19 = 19, 1 + 19 = 20. YY is the year within the century, DDD is the
 * day in the year." The same page gives 098185 for July 4, 1998 and 117001 for
 * Jan. 1, 2017.
 * https://docs.oracle.com/cd/E26228_01/doc.93/e21961/julian_date_conv.htm
 *
 * So the year is 1900 + floor(value / 1000) and the day of the year is
 * value mod 1000. Held as a number, a 1900s date loses its leading zero:
 * Oracle's 098185 is stored and shown as 98185.
 *
 * Two other things get called Julian dates and are easy to paste in by
 * mistake: a seven-digit year and day such as 2026001 (what Oracle's 'YYYYDDD'
 * format and Db2's DATE() read), and the astronomical Julian Day Number, a
 * running count of days that is about 2.46 million in the 2020s. Neither is
 * CYYDDD, so both are recognised and named rather than misread.
 *
 * EnterpriseOne uses the same format: "The Julian date format is cyyddd (where
 * c = century) ... the date June 1, 1999 corresponds to the Julian date 099152,
 * and the date June 1, 2000 corresponds to the Julian date 100153."
 * https://docs.oracle.com/en/applications/jd-edwards/financials/9.2/eoaap/required-fields.html
 *
 * Two values are not dates at all. Oracle's JDBC driver for JD Edwards World
 * reads 0 as NULL and 999999 as 31 December 9999 ("when SHUPMJ=0 then NULL when
 * SHUPMJ=999999 then date('9999365')"), and the converter does the same.
 * https://docs.oracle.com/cd/E59116_01/doc.94/e58808/ch_driver_data_feat.htm
 */

export interface CalendarDate {
  year: number;
  /** 1 to 12 */
  month: number;
  /** 1 to 31 */
  day: number;
}

export interface JdeDate extends CalendarDate {
  /** The JD Edwards number, 126001. */
  value: number;
  /** 1 to 366 */
  dayOfYear: number;
  /** 365 or 366 */
  daysInYear: number;
  /** "2026-01-01" */
  iso: string;
  /** Six digits with the leading zero Oracle's charts show: "098185". */
  padded: string;
}

/** Earliest and latest years CYYDDD can hold: C runs from 0 (1900s) to 9 (2800s). */
export const FIRST_YEAR = 1900;
export const LAST_YEAR = 2899;

export const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

export const daysInYear = (y: number) => (isLeapYear(y) ? 366 : 365);

const pad = (n: number, width: number) => String(n).padStart(width, '0');

const utc = (d: CalendarDate) => Date.UTC(d.year, d.month - 1, d.day);

export const isoDate = (d: CalendarDate) => `${pad(d.year, 4)}-${pad(d.month, 2)}-${pad(d.day, 2)}`;

/** A year and a day of that year as a calendar date, or null if the day doesn't exist. */
export function fromYearDay(year: number, dayOfYear: number): CalendarDate | null {
  if (!Number.isInteger(year) || !Number.isInteger(dayOfYear)) return null;
  if (dayOfYear < 1 || dayOfYear > daysInYear(year)) return null;
  const d = new Date(Date.UTC(year, 0, dayOfYear));
  // Date.UTC treats years 0 to 99 as 1900 to 1999; every year here is 1000 or later.
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** Day of the year, 1 to 366, for a valid calendar date. */
export function dayOfYear(d: CalendarDate): number {
  return Math.round((utc(d) - Date.UTC(d.year, 0, 1)) / 86_400_000) + 1;
}

export function isValidDate(d: CalendarDate): boolean {
  if (![d.year, d.month, d.day].every(Number.isInteger)) return false;
  if (d.year < 1000 || d.year > 9999 || d.month < 1 || d.month > 12 || d.day < 1) return false;
  const back = new Date(utc(d));
  return back.getUTCMonth() + 1 === d.month && back.getUTCDate() === d.day;
}

/** CYYDDD to a calendar date, or null if it isn't a real JD Edwards date. */
export function jdeToDate(value: number): JdeDate | null {
  if (!Number.isInteger(value) || value < 1 || value > 999_999) return null;
  const year = FIRST_YEAR + Math.floor(value / 1000);
  const doy = value % 1000;
  const date = fromYearDay(year, doy);
  if (!date) return null;
  return { ...date, value, dayOfYear: doy, daysInYear: daysInYear(year), iso: isoDate(date), padded: pad(value, 6) };
}

/** A calendar date to CYYDDD, or null outside 1900 to 2899 or for a date that doesn't exist. */
export function dateToJde(d: CalendarDate): number | null {
  if (!isValidDate(d) || d.year < FIRST_YEAR || d.year > LAST_YEAR) return null;
  return (d.year - FIRST_YEAR) * 1000 + dayOfYear(d);
}

/** "2026-01-01", "2026/01/01" or "20260101" as a calendar date. */
export function parseDateText(text: string): CalendarDate | null {
  const m = /^(\d{4})[-/]?(\d{2})[-/]?(\d{2})$/.exec(text.trim());
  if (!m) return null;
  const d = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  return isValidDate(d) ? d : null;
}

/** Not a date: Oracle's World JDBC driver reads it as 9999-12-31. */
export const MAX_DATE_VALUE = 999_999;
export const MAX_DATE_ISO = '9999-12-31';

/** Astronomical Julian Day Numbers in this range cover 1858 to 2132. */
const JDN_MIN = 2_400_000;
const JDN_MAX = 2_500_000;

export type Reading =
  | { kind: 'empty' }
  /** A CYYDDD value. `asYyddd` is set for five-digit values that a YYDDD system would put in the 2000s. */
  | { kind: 'jde'; date: JdeDate; asYyddd: JdeDate | null }
  /** A calendar date typed in, with its CYYDDD value (null outside 1900 to 2899). */
  | { kind: 'date'; date: CalendarDate; jde: number | null }
  /** Seven digits read as year and day, YYYYDDD. */
  | { kind: 'year-day'; date: CalendarDate; jde: number | null }
  | { kind: 'julian-day-number'; value: number }
  /** 0: no date, which Oracle's World JDBC driver returns as NULL. */
  | { kind: 'no-date' }
  /** 999999: read as 31 December 9999 by Oracle's World JDBC driver. */
  | { kind: 'max-date' }
  /** CYYDDD-shaped, but that day doesn't exist in that year. */
  | { kind: 'bad-day'; year: number; dayOfYear: number }
  | { kind: 'unreadable' };

/**
 * Reads whatever was pasted: a JD Edwards number, a calendar date, or one of
 * the look-alikes. `currentYear` decides whether a five-digit value is also
 * worth showing as a YYDDD date in the 2000s (only for years up to now).
 */
export function read(input: string, currentYear: number): Reading {
  const text = input.trim().replace(/[\s,]/g, '');
  if (text === '') return { kind: 'empty' };

  if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(text) || /^\d{8}$/.test(text)) {
    const date = parseDateText(text);
    return date ? { kind: 'date', date, jde: dateToJde(date) } : { kind: 'unreadable' };
  }
  if (!/^\d{1,7}$/.test(text)) return { kind: 'unreadable' };

  const value = Number(text);
  if (text.length === 7) {
    if (value >= JDN_MIN && value < JDN_MAX) return { kind: 'julian-day-number', value };
    const date = fromYearDay(Math.floor(value / 1000), value % 1000);
    return date ? { kind: 'year-day', date, jde: dateToJde(date) } : { kind: 'unreadable' };
  }

  if (value === 0) return { kind: 'no-date' };
  if (value === MAX_DATE_VALUE) return { kind: 'max-date' };
  const date = jdeToDate(value);
  if (!date) return { kind: 'bad-day', year: FIRST_YEAR + Math.floor(value / 1000), dayOfYear: value % 1000 };

  let asYyddd: JdeDate | null = null;
  if (text.length === 5) {
    const year = 2000 + Math.floor(value / 1000);
    const alt = year <= currentYear ? fromYearDay(year, value % 1000) : null;
    if (alt) asYyddd = { ...alt, value, dayOfYear: value % 1000, daysInYear: daysInYear(year), iso: isoDate(alt), padded: pad(value, 6) };
  }
  return { kind: 'jde', date, asYyddd };
}

export type Direction = 'to-date' | 'to-jde';

/** The text a column cell gets when it can't be converted. */
export const INVALID = 'invalid';

/**
 * Converts one value per line, keeping blank lines blank so the output pastes
 * back into the same spreadsheet rows.
 */
export function convertColumn(text: string, direction: Direction): { output: string; converted: number; invalid: number } {
  let converted = 0;
  let invalid = 0;
  const lines = text.split(/\r?\n/);
  if (lines.length > 1 && lines[lines.length - 1].trim() === '') lines.pop();
  const out = lines.map((line) => {
    const cell = line.trim();
    if (cell === '') return '';
    let result: string | null = null;
    if (direction === 'to-date') {
      const n = /^\d{1,6}$/.test(cell) ? Number(cell) : NaN;
      // 0 is "no date" (NULL to Oracle's driver), so its row stays blank.
      if (n === 0) return '';
      const v = n === MAX_DATE_VALUE ? null : jdeToDate(n);
      result = n === MAX_DATE_VALUE ? MAX_DATE_ISO : v ? v.iso : null;
    } else {
      const d = parseDateText(cell);
      const v = d ? dateToJde(d) : null;
      result = v === null ? null : String(v);
    }
    if (result === null) {
      invalid++;
      return INVALID;
    }
    converted++;
    return result;
  });
  return { output: out.join('\n'), converted, invalid };
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "Thursday 1 January 2026" */
export function longDate(d: CalendarDate): string {
  return `${WEEKDAYS[new Date(utc(d)).getUTCDay()]} ${d.day} ${MONTHS[d.month - 1]} ${d.year}`;
}
