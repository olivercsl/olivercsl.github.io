import { describe, it, expect } from 'vitest';
import {
  PERIODS,
  downtimeSeconds,
  compositeAvailability,
  redundantAvailability,
  errorBudget,
  formatDuration,
  ninesLabel,
} from './sla';

describe('downtimeSeconds', () => {
  it('computes the canonical nines table', () => {
    // 99.9% of a year allows ~8h 46m (with the 365.25d year)
    expect(downtimeSeconds(99.9, PERIODS.year)).toBeCloseTo(31_557.6, 0);
    // 99.99% of a year: ~52.6 minutes
    expect(downtimeSeconds(99.99, PERIODS.year)).toBeCloseTo(3_155.76, 0);
    // 99.9% of a month: ~43.8 minutes
    expect(downtimeSeconds(99.9, PERIODS.month)).toBeCloseTo(2_629.8, 0);
    // 100% means zero downtime
    expect(downtimeSeconds(100, PERIODS.year)).toBe(0);
  });

  it('clamps nonsense percentages', () => {
    expect(downtimeSeconds(150, PERIODS.day)).toBe(0);
    expect(downtimeSeconds(-5, PERIODS.day)).toBe(PERIODS.day);
    expect(downtimeSeconds(NaN, PERIODS.day)).toBe(PERIODS.day);
  });
});

describe('compositeAvailability', () => {
  it('multiplies a serial chain', () => {
    expect(compositeAvailability([99.9, 99.9])).toBeCloseTo(99.8001, 4);
    expect(compositeAvailability([99.95, 99.9, 99.99])).toBeCloseTo(99.84006, 3);
  });

  it('is the identity for a single service', () => {
    expect(compositeAvailability([99.5])).toBeCloseTo(99.5, 10);
  });

  it('a chain is never better than its weakest link', () => {
    const chain = compositeAvailability([99.99, 99.9, 99.999]);
    expect(chain).toBeLessThan(99.9);
  });
});

describe('redundantAvailability', () => {
  it('two independent 99% instances give four nines', () => {
    expect(redundantAvailability([99, 99])).toBeCloseTo(99.99, 6);
  });

  it('redundancy is never worse than the best instance', () => {
    expect(redundantAvailability([99.9, 95])).toBeGreaterThan(99.9);
  });
});

describe('errorBudget', () => {
  it('reports remaining budget and burn rate', () => {
    // 99.9% monthly budget is ~2629.8s; using 1314.9s burns half
    const b = errorBudget(99.9, 'month', 1314.9);
    expect(b.allowedSeconds).toBeCloseTo(2629.8, 1);
    expect(b.remainingSeconds).toBeCloseTo(1314.9, 1);
    expect(b.burnedPercent).toBeCloseTo(50, 1);
  });

  it('goes past 100% when the budget is blown', () => {
    const b = errorBudget(99.99, 'month', 10_000);
    expect(b.remainingSeconds).toBeLessThan(0);
    expect(b.burnedPercent).toBeGreaterThan(100);
  });

  it('treats negative used time as zero', () => {
    expect(errorBudget(99.9, 'month', -50).usedSeconds).toBe(0);
  });
});

describe('formatDuration', () => {
  it('renders two significant units', () => {
    expect(formatDuration(316_224)).toBe('3d 15h');
    expect(formatDuration(3_156)).toBe('52m 36s');
    expect(formatDuration(45)).toBe('45s');
  });

  it('keeps a decimal below one second', () => {
    expect(formatDuration(0.86)).toBe('0.9s');
  });

  it('marks negative durations', () => {
    expect(formatDuration(-90)).toBe('-1m 30s');
  });
});

describe('ninesLabel', () => {
  it('names the common tiers', () => {
    expect(ninesLabel(99.9)).toBe('three nines');
    expect(ninesLabel(99.999)).toBe('five nines');
    expect(ninesLabel(98.7)).toBeNull();
  });
});
