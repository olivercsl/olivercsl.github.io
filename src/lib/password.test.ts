import { describe, it, expect } from 'vitest';
import {
  generatePassword,
  generatePassphrase,
  randomInt,
  passwordEntropy,
  passphraseEntropy,
  rateStrength,
  crackTime,
  fullPool,
  poolFor,
  SIMILAR_CHARS,
  CHAR_POOLS,
  type PasswordOptions,
} from './password';

const base: PasswordOptions = {
  length: 16,
  uppercase: true,
  lowercase: true,
  digits: true,
  symbols: true,
  excludeSimilar: false,
};

describe('randomInt', () => {
  it('stays within bounds', () => {
    for (let i = 0; i < 2000; i++) {
      const n = randomInt(10);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(10);
    }
  });

  it('returns 0 for a bound of 1', () => {
    expect(randomInt(1)).toBe(0);
  });

  it('rejects invalid bounds', () => {
    expect(() => randomInt(0)).toThrow();
    expect(() => randomInt(-5)).toThrow();
    expect(() => randomInt(2.5)).toThrow();
  });

  it('is uniformly distributed', () => {
    // Note: this does NOT prove absence of modulo bias. Folding 32 random bits
    // into a bound of 100 skews by ~2e-8, which no feasible sample size
    // detects. It catches gross distribution errors; the rejection-sampling
    // test below covers the bias mechanism directly.
    const BOUND = 100;
    const SAMPLES = 200_000;
    const counts = new Array(BOUND).fill(0);

    for (let i = 0; i < SAMPLES; i++) counts[randomInt(BOUND)]++;

    const expected = SAMPLES / BOUND;
    // Chi-square goodness of fit; 99.9% critical value for 99 df is ~148.2.
    const chiSquare = counts.reduce((sum, observed) => {
      const diff = observed - expected;
      return sum + (diff * diff) / expected;
    }, 0);

    expect(chiSquare).toBeLessThan(148.2);
  });

  it('rejects draws in the biased tail rather than folding them', () => {
    // For max=3: 2^32 % 3 === 1, so limit === 2^32 - 1. The single value
    // 4294967295 lies in the partial bucket and must be discarded. A plain
    // `value % max` implementation would accept it and return 0, over-weighting
    // that outcome. We feed that value first, then a clean one.
    const draws = [4294967295, 5];
    let i = 0;
    const real = globalThis.crypto.getRandomValues;

    globalThis.crypto.getRandomValues = ((arr: Uint32Array) => {
      arr[0] = draws[Math.min(i++, draws.length - 1)]!;
      return arr;
    }) as typeof real;

    try {
      expect(randomInt(3)).toBe(5 % 3); // second draw used, first rejected
      expect(i).toBe(2); // proves the first draw was actually discarded
    } finally {
      globalThis.crypto.getRandomValues = real;
    }
  });

  it('throws instead of falling back when secure randomness is missing', () => {
    const real = globalThis.crypto.getRandomValues;
    // @ts-expect-error deliberately removing the API to test the guard
    globalThis.crypto.getRandomValues = undefined;
    try {
      expect(() => randomInt(10)).toThrow(/secure random/i);
    } finally {
      globalThis.crypto.getRandomValues = real;
    }
  });
});

describe('generatePassword', () => {
  it('honours the requested length', () => {
    for (const length of [4, 8, 16, 27, 40]) {
      expect(generatePassword({ ...base, length })).toHaveLength(length);
    }
  });

  it('clamps out-of-range lengths', () => {
    expect(generatePassword({ ...base, length: 1 })).toHaveLength(4);
    expect(generatePassword({ ...base, length: 999 })).toHaveLength(40);
  });

  it('includes at least one character from every selected class', () => {
    // Probabilistic guarantees need repetition to be meaningful.
    for (let i = 0; i < 300; i++) {
      const pw = generatePassword({ ...base, length: 8 });
      expect(pw).toMatch(/[a-z]/);
      expect(pw).toMatch(/[A-Z]/);
      expect(pw).toMatch(/[0-9]/);
      expect([...pw].some((c) => CHAR_POOLS.symbols.includes(c))).toBe(true);
    }
  });

  it('uses only the enabled classes', () => {
    for (let i = 0; i < 200; i++) {
      const pw = generatePassword({
        ...base,
        uppercase: false,
        symbols: false,
        digits: false,
      });
      expect(pw).toMatch(/^[a-z]+$/);
    }
  });

  it('excludes similar characters when asked', () => {
    for (let i = 0; i < 300; i++) {
      const pw = generatePassword({ ...base, length: 40, excludeSimilar: true });
      for (const ch of pw) expect(SIMILAR_CHARS).not.toContain(ch);
    }
  });

  it('throws when no character class is selected', () => {
    expect(() =>
      generatePassword({
        ...base,
        uppercase: false,
        lowercase: false,
        digits: false,
        symbols: false,
      }),
    ).toThrow(/at least one/i);
  });

  it('does not place classes at predictable positions', () => {
    // The class-guarantee step fills position-by-position before shuffling.
    // Without the shuffle, index 0 would always come from the same class.
    const firstCharIsDigit = Array.from({ length: 1000 }, () =>
      /[0-9]/.test(generatePassword({ ...base, length: 8 })[0]!),
    ).filter(Boolean).length;

    // Digits are 10 of 86 pool chars; the exact rate matters less than it not
    // being pinned to 0% or 100%.
    expect(firstCharIsDigit).toBeGreaterThan(20);
    expect(firstCharIsDigit).toBeLessThan(500);
  });

  it('produces a different password each call', () => {
    const seen = new Set(Array.from({ length: 500 }, () => generatePassword(base)));
    expect(seen.size).toBe(500);
  });
});

describe('pools', () => {
  it('strips similar characters per class', () => {
    expect(poolFor('digits', true)).not.toContain('0');
    expect(poolFor('digits', false)).toContain('0');
    expect(poolFor('uppercase', true)).not.toContain('O');
  });

  it('combines only active classes', () => {
    const pool = fullPool({ ...base, symbols: false, digits: false });
    expect(pool).toBe(CHAR_POOLS.lowercase + CHAR_POOLS.uppercase);
  });
});

describe('generatePassphrase', () => {
  const opts = { wordCount: 4, separator: '-', capitalize: false, includeNumber: false };

  it('produces the requested number of words', async () => {
    const phrase = await generatePassphrase(opts);
    expect(phrase.split('-')).toHaveLength(4);
  });

  it('respects the separator', async () => {
    const phrase = await generatePassphrase({ ...opts, separator: '.' });
    expect(phrase.split('.')).toHaveLength(4);
  });

  it('capitalizes each word when asked', async () => {
    const phrase = await generatePassphrase({ ...opts, capitalize: true });
    for (const word of phrase.split('-')) expect(word[0]).toMatch(/[A-Z]/);
  });

  it('adds a number without changing the word count', async () => {
    const phrase = await generatePassphrase({ ...opts, includeNumber: true });
    expect(phrase.split('-')).toHaveLength(4);
    expect(phrase).toMatch(/[0-9]/);
  });

  it('clamps word count to the supported range', async () => {
    expect((await generatePassphrase({ ...opts, wordCount: 1 })).split('-')).toHaveLength(3);
    expect((await generatePassphrase({ ...opts, wordCount: 99 })).split('-')).toHaveLength(8);
  });
});

describe('entropy and strength', () => {
  it('computes password entropy as length x log2(pool)', () => {
    // lowercase only => 26 chars => log2(26) ~ 4.7 bits per char
    const bits = passwordEntropy({ ...base, uppercase: false, digits: false, symbols: false });
    expect(bits).toBeCloseTo(16 * Math.log2(26), 5);
  });

  it('returns zero entropy when nothing is selected', () => {
    expect(
      passwordEntropy({
        ...base,
        uppercase: false,
        lowercase: false,
        digits: false,
        symbols: false,
      }),
    ).toBe(0);
  });

  it('computes passphrase entropy at ~12.9 bits per word', () => {
    const bits = passphraseEntropy({
      wordCount: 4,
      separator: '-',
      capitalize: false,
      includeNumber: false,
    });
    expect(bits).toBeCloseTo(4 * Math.log2(7776), 5);
  });

  it('grows entropy with length', () => {
    expect(passwordEntropy({ ...base, length: 32 })).toBeGreaterThan(
      passwordEntropy({ ...base, length: 8 }),
    );
  });

  it('rates strength in ascending order', () => {
    expect(rateStrength(20).level).toBe('weak');
    expect(rateStrength(50).level).toBe('fair');
    expect(rateStrength(80).level).toBe('strong');
    expect(rateStrength(140).level).toBe('excellent');
  });

  it('keeps the meter percentage within bounds', () => {
    for (const bits of [0, 10, 45, 64, 100, 200, 400]) {
      const { percent } = rateStrength(bits);
      expect(percent).toBeGreaterThanOrEqual(0);
      expect(percent).toBeLessThanOrEqual(100);
    }
  });

  it('describes crack time as a human-readable string', () => {
    expect(crackTime(1)).toBe('instantly');
    expect(crackTime(256)).toMatch(/years/);
    expect(typeof crackTime(60)).toBe('string');
  });
});
