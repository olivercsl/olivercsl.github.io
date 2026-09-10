/**
 * ISO 8601 durations: PT1H30M, P3DT4H5M6S, P1Y2M10DT2H30M.
 *
 * The format APIs reach for when they need to express "how long" rather than
 * "when": schema.org, YouTube, Azure, Kubernetes manifests, XML schema.
 *
 * The awkward part, and the thing most converters quietly get wrong, is that
 * years and months have no fixed length. P1M is not 30 days; it is one calendar
 * month, which is 28, 29, 30 or 31 depending on where you start. So a total in
 * seconds is only exact when the duration contains no Y or M component, or when
 * you supply the date it is measured from. Both are offered here, and which one
 * you are looking at is stated rather than hidden.
 */

export interface Duration {
  negative: boolean;
  years: number;
  months: number;
  weeks: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/** Nominal lengths, used only when no anchor date is given. */
const NOMINAL_DAYS_PER_YEAR = 365.2425; // Gregorian mean
const NOMINAL_DAYS_PER_MONTH = NOMINAL_DAYS_PER_YEAR / 12;

const PATTERN =
  /^(-)?P(?!$)(?:(\d+(?:\.\d+)?)Y)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)W)?(?:(\d+(?:\.\d+)?)D)?(?:T(?!$)(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;

export function parseDuration(input: string): Duration | null {
  const raw = input.trim().toUpperCase().replace(/\s+/g, '');
  if (!raw) return null;

  const m = PATTERN.exec(raw);
  if (!m) return null;

  const n = (v: string | undefined) => (v === undefined ? 0 : Number(v));
  const d: Duration = {
    negative: m[1] === '-',
    years: n(m[2]),
    months: n(m[3]),
    weeks: n(m[4]),
    days: n(m[5]),
    hours: n(m[6]),
    minutes: n(m[7]),
    seconds: n(m[8]),
  };

  // "P" and "PT" alone match the shape but carry no value.
  const total =
    d.years + d.months + d.weeks + d.days + d.hours + d.minutes + d.seconds;
  if (total === 0 && !/\d/.test(raw)) return null;
  return d;
}

/** True when the duration contains a component with no fixed length. */
export function hasCalendarComponents(d: Duration): boolean {
  return d.years > 0 || d.months > 0;
}

/** Seconds contributed by the parts that do have a fixed length. */
function fixedSeconds(d: Duration): number {
  return (
    d.weeks * 604_800 + d.days * 86_400 + d.hours * 3600 + d.minutes * 60 + d.seconds
  );
}

/**
 * Total seconds using mean Gregorian year and month lengths. Approximate
 * whenever the duration contains years or months.
 */
export function toSecondsNominal(d: Duration): number {
  const cal =
    d.years * NOMINAL_DAYS_PER_YEAR * 86_400 + d.months * NOMINAL_DAYS_PER_MONTH * 86_400;
  const total = cal + fixedSeconds(d);
  return d.negative ? -total : total;
}

/**
 * Shift a date by whole years and months, clamping rather than overflowing.
 *
 * One month after 31 January is genuinely ambiguous, and setUTCMonth answers it
 * by rolling into March, which nobody means. Clamping to the last day of the
 * target month is what date libraries and people both do.
 *
 * Fractional years and months fall back to nominal lengths, since "half a
 * month" has no calendar meaning to be exact about.
 */
function shiftCalendar(anchor: Date, years: number, months: number): Date {
  const wholeYears = Math.trunc(years);
  const wholeMonths = Math.trunc(months);
  const fractionDays =
    (years - wholeYears) * NOMINAL_DAYS_PER_YEAR + (months - wholeMonths) * NOMINAL_DAYS_PER_MONTH;

  const d = new Date(anchor.getTime());
  const dayOfMonth = d.getUTCDate();
  d.setUTCDate(1); // shift months from a day that cannot overflow
  d.setUTCFullYear(d.getUTCFullYear() + wholeYears);
  d.setUTCMonth(d.getUTCMonth() + wholeMonths);

  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(dayOfMonth, lastDay));

  return new Date(d.getTime() + fractionDays * 86_400_000);
}

/**
 * Exact seconds, by applying the duration to a real date and measuring. This is
 * the only correct answer when years or months are involved, because it knows
 * how long those particular months were.
 */
export function toSecondsFrom(d: Duration, anchor: Date): number {
  const sign = d.negative ? -1 : 1;
  const end = shiftCalendar(anchor, sign * d.years, sign * d.months);
  const ms = end.getTime() - anchor.getTime();
  return ms / 1000 + sign * fixedSeconds(d);
}

/** The instant a duration reaches when applied to a date. */
export function applyTo(d: Duration, anchor: Date): Date {
  return new Date(anchor.getTime() + toSecondsFrom(d, anchor) * 1000);
}

const UNITS: [keyof Duration, string][] = [
  ['years', 'year'],
  ['months', 'month'],
  ['weeks', 'week'],
  ['days', 'day'],
  ['hours', 'hour'],
  ['minutes', 'minute'],
  ['seconds', 'second'],
];

/** "1 hour, 30 minutes". Empty durations read as "zero". */
export function formatHuman(d: Duration): string {
  const parts: string[] = [];
  for (const [key, label] of UNITS) {
    const v = d[key] as number;
    if (v) parts.push(`${v} ${label}${v === 1 ? '' : 's'}`);
  }
  if (!parts.length) return 'zero';
  return (d.negative ? 'minus ' : '') + parts.join(', ');
}

/** HH:MM:SS for the clock-shaped part, which is what media players want. */
export function formatClock(totalSeconds: number): string {
  const s = Math.abs(Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  const sign = totalSeconds < 0 ? '-' : '';
  return h ? `${sign}${h}:${pad(m)}:${pad(sec)}` : `${sign}${m}:${pad(sec)}`;
}

/**
 * Seconds back to an ISO duration. Deliberately stops at days: turning 90 days
 * into "P3M" would invent a precision the input never had.
 */
export function secondsToDuration(totalSeconds: number): string {
  const negative = totalSeconds < 0;
  let s = Math.abs(totalSeconds);

  const days = Math.floor(s / 86_400);
  s -= days * 86_400;
  const hours = Math.floor(s / 3600);
  s -= hours * 3600;
  const minutes = Math.floor(s / 60);
  s -= minutes * 60;
  const seconds = Number(s.toFixed(6).replace(/\.?0+$/, ''));

  if (!days && !hours && !minutes && !seconds) return 'PT0S';

  let out = negative ? '-P' : 'P';
  if (days) out += `${days}D`;
  if (hours || minutes || seconds) {
    out += 'T';
    if (hours) out += `${hours}H`;
    if (minutes) out += `${minutes}M`;
    if (seconds) out += `${seconds}S`;
  }
  return out;
}

/** Round-trip the parsed value back to canonical ISO form. */
export function toIso(d: Duration): string {
  let out = d.negative ? '-P' : 'P';
  if (d.years) out += `${d.years}Y`;
  if (d.months) out += `${d.months}M`;
  if (d.weeks) out += `${d.weeks}W`;
  if (d.days) out += `${d.days}D`;
  if (d.hours || d.minutes || d.seconds) {
    out += 'T';
    if (d.hours) out += `${d.hours}H`;
    if (d.minutes) out += `${d.minutes}M`;
    if (d.seconds) out += `${d.seconds}S`;
  }
  return out === 'P' || out === '-P' ? 'PT0S' : out;
}

/** Where these turn up, so people can tell whether they have the right format. */
export const WHERE_USED: { name: string; example: string; note: string }[] = [
  { name: 'schema.org', example: 'PT1H30M', note: 'recipe cookTime, video duration' },
  { name: 'YouTube Data API', example: 'PT4M13S', note: 'contentDetails.duration' },
  { name: 'Kubernetes', example: 'PT30S', note: 'some CRD timeout fields' },
  { name: 'XML Schema', example: 'P1Y2M3DT4H5M6S', note: 'xs:duration' },
  { name: 'Azure and .NET', example: 'P3DT4H', note: 'TimeSpan round-trip format' },
];
