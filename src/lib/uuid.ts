/**
 * UUID generation (RFC 9562), client-side via the Web Crypto API.
 *
 * All randomness comes from crypto.getRandomValues — never Math.random() — and
 * nothing is transmitted. The version and variant bits are set exactly per the
 * spec, so the output validates against any conformant parser.
 */

export type UuidVersion = 'v4' | 'v7' | 'v1' | 'nil';

export const UUID_VERSIONS: { id: UuidVersion; label: string; blurb: string }[] = [
  { id: 'v4', label: 'v4', blurb: 'Random. The everyday default.' },
  { id: 'v7', label: 'v7', blurb: 'Time-ordered. Best for database keys.' },
  { id: 'v1', label: 'v1', blurb: 'Timestamp based. Legacy.' },
  { id: 'nil', label: 'Nil', blurb: 'All zeros.' },
];

export interface FormatOptions {
  uppercase: boolean;
  hyphens: boolean;
  braces: boolean;
}

export const DEFAULT_FORMAT: FormatOptions = { uppercase: false, hyphens: true, braces: false };

export const MAX_COUNT = 100;

function getCrypto(): Crypto {
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (!c?.getRandomValues) {
    throw new Error('Secure random number generation is unavailable in this browser.');
  }
  return c;
}

function randomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  getCrypto().getRandomValues(buf);
  return buf;
}

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

/** Format 16 bytes as the canonical 8-4-4-4-12 hyphenated string. */
function bytesToUuid(b: Uint8Array): string {
  const h = hex(b);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Set the 4-bit version and 2-bit RFC 4122 variant in place. */
function stampVersionVariant(b: Uint8Array, version: number): void {
  b[6] = (b[6]! & 0x0f) | (version << 4);
  b[8] = (b[8]! & 0x3f) | 0x80;
}

export function uuidV4(): string {
  const b = randomBytes(16);
  stampVersionVariant(b, 4);
  return bytesToUuid(b);
}

/**
 * v7: 48-bit Unix millisecond timestamp, then random. `now` is injectable so
 * the ordering property is testable without touching the clock.
 */
export function uuidV7(now: number = Date.now()): string {
  const b = randomBytes(16);
  const ts = BigInt(now);
  b[0] = Number((ts >> 40n) & 0xffn);
  b[1] = Number((ts >> 32n) & 0xffn);
  b[2] = Number((ts >> 24n) & 0xffn);
  b[3] = Number((ts >> 16n) & 0xffn);
  b[4] = Number((ts >> 8n) & 0xffn);
  b[5] = Number(ts & 0xffn);
  stampVersionVariant(b, 7);
  return bytesToUuid(b);
}

// Gregorian epoch (1582-10-15) precedes the Unix epoch by this many ms.
const GREGORIAN_OFFSET_MS = 12219292800000n;

/**
 * v1: 60-bit timestamp in 100-nanosecond intervals since the Gregorian epoch,
 * a random clock sequence, and a random node id.
 *
 * We do not have (and would not want) the machine's MAC address, so the node is
 * random with the multicast bit set — the spec's sanctioned substitute. BigInt
 * is required: the interval count exceeds Number.MAX_SAFE_INTEGER.
 */
export function uuidV1(now: number = Date.now()): string {
  const intervals = (BigInt(now) + GREGORIAN_OFFSET_MS) * 10000n;
  const b = randomBytes(16);

  const timeLow = intervals & 0xffffffffn;
  const timeMid = (intervals >> 32n) & 0xffffn;
  const timeHi = (intervals >> 48n) & 0x0fffn;

  b[0] = Number((timeLow >> 24n) & 0xffn);
  b[1] = Number((timeLow >> 16n) & 0xffn);
  b[2] = Number((timeLow >> 8n) & 0xffn);
  b[3] = Number(timeLow & 0xffn);
  b[4] = Number((timeMid >> 8n) & 0xffn);
  b[5] = Number(timeMid & 0xffn);
  b[6] = Number(((timeHi >> 8n) & 0x0fn) | 0x10n); // version 1 in the high nibble
  b[7] = Number(timeHi & 0xffn);
  b[8] = (b[8]! & 0x3f) | 0x80; // variant
  b[10] = b[10]! | 0x01; // multicast bit — marks a non-hardware node id
  return bytesToUuid(b);
}

export const NIL_UUID = '00000000-0000-0000-0000-000000000000';

export function generate(version: UuidVersion, now?: number): string {
  switch (version) {
    case 'v4':
      return uuidV4();
    case 'v7':
      return uuidV7(now);
    case 'v1':
      return uuidV1(now);
    case 'nil':
      return NIL_UUID;
  }
}

export function applyFormat(uuid: string, opts: FormatOptions): string {
  let out = uuid;
  if (!opts.hyphens) out = out.replace(/-/g, '');
  if (opts.uppercase) out = out.toUpperCase();
  if (opts.braces) out = `{${out}}`;
  return out;
}

/** RFC-canonical shape check, used by tests and reusable for validation UI. */
export function isValidUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
