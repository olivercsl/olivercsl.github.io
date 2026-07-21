/**
 * Password + passphrase generation.
 *
 * Everything here runs in the browser and uses the Web Crypto API. There is no
 * network access, no persistence, and no logging of generated secrets.
 *
 * Two details matter more than they look:
 *  - randomInt() uses rejection sampling, not `% range`. Modulo folding makes
 *    low indices more likely, which silently biases every password toward the
 *    front of the character pool.
 *  - generatePassword() guarantees one character per selected class and then
 *    shuffles, so the guarantee doesn't pin classes to fixed positions.
 */

export const CHAR_POOLS = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?/',
} as const;

export type CharClass = keyof typeof CHAR_POOLS;

/** Glyphs that are easy to confuse in most fonts. */
export const SIMILAR_CHARS = 'O0oIl1|S5Z2B8';

export const LENGTH_MIN = 4;
export const LENGTH_MAX = 40;
export const LENGTH_DEFAULT = 16;
/** One-click lengths offered beside the slider. */
export const LENGTH_PRESETS = [16, 24, 32, 40] as const;

export const WORDS_MIN = 3;
export const WORDS_MAX = 8;
export const WORDS_DEFAULT = 4;

export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  digits: boolean;
  symbols: boolean;
  excludeSimilar: boolean;
}

export interface PassphraseOptions {
  wordCount: number;
  separator: string;
  capitalize: boolean;
  includeNumber: boolean;
}

/* ------------------------------------------------------------------ */
/* Randomness                                                          */
/* ------------------------------------------------------------------ */

function getCrypto(): Crypto {
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (!c?.getRandomValues) {
    // Fail loudly. Falling back to Math.random() would produce passwords that
    // look fine but are predictable.
    throw new Error('Secure random number generation is unavailable in this browser.');
  }
  return c;
}

/**
 * Uniformly random integer in [0, max) via rejection sampling.
 *
 * We draw 32 random bits and discard any draw landing in the final partial
 * bucket, so every value in range is equally likely.
 */
export function randomInt(max: number): number {
  if (!Number.isInteger(max) || max <= 0) {
    throw new Error(`randomInt requires a positive integer bound, received ${max}`);
  }
  if (max === 1) return 0;

  const crypto = getCrypto();
  const range = 2 ** 32;
  const limit = range - (range % max); // largest multiple of max that fits
  const buf = new Uint32Array(1);

  // Expected iterations < 2; unbounded loop is safe because P(reject) < 0.5.
  for (;;) {
    crypto.getRandomValues(buf);
    const value = buf[0]!;
    if (value < limit) return value % max;
  }
}

function randomChar(pool: string): string {
  return pool[randomInt(pool.length)]!;
}

/** In-place Fisher-Yates using the same unbiased source. */
function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return items;
}

/* ------------------------------------------------------------------ */
/* Character pools                                                     */
/* ------------------------------------------------------------------ */

export function activeClasses(options: PasswordOptions): CharClass[] {
  const classes: CharClass[] = [];
  if (options.lowercase) classes.push('lowercase');
  if (options.uppercase) classes.push('uppercase');
  if (options.digits) classes.push('digits');
  if (options.symbols) classes.push('symbols');
  return classes;
}

function stripSimilar(pool: string): string {
  return [...pool].filter((ch) => !SIMILAR_CHARS.includes(ch)).join('');
}

/** The pool for one class, after applying the exclude-similar filter. */
export function poolFor(cls: CharClass, excludeSimilar: boolean): string {
  const pool = CHAR_POOLS[cls];
  return excludeSimilar ? stripSimilar(pool) : pool;
}

export function fullPool(options: PasswordOptions): string {
  return activeClasses(options)
    .map((cls) => poolFor(cls, options.excludeSimilar))
    .join('');
}

/* ------------------------------------------------------------------ */
/* Generation                                                          */
/* ------------------------------------------------------------------ */

export function generatePassword(options: PasswordOptions): string {
  const classes = activeClasses(options);
  if (classes.length === 0) {
    throw new Error('Select at least one character type.');
  }

  const length = Math.min(Math.max(Math.trunc(options.length), LENGTH_MIN), LENGTH_MAX);

  // Non-empty pools only: excludeSimilar can empty a class (e.g. digits).
  const pools = classes
    .map((cls) => poolFor(cls, options.excludeSimilar))
    .filter((pool) => pool.length > 0);

  if (pools.length === 0) {
    throw new Error('No characters available. Try disabling "exclude similar characters".');
  }

  const chars: string[] = [];

  // One from each class first, so every selected type is actually represented.
  // If length < class count we can't satisfy them all; take a random subset.
  for (const pool of shuffle([...pools]).slice(0, length)) {
    chars.push(randomChar(pool));
  }

  const combined = pools.join('');
  while (chars.length < length) {
    chars.push(randomChar(combined));
  }

  // Without this, position 0 would always be the first class, etc.
  return shuffle(chars).join('');
}

export async function generatePassphrase(options: PassphraseOptions): Promise<string> {
  const { WORDS } = await import('./wordlist');

  const count = Math.min(Math.max(Math.trunc(options.wordCount), WORDS_MIN), WORDS_MAX);
  const words: string[] = [];

  for (let i = 0; i < count; i++) {
    const word = WORDS[randomInt(WORDS.length)]!;
    words.push(options.capitalize ? word[0]!.toUpperCase() + word.slice(1) : word);
  }

  if (options.includeNumber) {
    // Replace a random word rather than appending, keeping the word count honest.
    words[randomInt(words.length)] += String(randomInt(100));
  }

  return words.join(options.separator);
}

/* ------------------------------------------------------------------ */
/* Strength                                                            */
/* ------------------------------------------------------------------ */

/**
 * Entropy in bits: length x log2(poolSize).
 *
 * This measures the generator's own randomness, which is the honest number for
 * machine-generated secrets. It is not a guess at how a human-chosen password
 * would score.
 */
export function passwordEntropy(options: PasswordOptions): number {
  const pool = fullPool(options);
  if (pool.length === 0) return 0;
  const length = Math.min(Math.max(Math.trunc(options.length), LENGTH_MIN), LENGTH_MAX);
  return length * Math.log2(pool.length);
}

export function passphraseEntropy(options: PassphraseOptions, wordlistSize = 7776): number {
  const count = Math.min(Math.max(Math.trunc(options.wordCount), WORDS_MIN), WORDS_MAX);
  let bits = count * Math.log2(wordlistSize);
  if (options.includeNumber) bits += Math.log2(100) + Math.log2(count);
  return bits;
}

export type StrengthLevel = 'weak' | 'fair' | 'strong' | 'excellent';

export interface Strength {
  level: StrengthLevel;
  label: string;
  /** 0-100, for the meter width. */
  percent: number;
}

export function rateStrength(bits: number): Strength {
  if (bits < 45) return { level: 'weak', label: 'Weak', percent: Math.max(8, (bits / 45) * 25) };
  if (bits < 65) return { level: 'fair', label: 'Fair', percent: 25 + ((bits - 45) / 20) * 25 };
  if (bits < 100) return { level: 'strong', label: 'Strong', percent: 50 + ((bits - 65) / 35) * 30 };
  return { level: 'excellent', label: 'Excellent', percent: Math.min(100, 80 + ((bits - 100) / 60) * 20) };
}

/**
 * Rough time to exhaust the keyspace at 1e10 guesses/sec — an offline attack
 * against a fast hash on commodity GPUs. Deliberately pessimistic: an online
 * attack would take vastly longer.
 */
export function crackTime(bits: number): string {
  const GUESSES_PER_SECOND = 1e10;
  const seconds = 2 ** (bits - 1) / GUESSES_PER_SECOND;

  if (seconds < 1) return 'instantly';
  const units: [number, string][] = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [365, 'day'],
  ];

  let value = seconds;
  let unit = 'second';
  for (const [factor, nextUnit] of units) {
    if (value < factor) break;
    value /= factor;
    unit = nextUnit === 'day' ? 'year' : nextUnit;
    if (unit === 'year') break;
  }

  if (unit === 'year' && value >= 1e6) {
    const exponent = Math.floor(Math.log10(value));
    return `~10^${exponent} years`;
  }

  const rounded = value >= 100 ? Math.round(value) : Number(value.toPrecision(2));
  return `~${rounded.toLocaleString()} ${unit}${rounded === 1 ? '' : 's'}`;
}
