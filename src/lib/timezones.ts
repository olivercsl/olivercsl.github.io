/**
 * Time zone helpers built entirely on the browser's Intl API.
 *
 * No dependency and no bundled tzdata: Intl already carries the IANA database,
 * so DST rules stay correct as countries change them, and we ship none of it.
 *
 * The awkward part of any converter is going the "wrong" way — turning a wall
 * clock reading in some zone back into a UTC instant. Intl only formats
 * forwards, so wallTimeToInstant() inverts it by iteration. See the note there.
 */

export interface City {
  /** City name as people search for it. */
  c: string;
  /** ISO 3166-1 alpha-2. Country name and flag are derived, not stored. */
  cc: string;
  /** IANA zone id. */
  z: string;
}

/**
 * Curated list, because IANA ids are not city names people type. "Boston" is
 * America/New_York; "Munich" is Europe/Berlin. Any zone not listed here is
 * still reachable — searchCities() falls back to the full Intl zone list.
 */
export const CITIES: City[] = [
  // North America
  { c: 'New York', cc: 'US', z: 'America/New_York' },
  { c: 'Boston', cc: 'US', z: 'America/New_York' },
  { c: 'Washington DC', cc: 'US', z: 'America/New_York' },
  { c: 'Philadelphia', cc: 'US', z: 'America/New_York' },
  { c: 'Atlanta', cc: 'US', z: 'America/New_York' },
  { c: 'Miami', cc: 'US', z: 'America/New_York' },
  { c: 'Detroit', cc: 'US', z: 'America/Detroit' },
  { c: 'Chicago', cc: 'US', z: 'America/Chicago' },
  { c: 'Dallas', cc: 'US', z: 'America/Chicago' },
  { c: 'Houston', cc: 'US', z: 'America/Chicago' },
  { c: 'Austin', cc: 'US', z: 'America/Chicago' },
  { c: 'Minneapolis', cc: 'US', z: 'America/Chicago' },
  { c: 'Denver', cc: 'US', z: 'America/Denver' },
  { c: 'Salt Lake City', cc: 'US', z: 'America/Denver' },
  { c: 'Phoenix', cc: 'US', z: 'America/Phoenix' },
  { c: 'Los Angeles', cc: 'US', z: 'America/Los_Angeles' },
  { c: 'San Francisco', cc: 'US', z: 'America/Los_Angeles' },
  { c: 'San Diego', cc: 'US', z: 'America/Los_Angeles' },
  { c: 'Seattle', cc: 'US', z: 'America/Los_Angeles' },
  { c: 'Portland', cc: 'US', z: 'America/Los_Angeles' },
  { c: 'Las Vegas', cc: 'US', z: 'America/Los_Angeles' },
  { c: 'Anchorage', cc: 'US', z: 'America/Anchorage' },
  { c: 'Honolulu', cc: 'US', z: 'Pacific/Honolulu' },
  { c: 'Toronto', cc: 'CA', z: 'America/Toronto' },
  { c: 'Ottawa', cc: 'CA', z: 'America/Toronto' },
  { c: 'Montreal', cc: 'CA', z: 'America/Toronto' },
  { c: 'Vancouver', cc: 'CA', z: 'America/Vancouver' },
  { c: 'Calgary', cc: 'CA', z: 'America/Edmonton' },
  { c: 'Winnipeg', cc: 'CA', z: 'America/Winnipeg' },
  { c: 'Halifax', cc: 'CA', z: 'America/Halifax' },
  { c: 'Mexico City', cc: 'MX', z: 'America/Mexico_City' },
  { c: 'Monterrey', cc: 'MX', z: 'America/Monterrey' },
  { c: 'Tijuana', cc: 'MX', z: 'America/Tijuana' },
  { c: 'Panama City', cc: 'PA', z: 'America/Panama' },
  { c: 'San José', cc: 'CR', z: 'America/Costa_Rica' },
  { c: 'Havana', cc: 'CU', z: 'America/Havana' },
  { c: 'Kingston', cc: 'JM', z: 'America/Jamaica' },

  // South America
  { c: 'São Paulo', cc: 'BR', z: 'America/Sao_Paulo' },
  { c: 'Rio de Janeiro', cc: 'BR', z: 'America/Sao_Paulo' },
  { c: 'Brasília', cc: 'BR', z: 'America/Sao_Paulo' },
  { c: 'Buenos Aires', cc: 'AR', z: 'America/Argentina/Buenos_Aires' },
  { c: 'Santiago', cc: 'CL', z: 'America/Santiago' },
  { c: 'Lima', cc: 'PE', z: 'America/Lima' },
  { c: 'Bogotá', cc: 'CO', z: 'America/Bogota' },
  { c: 'Caracas', cc: 'VE', z: 'America/Caracas' },
  { c: 'Quito', cc: 'EC', z: 'America/Guayaquil' },
  { c: 'Montevideo', cc: 'UY', z: 'America/Montevideo' },
  { c: 'La Paz', cc: 'BO', z: 'America/La_Paz' },

  // Europe
  { c: 'London', cc: 'GB', z: 'Europe/London' },
  { c: 'Manchester', cc: 'GB', z: 'Europe/London' },
  { c: 'Edinburgh', cc: 'GB', z: 'Europe/London' },
  { c: 'Dublin', cc: 'IE', z: 'Europe/Dublin' },
  { c: 'Paris', cc: 'FR', z: 'Europe/Paris' },
  { c: 'Lyon', cc: 'FR', z: 'Europe/Paris' },
  { c: 'Marseille', cc: 'FR', z: 'Europe/Paris' },
  { c: 'Berlin', cc: 'DE', z: 'Europe/Berlin' },
  { c: 'Munich', cc: 'DE', z: 'Europe/Berlin' },
  { c: 'Frankfurt', cc: 'DE', z: 'Europe/Berlin' },
  { c: 'Hamburg', cc: 'DE', z: 'Europe/Berlin' },
  { c: 'Amsterdam', cc: 'NL', z: 'Europe/Amsterdam' },
  { c: 'Rotterdam', cc: 'NL', z: 'Europe/Amsterdam' },
  { c: 'Brussels', cc: 'BE', z: 'Europe/Brussels' },
  { c: 'Luxembourg', cc: 'LU', z: 'Europe/Luxembourg' },
  { c: 'Zurich', cc: 'CH', z: 'Europe/Zurich' },
  { c: 'Geneva', cc: 'CH', z: 'Europe/Zurich' },
  { c: 'Vienna', cc: 'AT', z: 'Europe/Vienna' },
  { c: 'Madrid', cc: 'ES', z: 'Europe/Madrid' },
  { c: 'Barcelona', cc: 'ES', z: 'Europe/Madrid' },
  { c: 'Lisbon', cc: 'PT', z: 'Europe/Lisbon' },
  { c: 'Rome', cc: 'IT', z: 'Europe/Rome' },
  { c: 'Milan', cc: 'IT', z: 'Europe/Rome' },
  { c: 'Copenhagen', cc: 'DK', z: 'Europe/Copenhagen' },
  { c: 'Stockholm', cc: 'SE', z: 'Europe/Stockholm' },
  { c: 'Oslo', cc: 'NO', z: 'Europe/Oslo' },
  { c: 'Helsinki', cc: 'FI', z: 'Europe/Helsinki' },
  { c: 'Reykjavik', cc: 'IS', z: 'Atlantic/Reykjavik' },
  { c: 'Warsaw', cc: 'PL', z: 'Europe/Warsaw' },
  { c: 'Prague', cc: 'CZ', z: 'Europe/Prague' },
  { c: 'Budapest', cc: 'HU', z: 'Europe/Budapest' },
  { c: 'Bucharest', cc: 'RO', z: 'Europe/Bucharest' },
  { c: 'Sofia', cc: 'BG', z: 'Europe/Sofia' },
  { c: 'Athens', cc: 'GR', z: 'Europe/Athens' },
  { c: 'Zagreb', cc: 'HR', z: 'Europe/Zagreb' },
  { c: 'Belgrade', cc: 'RS', z: 'Europe/Belgrade' },
  { c: 'Kyiv', cc: 'UA', z: 'Europe/Kyiv' },
  { c: 'Moscow', cc: 'RU', z: 'Europe/Moscow' },
  { c: 'Saint Petersburg', cc: 'RU', z: 'Europe/Moscow' },
  { c: 'Istanbul', cc: 'TR', z: 'Europe/Istanbul' },
  { c: 'Malta', cc: 'MT', z: 'Europe/Malta' },

  // Middle East
  { c: 'Dubai', cc: 'AE', z: 'Asia/Dubai' },
  { c: 'Abu Dhabi', cc: 'AE', z: 'Asia/Dubai' },
  { c: 'Doha', cc: 'QA', z: 'Asia/Qatar' },
  { c: 'Riyadh', cc: 'SA', z: 'Asia/Riyadh' },
  { c: 'Jeddah', cc: 'SA', z: 'Asia/Riyadh' },
  { c: 'Kuwait City', cc: 'KW', z: 'Asia/Kuwait' },
  { c: 'Manama', cc: 'BH', z: 'Asia/Bahrain' },
  { c: 'Muscat', cc: 'OM', z: 'Asia/Muscat' },
  { c: 'Tel Aviv', cc: 'IL', z: 'Asia/Jerusalem' },
  { c: 'Jerusalem', cc: 'IL', z: 'Asia/Jerusalem' },
  { c: 'Amman', cc: 'JO', z: 'Asia/Amman' },
  { c: 'Beirut', cc: 'LB', z: 'Asia/Beirut' },
  { c: 'Baghdad', cc: 'IQ', z: 'Asia/Baghdad' },
  { c: 'Tehran', cc: 'IR', z: 'Asia/Tehran' },

  // Africa
  { c: 'Cairo', cc: 'EG', z: 'Africa/Cairo' },
  { c: 'Casablanca', cc: 'MA', z: 'Africa/Casablanca' },
  { c: 'Lagos', cc: 'NG', z: 'Africa/Lagos' },
  { c: 'Accra', cc: 'GH', z: 'Africa/Accra' },
  { c: 'Nairobi', cc: 'KE', z: 'Africa/Nairobi' },
  { c: 'Addis Ababa', cc: 'ET', z: 'Africa/Addis_Ababa' },
  { c: 'Dar es Salaam', cc: 'TZ', z: 'Africa/Dar_es_Salaam' },
  { c: 'Johannesburg', cc: 'ZA', z: 'Africa/Johannesburg' },
  { c: 'Cape Town', cc: 'ZA', z: 'Africa/Johannesburg' },
  { c: 'Tunis', cc: 'TN', z: 'Africa/Tunis' },
  { c: 'Algiers', cc: 'DZ', z: 'Africa/Algiers' },

  // South & Central Asia
  { c: 'Mumbai', cc: 'IN', z: 'Asia/Kolkata' },
  { c: 'Delhi', cc: 'IN', z: 'Asia/Kolkata' },
  { c: 'Bangalore', cc: 'IN', z: 'Asia/Kolkata' },
  { c: 'Hyderabad', cc: 'IN', z: 'Asia/Kolkata' },
  { c: 'Chennai', cc: 'IN', z: 'Asia/Kolkata' },
  { c: 'Kolkata', cc: 'IN', z: 'Asia/Kolkata' },
  { c: 'Pune', cc: 'IN', z: 'Asia/Kolkata' },
  { c: 'Karachi', cc: 'PK', z: 'Asia/Karachi' },
  { c: 'Lahore', cc: 'PK', z: 'Asia/Karachi' },
  { c: 'Islamabad', cc: 'PK', z: 'Asia/Karachi' },
  { c: 'Dhaka', cc: 'BD', z: 'Asia/Dhaka' },
  { c: 'Colombo', cc: 'LK', z: 'Asia/Colombo' },
  { c: 'Kathmandu', cc: 'NP', z: 'Asia/Kathmandu' },
  { c: 'Tashkent', cc: 'UZ', z: 'Asia/Tashkent' },
  { c: 'Almaty', cc: 'KZ', z: 'Asia/Almaty' },

  // East & Southeast Asia
  { c: 'Hong Kong', cc: 'HK', z: 'Asia/Hong_Kong' },
  { c: 'Macau', cc: 'MO', z: 'Asia/Macau' },
  { c: 'Beijing', cc: 'CN', z: 'Asia/Shanghai' },
  { c: 'Shanghai', cc: 'CN', z: 'Asia/Shanghai' },
  { c: 'Shenzhen', cc: 'CN', z: 'Asia/Shanghai' },
  { c: 'Guangzhou', cc: 'CN', z: 'Asia/Shanghai' },
  { c: 'Chengdu', cc: 'CN', z: 'Asia/Shanghai' },
  { c: 'Taipei', cc: 'TW', z: 'Asia/Taipei' },
  { c: 'Tokyo', cc: 'JP', z: 'Asia/Tokyo' },
  { c: 'Osaka', cc: 'JP', z: 'Asia/Tokyo' },
  { c: 'Seoul', cc: 'KR', z: 'Asia/Seoul' },
  { c: 'Singapore', cc: 'SG', z: 'Asia/Singapore' },
  { c: 'Kuala Lumpur', cc: 'MY', z: 'Asia/Kuala_Lumpur' },
  { c: 'Jakarta', cc: 'ID', z: 'Asia/Jakarta' },
  { c: 'Bali', cc: 'ID', z: 'Asia/Makassar' },
  { c: 'Bangkok', cc: 'TH', z: 'Asia/Bangkok' },
  { c: 'Hanoi', cc: 'VN', z: 'Asia/Ho_Chi_Minh' },
  { c: 'Ho Chi Minh City', cc: 'VN', z: 'Asia/Ho_Chi_Minh' },
  { c: 'Manila', cc: 'PH', z: 'Asia/Manila' },
  { c: 'Phnom Penh', cc: 'KH', z: 'Asia/Phnom_Penh' },
  { c: 'Yangon', cc: 'MM', z: 'Asia/Yangon' },
  { c: 'Ulaanbaatar', cc: 'MN', z: 'Asia/Ulaanbaatar' },

  // Oceania
  { c: 'Sydney', cc: 'AU', z: 'Australia/Sydney' },
  { c: 'Melbourne', cc: 'AU', z: 'Australia/Melbourne' },
  { c: 'Canberra', cc: 'AU', z: 'Australia/Sydney' },
  { c: 'Brisbane', cc: 'AU', z: 'Australia/Brisbane' },
  { c: 'Perth', cc: 'AU', z: 'Australia/Perth' },
  { c: 'Adelaide', cc: 'AU', z: 'Australia/Adelaide' },
  { c: 'Hobart', cc: 'AU', z: 'Australia/Hobart' },
  { c: 'Darwin', cc: 'AU', z: 'Australia/Darwin' },
  { c: 'Auckland', cc: 'NZ', z: 'Pacific/Auckland' },
  { c: 'Wellington', cc: 'NZ', z: 'Pacific/Auckland' },
  { c: 'Christchurch', cc: 'NZ', z: 'Pacific/Auckland' },
  { c: 'Suva', cc: 'FJ', z: 'Pacific/Fiji' },
  { c: 'Port Moresby', cc: 'PG', z: 'Pacific/Port_Moresby' },
  { c: 'Honiara', cc: 'SB', z: 'Pacific/Guadalcanal' },
  { c: 'Nouméa', cc: 'NC', z: 'Pacific/Noumea' },
  { c: 'Papeete', cc: 'PF', z: 'Pacific/Tahiti' },
  { c: 'Guam', cc: 'GU', z: 'Pacific/Guam' },

  { c: 'UTC', cc: '', z: 'UTC' },
];

/* ------------------------------------------------------------------ */
/* Country + flag                                                      */
/* ------------------------------------------------------------------ */

let regionNames: Intl.DisplayNames | null = null;

export function countryName(cc: string): string {
  if (!cc) return '';
  try {
    regionNames ??= new Intl.DisplayNames(['en'], { type: 'region' });
    return regionNames.of(cc) ?? cc;
  } catch {
    return cc;
  }
}

/** Flag emoji from an ISO country code, via regional indicator symbols. */
export function flagEmoji(cc: string): string {
  if (!cc || cc.length !== 2) return '🌐';
  return String.fromCodePoint(...[...cc.toUpperCase()].map((ch) => 0x1f1a5 + ch.charCodeAt(0)));
}

/* ------------------------------------------------------------------ */
/* Offsets and formatting                                              */
/* ------------------------------------------------------------------ */

const partsCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(zone: string): Intl.DateTimeFormat {
  let f = partsCache.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    partsCache.set(zone, f);
  }
  return f;
}

export interface WallTime {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
}

/** The wall clock reading in `zone` at instant `date`. */
export function wallTimeIn(date: Date, zone: string): WallTime {
  const map: Record<string, string> = {};
  for (const p of partsFormatter(zone).formatToParts(date)) map[p.type] = p.value;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    // Some environments render midnight as hour 24 under hour12:false.
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
  };
}

/** Zone's UTC offset in minutes at `date` (east of UTC positive). */
export function offsetMinutes(date: Date, zone: string): number {
  const w = wallTimeIn(date, zone);
  const map: Record<string, string> = {};
  for (const p of partsFormatter(zone).formatToParts(date)) map[p.type] = p.value;
  const asUTC = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, Number(map.second));
  return Math.round((asUTC - date.getTime()) / 60000);
}

/**
 * Inverse of wallTimeIn: the instant at which `zone` reads this wall time.
 *
 * Intl only converts instant -> wall time, so we guess (treat the reading as
 * UTC), measure the zone's offset at that guess, correct, then measure again.
 * The second pass matters near DST transitions, where the offset at the guess
 * differs from the offset at the corrected instant.
 *
 * Two awkward cases:
 *
 *  - Spring forward. 02:30 simply does not occur on a day the clocks jump from
 *    02:00 to 03:00. The refined result would land back before the transition
 *    (01:30), which reads as the user's input being moved backwards. We instead
 *    keep the first-pass result, which uses the pre-transition offset and so
 *    shifts forward to 03:30 — matching Temporal's "compatible" disambiguation.
 *
 *  - Fall back. 01:30 happens twice. Both are valid; we return the first
 *    (still in daylight time), again matching Temporal's default.
 */
export function wallTimeToInstant(w: WallTime, zone: string): Date {
  const guess = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute);

  const firstPass = guess - offsetMinutes(new Date(guess), zone) * 60000;
  const refined = guess - offsetMinutes(new Date(firstPass), zone) * 60000;

  // If the refined instant reads back as the requested wall time, it is right.
  // If it does not, that reading never occurs — we are inside a gap.
  const check = wallTimeIn(new Date(refined), zone);
  const roundTrips =
    check.year === w.year &&
    check.month === w.month &&
    check.day === w.day &&
    check.hour === w.hour &&
    check.minute === w.minute;

  return new Date(roundTrips ? refined : firstPass);
}

/**
 * Long zone names that ICU renders as "GMT+n" in its short form, mapped to the
 * abbreviation people actually use.
 *
 * Keyed on the long name because that already encodes daylight saving —
 * "Australian Eastern Standard Time" and "...Daylight Time" are separate keys,
 * so we do not have to work out whether DST is active.
 *
 * Deliberately incomplete. Deriving initials automatically produces wrong
 * answers (Hong Kong -> "HKST", Bangkok -> "IT") and, worse, ambiguous ones
 * (São Paulo -> "BST", which reads as British Summer Time). Anything not listed
 * here falls back to the GMT offset, which is unambiguous and always correct.
 */
const ZONE_ABBREVIATIONS: Record<string, string> = {
  // Europe. Irish Standard Time is omitted on purpose: its abbreviation is
  // also IST, which already means India Standard Time here.
  'Greenwich Mean Time': 'GMT',
  'British Summer Time': 'BST',
  'Central European Standard Time': 'CET',
  'Central European Summer Time': 'CEST',
  'Eastern European Standard Time': 'EET',
  'Eastern European Summer Time': 'EEST',
  'Western European Standard Time': 'WET',
  'Western European Summer Time': 'WEST',

  'Australian Eastern Standard Time': 'AEST',
  'Australian Eastern Daylight Time': 'AEDT',
  'Australian Central Standard Time': 'ACST',
  'Australian Central Daylight Time': 'ACDT',
  'Australian Western Standard Time': 'AWST',
  'New Zealand Standard Time': 'NZST',
  'New Zealand Daylight Time': 'NZDT',
  'Hong Kong Standard Time': 'HKT',
  'Singapore Standard Time': 'SGT',
  'China Standard Time': 'CST',
  'Japan Standard Time': 'JST',
  'Korean Standard Time': 'KST',
  'India Standard Time': 'IST',
  'Pakistan Standard Time': 'PKT',
  'Nepal Time': 'NPT',
  'Indochina Time': 'ICT',
  'Malaysia Time': 'MYT',
  'Philippine Standard Time': 'PHT',
  'Western Indonesia Time': 'WIB',
  'Central Indonesia Time': 'WITA',
  'Gulf Standard Time': 'GST',
  'Moscow Standard Time': 'MSK',
  'South Africa Standard Time': 'SAST',
  'East Africa Time': 'EAT',
  'West Africa Standard Time': 'WAT',
};

/**
 * Zone abbreviation such as AEST or EDT.
 *
 * ICU gives a real abbreviation for some zones and "GMT+10" for others. We use
 * the abbreviation when offered, consult the table above when not, and
 * otherwise show the GMT offset rather than inventing something plausible.
 */
export function zoneAbbreviation(date: Date, zone: string): string {
  try {
    const short =
      new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'short' })
        .formatToParts(date)
        .find((p) => p.type === 'timeZoneName')?.value ?? '';

    if (short && !/^GMT|^UTC/.test(short)) return short;

    const long =
      new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'long' })
        .formatToParts(date)
        .find((p) => p.type === 'timeZoneName')?.value ?? '';

    return ZONE_ABBREVIATIONS[long] ?? short;
  } catch {
    return '';
  }
}

/** "UTC +10", "UTC -4:30", "UTC" */
export function formatOffset(minutes: number): string {
  if (minutes === 0) return 'UTC';
  const sign = minutes > 0 ? '+' : '-';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC ${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
}

/** "14 hours behind", "2 hours ahead", "same time" — relative to a reference. */
export function describeDifference(minutes: number): string {
  if (minutes === 0) return 'same time';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h} hour${h === 1 ? '' : 's'}`);
  if (m) parts.push(`${m} min`);
  return `${parts.join(' ')} ${minutes > 0 ? 'ahead' : 'behind'}`;
}

/* ------------------------------------------------------------------ */
/* Suitability                                                         */
/* ------------------------------------------------------------------ */

export type Suitability = 'good' | 'ok' | 'poor';

/** Rough call on whether an hour is reasonable to put a meeting in. */
export function rateHour(hour: number): Suitability {
  if (hour >= 9 && hour < 18) return 'good';
  if ((hour >= 7 && hour < 9) || (hour >= 18 && hour < 22)) return 'ok';
  return 'poor';
}

export const SUITABILITY_EMOJI: Record<Suitability, string> = {
  good: '🙂',
  ok: '😐',
  poor: '😴',
};

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

export interface SearchResult {
  city: string;
  cc: string;
  zone: string;
}

let allZones: string[] | null = null;

function zoneList(): string[] {
  if (allZones) return allZones;
  try {
    // @ts-expect-error - supportedValuesOf is newer than the bundled lib types
    allZones = (Intl.supportedValuesOf?.('timeZone') as string[]) ?? [];
  } catch {
    allZones = [];
  }
  return allZones!;
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // fold accents so "sao paulo" finds "São Paulo"
    .replace(/[_/]/g, ' ')
    .trim();

/**
 * Curated cities first (ranked: prefix beats substring), then any remaining
 * IANA zone whose name matches, so obscure zones stay reachable.
 */
export function searchCities(query: string, limit = 8): SearchResult[] {
  const q = normalize(query);
  if (!q) return [];

  const scored: { r: SearchResult; score: number }[] = [];

  for (const city of CITIES) {
    const name = normalize(city.c);
    const country = normalize(countryName(city.cc));
    let score = -1;
    if (name === q) score = 0;
    else if (name.startsWith(q)) score = 1;
    else if (name.includes(q)) score = 2;
    else if (country.startsWith(q)) score = 3;
    else if (normalize(city.z).includes(q)) score = 4;
    if (score >= 0) scored.push({ r: { city: city.c, cc: city.cc, zone: city.z }, score });
  }

  scored.sort((a, b) => a.score - b.score || a.r.city.localeCompare(b.r.city));
  const out = scored.slice(0, limit).map((s) => s.r);

  if (out.length < limit) {
    const seen = new Set(out.map((o) => o.zone));
    for (const zone of zoneList()) {
      if (out.length >= limit) break;
      if (seen.has(zone) || !normalize(zone).includes(q)) continue;
      out.push({ city: zone.split('/').pop()!.replace(/_/g, ' '), cc: '', zone });
      seen.add(zone);
    }
  }

  return out;
}

/** The visitor's own zone, for seeding the first row. */
export function localZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Best-effort city label for a zone id. */
export function cityForZone(zone: string): SearchResult {
  const match = CITIES.find((c) => c.z === zone);
  if (match) return { city: match.c, cc: match.cc, zone };
  return { city: zone.split('/').pop()!.replace(/_/g, ' '), cc: '', zone };
}
