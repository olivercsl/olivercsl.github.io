import { describe, it, expect } from 'vitest';
import { backoffSchedule, summarize, amplifiedLoad, formatMs } from './backoff';
import { costTable, incidentCost, hourlyFromAnnual, formatMoney } from './downtimecost';
import { analyzeBudget, rttFloorMs } from './latencybudget';

describe('backoff', () => {
  const base = { baseMs: 100, multiplier: 2, retries: 5, capMs: 30_000, jitter: 'none' as const };

  it('doubles each attempt', () => {
    const s = backoffSchedule(base);
    expect(s.map((a) => a.cappedMs)).toEqual([100, 200, 400, 800, 1600]);
  });

  it('accumulates elapsed time', () => {
    const s = backoffSchedule(base);
    expect(s[s.length - 1]!.elapsedMs).toBe(3100);
  });

  it('applies the cap', () => {
    const s = backoffSchedule({ ...base, capMs: 500 });
    expect(s.map((a) => a.cappedMs)).toEqual([100, 200, 400, 500, 500]);
    // the raw value keeps growing even when the capped one does not
    expect(s[4]!.rawMs).toBe(1600);
  });

  it('halves expected delay under full jitter', () => {
    const s = backoffSchedule({ ...base, jitter: 'full' });
    expect(s.map((a) => a.expectedMs)).toEqual([50, 100, 200, 400, 800]);
  });

  it('uses three quarters under equal jitter', () => {
    const s = backoffSchedule({ ...base, jitter: 'equal' });
    expect(s[0]!.expectedMs).toBe(75);
  });

  it('counts the initial call in the load multiplier', () => {
    const s = summarize(base);
    expect(s.callsPerRequest).toBe(6); // 1 initial + 5 retries
    expect(s.loadMultiplier).toBe(6);
  });

  it('reports worst case above expected when jittered', () => {
    const s = summarize({ ...base, jitter: 'full' });
    expect(s.totalWorstMs).toBeGreaterThan(s.totalExpectedMs);
  });

  it('handles zero retries', () => {
    const s = summarize({ ...base, retries: 0 });
    expect(s.attempts).toEqual([]);
    expect(s.callsPerRequest).toBe(1);
    expect(s.totalExpectedMs).toBe(0);
  });

  it('amplifies load by the call count', () => {
    expect(amplifiedLoad(1000, 6)).toBe(6000);
  });

  it('formats durations', () => {
    expect(formatMs(250)).toBe('250ms');
    expect(formatMs(1500)).toBe('1.5s');
    expect(formatMs(45_000)).toBe('45s');
    expect(formatMs(125_000)).toBe('2m 5s');
    expect(formatMs(120_000)).toBe('2m');
  });
});

describe('downtime cost', () => {
  it('prices the downtime each tier allows', () => {
    // 99.9% of a year is about 8.766 hours, so at $1000/h that is about $8766
    const rows = costTable(1000, 'year');
    const three9s = rows.find((r) => r.percent === 99.9)!;
    expect(three9s.cost).toBeGreaterThan(8000);
    expect(three9s.cost).toBeLessThan(9000);
  });

  it('shows the saving against the tier directly below', () => {
    const rows = costTable(1000, 'year');
    const byTier = new Map(rows.map((r) => [r.percent, r]));
    // 99.95 allows about 4.38 hours against 99.9's 8.77, so half the cost
    expect(byTier.get(99.95)!.savingVsPrevious).toBeCloseTo(
      byTier.get(99.9)!.cost - byTier.get(99.95)!.cost,
      6
    );
    expect(byTier.get(99.95)!.savingVsPrevious).toBeGreaterThan(4000);
  });

  it('leaves the first tier without a comparison', () => {
    expect(costTable(1000, 'year')[0]!.savingVsPrevious).toBeNull();
  });

  it('costs a single incident', () => {
    expect(incidentCost(3600, 30)).toBe(1800);
    expect(incidentCost(1000, 0)).toBe(0);
  });

  it('treats negative inputs as zero', () => {
    expect(incidentCost(-500, 60)).toBe(0);
    expect(costTable(-100, 'year')[0]!.cost).toBe(0);
  });

  it('derives an hourly figure from an annual one', () => {
    // 8766 hours in a 365.25 day year
    expect(hourlyFromAnnual(8_766_000)).toBeCloseTo(1000, 0);
  });

  it('formats money', () => {
    expect(formatMoney(1234.5)).toBe('$1,235');
    expect(formatMoney(12.34)).toBe('$12.34');
  });
});

describe('latency budget', () => {
  const items = [
    { id: 1, name: 'Gateway', ms: 20 },
    { id: 2, name: 'Service', ms: 60 },
    { id: 3, name: 'Database', ms: 40 },
  ];

  it('sums allocations and reports the remainder', () => {
    const a = analyzeBudget(200, items);
    expect(a.totalAllocated).toBe(120);
    expect(a.remaining).toBe(80);
    expect(a.overBudget).toBe(false);
    expect(a.usedPercent).toBe(60);
  });

  it('flags an exceeded budget', () => {
    const a = analyzeBudget(100, items);
    expect(a.overBudget).toBe(true);
    expect(a.remaining).toBe(-20);
  });

  it('ranks components by share, largest first', () => {
    const a = analyzeBudget(200, items);
    expect(a.shares.map((s) => s.name)).toEqual(['Service', 'Database', 'Gateway']);
    expect(a.largest!.name).toBe('Service');
    expect(a.shares[0]!.percent).toBe(30);
  });

  it('ignores zero and invalid allocations', () => {
    const a = analyzeBudget(100, [...items, { id: 4, name: 'Empty', ms: 0 }]);
    expect(a.shares.length).toBe(3);
  });

  it('names unnamed components', () => {
    expect(analyzeBudget(100, [{ id: 1, name: '  ', ms: 10 }]).shares[0]!.name).toBe('Unnamed');
  });

  it('computes the physics floor for a round trip', () => {
    // Sydney to Los Angeles is roughly 12,000 km, so a round trip cannot
    // beat about 120ms however good the network is
    const floor = rttFloorMs(12_000);
    expect(floor).toBeGreaterThan(110);
    expect(floor).toBeLessThan(130);
  });

  it('scales the floor linearly with distance', () => {
    expect(rttFloorMs(2000)).toBeCloseTo(rttFloorMs(1000) * 2, 6);
  });
});
