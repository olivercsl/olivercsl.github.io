/**
 * The timestamp formats browsers and Apple frameworks write to disk.
 *
 * Four epochs, none of them 1970, which is why a value pulled out of a Chrome
 * History database looks like nonsense in an ordinary converter:
 *
 *   Chrome / WebKit   microseconds since 1601-01-01   17 digits
 *   Cocoa / NSDate    seconds since 2001-01-01        10 digits, often a float
 *   Mac HFS+          seconds since 1904-01-01        10 digits
 *   Unix              seconds, ms or µs since 1970    10, 13 or 16 digits
 *
 * Cocoa and HFS+ values collide in length with Unix seconds, and the three
 * decode to dates decades apart, so guessing by magnitude alone is not safe.
 * detectFormat() returns every plausible reading instead of picking one, and
 * the caller shows them all: for a forensic timeline, an unlabelled guess is
 * worse than three labelled candidates.
 */

export type BrowserTimeFormat = 'webkit' | 'cocoa' | 'hfs' | 'unix_s' | 'unix_ms' | 'unix_us';

/** Seconds between each epoch and the Unix epoch. Verified, not copied. */
export const EPOCH_OFFSET_S: Record<Exclude<BrowserTimeFormat, 'unix_ms' | 'unix_us'>, number> = {
  webkit: 11_644_473_600, // 1601-01-01
  hfs: 2_082_844_800, // 1904-01-01
  cocoa: -978_307_200, // 2001-01-01, after the Unix epoch, hence negative
  unix_s: 0,
};

export const FORMATS: {
  id: BrowserTimeFormat;
  name: string;
  unit: string;
  epoch: string;
  where: string;
}[] = [
  {
    id: 'webkit',
    name: 'Chrome / WebKit',
    unit: 'microseconds',
    epoch: '1601-01-01',
    where: 'Chrome, Edge and Chromium History, Cookies and Login Data',
  },
  {
    id: 'cocoa',
    name: 'Cocoa / Core Data / NSDate',
    unit: 'seconds',
    epoch: '2001-01-01',
    where: 'Safari, macOS and iOS apps, Core Data stores, plists',
  },
  {
    id: 'hfs',
    name: 'Mac HFS+',
    unit: 'seconds',
    epoch: '1904-01-01',
    where: 'HFS+ file creation and modification times',
  },
  {
    id: 'unix_s',
    name: 'Unix seconds',
    unit: 'seconds',
    epoch: '1970-01-01',
    where: 'Most server logs, databases and APIs',
  },
  {
    id: 'unix_ms',
    name: 'Unix milliseconds',
    unit: 'milliseconds',
    epoch: '1970-01-01',
    where: 'JavaScript, Java, and most JSON APIs',
  },
  {
    id: 'unix_us',
    name: 'Unix microseconds',
    unit: 'microseconds',
    epoch: '1970-01-01',
    where: 'Firefox places.sqlite (PRTime)',
  },
];

/**
 * The SQLite columns people actually arrive holding. Naming them is most of
 * the value: someone looking at a History table does not know their column is
 * called a WebKit timestamp.
 */
export const KNOWN_COLUMNS: { db: string; table: string; column: string; format: BrowserTimeFormat }[] = [
  { db: 'Chrome History', table: 'urls', column: 'last_visit_time', format: 'webkit' },
  { db: 'Chrome History', table: 'visits', column: 'visit_time', format: 'webkit' },
  { db: 'Chrome History', table: 'downloads', column: 'start_time', format: 'webkit' },
  { db: 'Chrome Cookies', table: 'cookies', column: 'creation_utc', format: 'webkit' },
  { db: 'Chrome Cookies', table: 'cookies', column: 'expires_utc', format: 'webkit' },
  { db: 'Chrome Cookies', table: 'cookies', column: 'last_access_utc', format: 'webkit' },
  { db: 'Chrome Login Data', table: 'logins', column: 'date_created', format: 'webkit' },
  { db: 'Safari History', table: 'history_visits', column: 'visit_time', format: 'cocoa' },
  // PRTime: microseconds since 1970, not seconds. 16 digits today.
  { db: 'Firefox places', table: 'moz_places', column: 'last_visit_date', format: 'unix_us' },
  { db: 'Firefox places', table: 'moz_historyvisits', column: 'visit_date', format: 'unix_us' },
];

export interface Reading {
  format: BrowserTimeFormat;
  name: string;
  /** Unix milliseconds. */
  ms: number;
  /** True when the result lands somewhere a browser artefact plausibly could. */
  plausible: boolean;
}

/** Lower and upper bounds for "a date a browser could have written". */
const PLAUSIBLE_FROM = Date.UTC(1995, 0, 1);
const PLAUSIBLE_TO = Date.UTC(2100, 0, 1);

/** Convert a raw value read as a given format to Unix milliseconds. */
export function toUnixMs(value: number, format: BrowserTimeFormat): number {
  switch (format) {
    case 'webkit':
      // Microseconds since 1601. Divide before subtracting so the intermediate
      // stays inside the safe integer range.
      return value / 1000 - EPOCH_OFFSET_S.webkit * 1000;
    case 'cocoa':
      return (value - EPOCH_OFFSET_S.cocoa) * 1000;
    case 'hfs':
      return (value - EPOCH_OFFSET_S.hfs) * 1000;
    case 'unix_s':
      return value * 1000;
    case 'unix_ms':
      return value;
    case 'unix_us':
      return value / 1000;
  }
}

/** The inverse, for going from a date back to a stored value. */
export function fromUnixMs(ms: number, format: BrowserTimeFormat): string {
  switch (format) {
    case 'webkit':
      // 17 digits, so keep it exact with BigInt rather than a float.
      return ((BigInt(Math.round(ms)) + BigInt(EPOCH_OFFSET_S.webkit) * 1000n) * 1000n).toString();
    case 'cocoa':
      return String(Math.round(ms / 1000) + EPOCH_OFFSET_S.cocoa);
    case 'hfs':
      return String(Math.round(ms / 1000) + EPOCH_OFFSET_S.hfs);
    case 'unix_s':
      return String(Math.floor(ms / 1000));
    case 'unix_ms':
      return String(Math.round(ms));
    case 'unix_us':
      return (BigInt(Math.round(ms)) * 1000n).toString();
  }
}

/**
 * The same conversion for a whole column rather than one value, which is what
 * people holding a History database actually need. Page one for these searches
 * is Stack Overflow threads asking exactly this for Excel and Python.
 *
 * Excel has no date before 1900, so every Excel formula is the linear map
 * serial = value / divisor + offset, where offset is the serial number of the
 * format's epoch (negative for 1601). Results are UTC.
 */
export interface BulkRecipe {
  format: BrowserTimeFormat;
  /** SQLite expression; COL stands for the column name. */
  sqlite: string;
  excelDivisor: number;
  excelOffset: number;
  /** Python expression; v stands for the value. */
  python: string;
}

export const BULK: BulkRecipe[] = [
  {
    format: 'webkit',
    sqlite: "datetime(COL / 1000000 - 11644473600, 'unixepoch')",
    excelDivisor: 86_400_000_000,
    excelOffset: -109_205,
    python: 'datetime(1601, 1, 1, tzinfo=timezone.utc) + timedelta(microseconds=v)',
  },
  {
    format: 'cocoa',
    sqlite: "datetime(COL + 978307200, 'unixepoch')",
    excelDivisor: 86_400,
    excelOffset: 36_892,
    python: 'datetime(2001, 1, 1, tzinfo=timezone.utc) + timedelta(seconds=v)',
  },
  {
    format: 'hfs',
    sqlite: "datetime(COL - 2082844800, 'unixepoch')",
    excelDivisor: 86_400,
    excelOffset: 1_462,
    python: 'datetime(1904, 1, 1, tzinfo=timezone.utc) + timedelta(seconds=v)',
  },
  {
    format: 'unix_us',
    sqlite: "datetime(COL / 1000000, 'unixepoch')",
    excelDivisor: 86_400_000_000,
    excelOffset: 25_569,
    python: 'datetime.fromtimestamp(v / 1_000_000, tz=timezone.utc)',
  },
  {
    format: 'unix_ms',
    sqlite: "datetime(COL / 1000, 'unixepoch')",
    excelDivisor: 86_400_000,
    excelOffset: 25_569,
    python: 'datetime.fromtimestamp(v / 1000, tz=timezone.utc)',
  },
  {
    format: 'unix_s',
    sqlite: "datetime(COL, 'unixepoch')",
    excelDivisor: 86_400,
    excelOffset: 25_569,
    python: 'datetime.fromtimestamp(v, tz=timezone.utc)',
  },
];

export function excelFormula(r: BulkRecipe, cell = 'A2'): string {
  const sign = r.excelOffset < 0 ? '-' : '+';
  return `=${cell}/${r.excelDivisor}${sign}${Math.abs(r.excelOffset)}`;
}

/**
 * Every reading of a raw value, most plausible first. Deliberately not a guess:
 * a 10-digit number is a valid Cocoa, HFS+ and Unix timestamp at once, decoding
 * to three dates decades apart, and only the analyst knows which database it
 * came out of.
 */
export function decodeAll(input: string): Reading[] {
  const raw = input.trim().replace(/[\s,_]/g, '');
  if (!raw || !/^-?\d+(\.\d+)?$/.test(raw)) return [];
  const value = Number(raw);
  if (!Number.isFinite(value)) return [];

  const out: Reading[] = [];
  for (const f of FORMATS) {
    const ms = toUnixMs(value, f.id);
    if (!Number.isFinite(ms) || Math.abs(ms) > 8.64e15) continue;
    out.push({
      format: f.id,
      name: f.name,
      ms,
      plausible: ms >= PLAUSIBLE_FROM && ms <= PLAUSIBLE_TO,
    });
  }
  // Plausible readings first, then by date, so the likely answer leads.
  return out.sort((a, b) => Number(b.plausible) - Number(a.plausible) || a.ms - b.ms);
}

/**
 * A zero in a Chrome column is not 1601. It means the row has no value: a
 * session cookie that never expires on disk, or a URL with no recorded visit.
 */
export function isSentinel(input: string): boolean {
  return /^[\s,_]*0+(\.0+)?[\s,_]*$/.test(input);
}
