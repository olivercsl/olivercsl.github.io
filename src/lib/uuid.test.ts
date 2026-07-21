import { describe, it, expect } from 'vitest';
import {
  uuidV4,
  uuidV7,
  uuidV1,
  generate,
  applyFormat,
  isValidUuid,
  NIL_UUID,
  DEFAULT_FORMAT,
} from './uuid';

const CANONICAL = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('uuidV4', () => {
  it('has the canonical shape', () => {
    expect(uuidV4()).toMatch(CANONICAL);
  });

  it('sets version nibble to 4 and RFC variant', () => {
    for (let i = 0; i < 500; i++) {
      const u = uuidV4();
      expect(u[14]).toBe('4'); // version nibble
      expect(['8', '9', 'a', 'b']).toContain(u[19]); // variant high bits 10xx
    }
  });

  it('is unique across many draws', () => {
    const set = new Set(Array.from({ length: 5000 }, () => uuidV4()));
    expect(set.size).toBe(5000);
  });
});

describe('uuidV7', () => {
  it('sets version 7 and RFC variant', () => {
    const u = uuidV7();
    expect(u[14]).toBe('7');
    expect(['8', '9', 'a', 'b']).toContain(u[19]);
  });

  it('embeds the timestamp so later ids sort after earlier ones', () => {
    const early = uuidV7(1_000_000_000_000);
    const late = uuidV7(2_000_000_000_000);
    // First 48 bits are the ms timestamp; string order reflects it.
    expect(late.replace(/-/g, '') > early.replace(/-/g, '')).toBe(true);
  });

  it('round-trips a known timestamp into the first six bytes', () => {
    // 0x0102030405 ms -> first bytes 01 02 03 04 05
    const u = uuidV7(0x010203040506);
    expect(u.replace(/-/g, '').slice(0, 12)).toBe('010203040506');
  });
});

describe('uuidV1', () => {
  it('sets version 1 and RFC variant', () => {
    const u = uuidV1();
    expect(u[14]).toBe('1');
    expect(['8', '9', 'a', 'b']).toContain(u[19]);
  });

  it('sets the multicast bit on the random node id', () => {
    // Node is the last 6 bytes; low bit of its first byte must be 1.
    for (let i = 0; i < 200; i++) {
      const nodeFirstByte = parseInt(uuidV1().replace(/-/g, '').slice(20, 22), 16);
      expect(nodeFirstByte & 0x01).toBe(1);
    }
  });

  it('is stable in shape across a range of timestamps', () => {
    for (const t of [0, 1_000_000_000_000, Date.now()]) {
      expect(uuidV1(t)).toMatch(CANONICAL);
    }
  });
});

describe('generate + nil', () => {
  it('dispatches by version', () => {
    expect(generate('v4')[14]).toBe('4');
    expect(generate('v7')[14]).toBe('7');
    expect(generate('v1')[14]).toBe('1');
    expect(generate('nil')).toBe(NIL_UUID);
  });

  it('nil is all zeros and canonical', () => {
    expect(NIL_UUID).toMatch(CANONICAL);
    expect(NIL_UUID.replace(/[0-]/g, '')).toBe('');
  });
});

describe('applyFormat', () => {
  const sample = 'a1b2c3d4-e5f6-4789-abcd-ef0123456789';

  it('defaults to lowercase, hyphenated, no braces', () => {
    expect(applyFormat(sample, DEFAULT_FORMAT)).toBe(sample);
  });

  it('uppercases', () => {
    expect(applyFormat(sample, { ...DEFAULT_FORMAT, uppercase: true })).toBe(sample.toUpperCase());
  });

  it('strips hyphens', () => {
    expect(applyFormat(sample, { ...DEFAULT_FORMAT, hyphens: false })).toBe(sample.replace(/-/g, ''));
  });

  it('wraps in braces', () => {
    expect(applyFormat(sample, { ...DEFAULT_FORMAT, braces: true })).toBe(`{${sample}}`);
  });

  it('combines options', () => {
    expect(applyFormat(sample, { uppercase: true, hyphens: false, braces: true })).toBe(
      `{${sample.replace(/-/g, '').toUpperCase()}}`,
    );
  });
});

describe('isValidUuid', () => {
  it('accepts generated uuids', () => {
    for (const v of ['v4', 'v7', 'v1', 'nil'] as const) expect(isValidUuid(generate(v))).toBe(true);
  });
  it('rejects malformed input', () => {
    expect(isValidUuid('not-a-uuid')).toBe(false);
    expect(isValidUuid('a1b2c3d4e5f64789abcdef0123456789')).toBe(false); // no hyphens
  });
});
