/**
 * Capacity-planning math: latency percentiles, Little's Law, and request-rate
 * conversions. Pure functions, no dependencies.
 */

/** Parse free-form numbers: whitespace, commas, or newlines between values. */
export function parseNumbers(input: string): number[] {
  return input
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isFinite(n));
}

/**
 * Percentile by linear interpolation between closest ranks (the common
 * definition used by numpy and most monitoring systems). p in [0, 100].
 */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  if (sorted.length === 1) return sorted[0]!;
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (rank - lo);
}

export interface LatencyStats {
  count: number;
  min: number;
  max: number;
  mean: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  p999: number;
  /** p99 divided by p50; a long tail shows up as a large ratio. */
  tailRatio: number;
}

export function latencyStats(values: number[]): LatencyStats | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const p50 = percentile(sorted, 50);
  const p99 = percentile(sorted, 99);
  return {
    count: sorted.length,
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    mean: sum / sorted.length,
    p50,
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    p99,
    p999: percentile(sorted, 99.9),
    tailRatio: p50 > 0 ? p99 / p50 : Infinity,
  };
}

/**
 * Little's Law: L = lambda x W.
 * Concurrency = arrival rate x time in system. Given any two, the third
 * follows. Units: lambda in requests/second, w in seconds, l dimensionless.
 */
export function littlesLaw(known: { l?: number; lambda?: number; w?: number }): {
  l: number;
  lambda: number;
  w: number;
} | null {
  const { l, lambda, w } = known;
  const have = [l, lambda, w].filter((v) => v !== undefined && Number.isFinite(v)).length;
  if (have < 2) return null;
  if (l === undefined) return { l: lambda! * w!, lambda: lambda!, w: w! };
  if (lambda === undefined) return w === 0 ? null : { l, lambda: l / w!, w: w! };
  return lambda === 0 ? null : { l, lambda, w: l / lambda };
}

/** Requests per second expressed across common reporting windows. */
export function rateBreakdown(rps: number): { second: number; minute: number; hour: number; day: number; month: number } {
  return {
    second: rps,
    minute: rps * 60,
    hour: rps * 3600,
    day: rps * 86_400,
    month: rps * 86_400 * 30.44,
  };
}
