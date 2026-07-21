import { describe, it, expect } from 'vitest';
import { toSvg, moduleDimension, withinCapacity, DEFAULT_QR_OPTIONS } from './qr';

const opts = DEFAULT_QR_OPTIONS;

describe('toSvg', () => {
  it('produces a well-formed svg', () => {
    const svg = toSvg('https://cloudzeta.solutions', opts);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.trim().endsWith('</svg>')).toBe(true);
    expect(svg).toContain('viewBox="0 0');
  });

  it('applies the chosen colours', () => {
    const svg = toSvg('hello', { ...opts, fg: '#123456', bg: '#abcdef' });
    expect(svg).toContain('fill="#abcdef"'); // background rect
    expect(svg).toContain('fill="#123456"'); // module group
  });

  it('includes the quiet-zone margin in the viewBox', () => {
    const dim = moduleDimension('hello', opts);
    expect(toSvg('hello', opts)).toContain(`viewBox="0 0 ${dim} ${dim}"`);
    // margin is applied on both sides
    const noMargin = moduleDimension('hello', { ...opts, margin: 0 });
    expect(dim).toBe(noMargin + opts.margin * 2);
  });

  it('draws at least one module', () => {
    expect((toSvg('hello', opts).match(/<rect/g) ?? []).length).toBeGreaterThan(1);
  });

  it('grows the matrix as more data is encoded', () => {
    const small = moduleDimension('a', opts);
    const large = moduleDimension('a'.repeat(400), opts);
    expect(large).toBeGreaterThan(small);
  });

  it('is deterministic for the same input', () => {
    expect(toSvg('cloudzeta', opts)).toBe(toSvg('cloudzeta', opts));
  });
});

describe('withinCapacity', () => {
  it('accepts normal input', () => {
    expect(withinCapacity('https://cloudzeta.solutions/tools/qr-code-generator', 'M')).toBe(true);
  });

  it('rejects input beyond a single QR symbol', () => {
    expect(withinCapacity('x'.repeat(3000), 'H')).toBe(false);
    expect(withinCapacity('x'.repeat(3000), 'M')).toBe(false);
  });

  it('allows more data at lower error correction', () => {
    const text = 'x'.repeat(1300);
    expect(withinCapacity(text, 'L')).toBe(true);
    expect(withinCapacity(text, 'H')).toBe(false);
  });

  it('counts bytes, not characters, for multibyte input', () => {
    // Each emoji is 4 UTF-8 bytes; 800 of them exceed H's 1273-byte budget.
    expect(withinCapacity('😀'.repeat(800), 'H')).toBe(false);
  });
});
