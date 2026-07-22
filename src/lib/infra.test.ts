import { describe, it, expect } from 'vitest';
import { toBytes, toBitsPerSecond, transferSeconds, formatSeconds, sizeBreakdown } from './bandwidth';
import { parseNumbers, percentile, latencyStats, littlesLaw, rateBreakdown } from './capacity';
import { cutoverPlan, formatTtl } from './dnsttl';
import { qosClass, qosFindings } from './k8sqos';
import { PORTS, searchPorts } from './ports';

describe('bandwidth', () => {
  it('converts sizes, decimal and binary', () => {
    expect(toBytes(1, 'GB')).toBe(1e9);
    expect(toBytes(1, 'GiB')).toBe(1073741824);
    expect(toBytes(10, 'TB')).toBe(1e13);
  });

  it('converts rates, including byte rates', () => {
    expect(toBitsPerSecond(100, 'Mbps')).toBe(1e8);
    expect(toBitsPerSecond(1, 'GB/s')).toBe(8e9);
  });

  it('computes the canonical example: 10 TB over 1 Gbps is about 22 hours', () => {
    const s = transferSeconds(toBytes(10, 'TB'), toBitsPerSecond(1, 'Gbps'));
    expect(s).toBeCloseTo(80_000, 0);
    expect(formatSeconds(s)).toBe('22h 13m');
  });

  it('applies protocol efficiency', () => {
    const line = transferSeconds(1e9, 1e9, 100);
    const real = transferSeconds(1e9, 1e9, 80);
    expect(real).toBeCloseTo(line / 0.8, 6);
  });

  it('never divides by zero', () => {
    expect(transferSeconds(1e9, 0)).toBe(Infinity);
    expect(formatSeconds(Infinity)).toBe('never');
  });

  it('breaks a size into every unit', () => {
    const b = sizeBreakdown(1e9);
    expect(b.GB).toBe(1);
    expect(b.GiB).toBeCloseTo(0.9313, 3);
  });
});

describe('capacity', () => {
  it('parses messy number lists', () => {
    expect(parseNumbers('12, 15  18\n21;24')).toEqual([12, 15, 18, 21, 24]);
    expect(parseNumbers('a b c')).toEqual([]);
  });

  it('computes interpolated percentiles', () => {
    const sorted = [10, 20, 30, 40, 50];
    expect(percentile(sorted, 50)).toBe(30);
    expect(percentile(sorted, 0)).toBe(10);
    expect(percentile(sorted, 100)).toBe(50);
    expect(percentile(sorted, 75)).toBe(40);
  });

  it('summarises latency samples', () => {
    const s = latencyStats([100, 100, 100, 100, 100, 100, 100, 100, 100, 1000])!;
    expect(s.count).toBe(10);
    expect(s.p50).toBe(100);
    expect(s.max).toBe(1000);
    expect(s.tailRatio).toBeGreaterThan(5);
  });

  it('solves Little\'s Law for each unknown', () => {
    expect(littlesLaw({ lambda: 100, w: 0.25 })).toEqual({ l: 25, lambda: 100, w: 0.25 });
    expect(littlesLaw({ l: 25, w: 0.25 })).toEqual({ l: 25, lambda: 100, w: 0.25 });
    expect(littlesLaw({ l: 25, lambda: 100 })).toEqual({ l: 25, lambda: 100, w: 0.25 });
    expect(littlesLaw({ l: 25 })).toBeNull();
  });

  it('breaks a rate into windows', () => {
    const r = rateBreakdown(10);
    expect(r.minute).toBe(600);
    expect(r.day).toBe(864_000);
  });
});

describe('dns ttl planner', () => {
  const cutover = Date.UTC(2026, 7, 1, 10, 0, 0);

  it('schedules the TTL drop one old-TTL before cutover', () => {
    const p = cutoverPlan(cutover, 86_400, 300)!;
    expect(p.lowerTtlAt).toBe(cutover - 86_400_000);
    expect(p.fullyPropagatedAt).toBe(cutover + 300_000);
    expect(p.worstCaseStaleSeconds).toBe(300);
  });

  it('keeps the verify window before restoring the TTL', () => {
    const p = cutoverPlan(cutover, 3600, 60, 7200)!;
    expect(p.restoreTtlAt).toBe(cutover + 7_200_000);
  });

  it('rejects a lowered TTL above the current one', () => {
    expect(cutoverPlan(cutover, 300, 3600)).toBeNull();
  });

  it('formats TTLs in natural units', () => {
    expect(formatTtl(86_400)).toBe('1d');
    expect(formatTtl(3600)).toBe('1h');
    expect(formatTtl(300)).toBe('5m');
    expect(formatTtl(45)).toBe('45s');
  });
});

describe('kubernetes qos', () => {
  it('classifies Guaranteed', () => {
    expect(qosClass([{ cpuRequest: 500, cpuLimit: 500, memRequest: 512, memLimit: 512 }])).toBe('Guaranteed');
  });

  it('classifies BestEffort', () => {
    expect(qosClass([{}])).toBe('BestEffort');
  });

  it('classifies Burstable when limits exceed requests', () => {
    expect(qosClass([{ cpuRequest: 250, cpuLimit: 1000, memRequest: 256, memLimit: 512 }])).toBe('Burstable');
  });

  it('one non-guaranteed container makes the whole pod Burstable', () => {
    expect(
      qosClass([
        { cpuRequest: 500, cpuLimit: 500, memRequest: 512, memLimit: 512 },
        { cpuRequest: 100 },
      ]),
    ).toBe('Burstable');
  });

  it('flags a missing memory limit as a risk', () => {
    const f = qosFindings([{ cpuRequest: 500, memRequest: 512 }]);
    expect(f.some((x) => x.severity === 'risk' && x.message.includes('memory limit'))).toBe(true);
  });
});

describe('ports', () => {
  it('has unique port+proto entries', () => {
    const seen = new Set(PORTS.map((p) => `${p.port}/${p.proto}`));
    expect(seen.size).toBe(PORTS.length);
  });

  it('searches by number prefix, service, and note', () => {
    expect(searchPorts('54').some((p) => p.port === 5432)).toBe(true);
    expect(searchPorts('postgres')[0]!.port).toBe(5432);
    expect(searchPorts('kubernetes').some((p) => p.port === 6443)).toBe(true);
    expect(searchPorts('').length).toBe(PORTS.length);
  });
});
