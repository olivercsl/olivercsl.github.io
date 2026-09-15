/**
 * Excel serial dates: 45321 for a day in January 2024, 45321.75 for six in the
 * evening of it.
 *
 * A spreadsheet stores a date as a count of days, with the time of day as the
 * fraction. Simple, except for three traps that account for most of the wrong
 * answers people get:
 *
 * 1. Excel believes 1900 was a leap year. It was not. Lotus 1-2-3 shipped the
 *    bug and Excel copied it for compatibility, so serial 60 is 29 February
 *    1900, a day that never existed, and every serial from 1 to 59 sits one day
 *    earlier than naive arithmetic from the real epoch would put it.
 * 2. There are two date systems. Workbooks created in old Mac Excel count from
 *    1904, and the same number means a date four years and a day later.
 * 3. There is no timezone. 45321.75 is 18:00 on whatever clock typed it in.
 *
 * Google Sheets and LibreOffice count from 30 December 1899 with no fake leap
 * day, so they agree with Excel from 1 March 1900 onwards and disagree by a day
 * before it. Every modern date is unaffected, which is why the difference
 * surprises people when it does bite.
 */

export type DateSystem = '1900' | '1904';

const MS_PER_DAY = 86_400_000;

/** 1899-12-30, the day zero that makes serials of 61 and above line up. */
const EPOCH_1900 = Date.UTC(1899, 11, 30);
/** 1904-01-01, day zero of the Mac date system. */
const EPOCH_1904 = Date.UTC(1904, 0, 1);

/** Serial of 1970-01-01 in the 1900 system: the number every formula uses. */
export const UNIX_EPOCH_SERIAL = 25_569;

/** Days between the two systems. */
export const SYSTEM_OFFSET_DAYS = 1_462;

export interface SerialReading {
  /** Unix milliseconds, treating the serial as UTC. */
  ms: number;
  /** The serial falls on Excel's nonexistent 29 February 1900. */
  phantomLeapDay: boolean;
  /** Serial below 61 in the 1900 system, where Excel and Sheets disagree. */
  beforeLeapBug: boolean;
  /** Sheets or LibreOffice would show this date instead, when it differs. */
  sheetsMs: number | null;
}

/**
 * Serial to an instant. Returns null for negative serials in the 1900 system,
 * which Excel refuses to display as dates.
 */
export function serialToDate(serial: number, system: DateSystem = '1900'): SerialReading | null {
  if (!Number.isFinite(serial)) return null;

  if (system === '1904') {
    if (serial < 0) return null;
    return {
      ms: EPOCH_1904 + serial * MS_PER_DAY,
      phantomLeapDay: false,
      beforeLeapBug: false,
      sheetsMs: null,
    };
  }

  if (serial < 0) return null;

  const whole = Math.floor(serial);
  const sheetsMs = EPOCH_1900 + serial * MS_PER_DAY;

  if (whole >= 61) {
    return { ms: sheetsMs, phantomLeapDay: false, beforeLeapBug: false, sheetsMs: null };
  }

  // Below 61, Excel is one day behind the real calendar because it inserted a
  // day that did not exist. Serial 60 is that day; render it as 28 February
  // plus the fraction, flagged, since there is no true date to give.
  const excelMs = EPOCH_1900 + (serial + 1) * MS_PER_DAY;
  return {
    ms: whole === 60 ? EPOCH_1900 + (59 + 1 + (serial - whole)) * MS_PER_DAY : excelMs,
    phantomLeapDay: whole === 60,
    beforeLeapBug: true,
    sheetsMs,
  };
}

/** Instant to a serial in the chosen system. Fractional part carries the time. */
export function dateToSerial(ms: number, system: DateSystem = '1900'): number {
  if (system === '1904') return (ms - EPOCH_1904) / MS_PER_DAY;
  const days = (ms - EPOCH_1900) / MS_PER_DAY;
  // Dates before 1 March 1900 need the phantom leap day taken back out.
  return days < 61 ? days - 1 : days;
}

/** Convert a serial between the two systems. */
export function convertSystem(serial: number, from: DateSystem, to: DateSystem): number {
  if (from === to) return serial;
  return from === '1900' ? serial - SYSTEM_OFFSET_DAYS : serial + SYSTEM_OFFSET_DAYS;
}

/** Unix seconds to a 1900-system serial, the =A1/86400+25569 formula. */
export function unixToSerial(unixSeconds: number): number {
  return unixSeconds / 86_400 + UNIX_EPOCH_SERIAL;
}

/** 1900-system serial to Unix seconds, the =(A1-25569)*86400 formula. */
export function serialToUnix(serial: number): number {
  return (serial - UNIX_EPOCH_SERIAL) * 86_400;
}

/** "18:00:00" from the fractional part, rounded to the nearest second. */
export function timeOfDay(serial: number): string {
  const frac = serial - Math.floor(serial);
  const total = Math.round(frac * 86_400) % 86_400;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

/** Ready-to-paste formulas for whatever cell holds the value. */
export function formulas(cell = 'A1'): { label: string; formula: string }[] {
  return [
    { label: 'Unix seconds to Excel date', formula: `=${cell}/86400+25569` },
    { label: 'Unix milliseconds to Excel date', formula: `=${cell}/86400000+25569` },
    { label: 'Excel date to Unix seconds', formula: `=(${cell}-25569)*86400` },
    { label: '1904 system to 1900 system', formula: `=${cell}+1462` },
    { label: '1900 system to 1904 system', formula: `=${cell}-1462` },
  ];
}
