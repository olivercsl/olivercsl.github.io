import { describe, it, expect } from 'vitest';
import { parseQuantity, findings, formatCpu, formatMemory } from './k8sunits';

const q = (s: string) => parseQuantity(s)!;
const levels = (s: string, kind: 'cpu' | 'memory') => findings(q(s), kind).map((f) => f.level);

describe('parsing', () => {
  it('reads binary memory suffixes as powers of 1024', () => {
    expect(q('128Mi').value).toBe(134_217_728);
    expect(q('1Gi').value).toBe(1_073_741_824);
    expect(q('512Ki').value).toBe(524_288);
  });

  it('reads decimal suffixes as powers of 1000', () => {
    expect(q('128M').value).toBe(128_000_000);
    expect(q('1G').value).toBe(1_000_000_000);
  });

  it('reads millicores', () => {
    expect(q('500m').value).toBe(0.5);
    expect(q('1.5').value).toBe(1.5);
  });

  it('reads scientific notation', () => {
    const e = q('129e6');
    expect(e.value).toBe(129_000_000);
    expect(e.format).toBe('exponent');
  });

  it('tells Mi from M rather than misreading the i', () => {
    expect(q('1Mi').format).toBe('binary');
    expect(q('1M').format).toBe('decimal');
  });

  it('rejects the spellings the API server rejects', () => {
    for (const bad of ['128MB', '1GB', '1GiB', '10K', 'abc', '', 'Mi']) {
      expect(parseQuantity(bad)).toBeNull();
    }
  });
});

describe('memory findings', () => {
  it('flags memory written in millibytes as an error', () => {
    const f = findings(q('128m'), 'memory');
    expect(f[0]!.level).toBe('error');
    expect(f[0]!.message).toMatch(/0\.128 bytes/);
    expect(f[0]!.message).toMatch(/128Mi/);
  });

  it('notes how much smaller a decimal suffix is', () => {
    expect(findings(q('1G'), 'memory')[0]!.message).toMatch(/6\.9% smaller than 1Gi/);
    expect(findings(q('128M'), 'memory')[0]!.message).toMatch(/4\.6% smaller than 128Mi/);
  });

  it('says nothing about a sensible binary value', () => {
    expect(findings(q('512Mi'), 'memory')).toEqual([]);
  });

  it('warns when memory is implausibly small', () => {
    expect(levels('100', 'memory')).toContain('warn');
    expect(levels('512Ki', 'memory')).toContain('warn');
  });

  it('rejects negative quantities', () => {
    expect(levels('-1Gi', 'memory')).toContain('error');
  });
});

describe('cpu findings', () => {
  it('accepts ordinary millicore and core values silently', () => {
    expect(findings(q('500m'), 'cpu')).toEqual([]);
    expect(findings(q('2'), 'cpu')).toEqual([]);
  });

  it('warns about precision finer than 1m and says where it rounds to', () => {
    expect(findings(q('1.2345'), 'cpu')[0]!.message).toMatch(/1235m/);
    expect(levels('0.0005', 'cpu')).toContain('warn');
  });

  it('flags a memory suffix used on CPU', () => {
    expect(levels('1Gi', 'cpu')).toContain('error');
  });
});

describe('formatting', () => {
  it('formats CPU as millicores and cores, rounding up', () => {
    expect(formatCpu(0.5)).toEqual({ millicores: '500m', cores: '0.5' });
    expect(formatCpu(1.2345)).toEqual({ millicores: '1235m', cores: '1.235' });
    expect(formatCpu(0.0005)).toEqual({ millicores: '1m', cores: '0.001' });
  });

  it('formats memory in both families', () => {
    expect(formatMemory(134_217_728)).toEqual({ binary: '128Mi', decimal: '134.22M', bytes: '134,217,728' });
    expect(formatMemory(1_000_000_000)).toEqual({ binary: '953.67Mi', decimal: '1G', bytes: '1,000,000,000' });
  });

  it('keeps the sign on a negative value', () => {
    expect(formatMemory(-1_073_741_824).binary).toBe('-1Gi');
  });
});
