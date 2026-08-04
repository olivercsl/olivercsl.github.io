/**
 * Retry and exponential backoff arithmetic.
 *
 * Two questions this answers. How long does a retry sequence actually take
 * before it gives up, which decides whether a caller's timeout fires first.
 * And how much load does retrying add to a service that is already failing,
 * which is the mechanism behind most retry storms.
 *
 * Jitter strategies follow the AWS architecture blog's naming: full jitter
 * spreads a retry anywhere in the window, equal jitter keeps half the delay
 * fixed. Expected values are given rather than samples, since a planner wants
 * the average case, not one roll of the dice.
 */

export type JitterMode = 'none' | 'full' | 'equal';

export const JITTER_MODES: { id: JitterMode; label: string; blurb: string }[] = [
  { id: 'none', label: 'None', blurb: 'Every client retries at the same moment.' },
  { id: 'full', label: 'Full', blurb: 'Delay is random between zero and the cap.' },
  { id: 'equal', label: 'Equal', blurb: 'Half the delay fixed, half random.' },
];

export interface BackoffOptions {
  /** Delay before the first retry, in milliseconds. */
  baseMs: number;
  /** Each retry waits this many times longer. 2 doubles each attempt. */
  multiplier: number;
  /** Number of retries after the initial attempt. */
  retries: number;
  /** Upper bound on any single delay, in milliseconds. */
  capMs: number;
  jitter: JitterMode;
}

export interface Attempt {
  /** 1 is the first retry. The initial call is not counted here. */
  attempt: number;
  /** Delay before this retry with no jitter applied. */
  rawMs: number;
  /** Delay after the cap. */
  cappedMs: number;
  /** Expected delay once jitter is accounted for. */
  expectedMs: number;
  /** Cumulative expected time since the initial failure. */
  elapsedMs: number;
}

/** Expected value of the delay under each jitter strategy. */
function expectedWithJitter(delayMs: number, jitter: JitterMode): number {
  switch (jitter) {
    case 'none':
      return delayMs;
    case 'full':
      return delayMs / 2; // uniform over [0, delay]
    case 'equal':
      return delayMs * 0.75; // half fixed, plus uniform over [0, delay/2]
  }
}

export function backoffSchedule(opts: BackoffOptions): Attempt[] {
  const attempts: Attempt[] = [];
  let elapsed = 0;

  for (let i = 0; i < Math.max(0, Math.trunc(opts.retries)); i++) {
    const raw = opts.baseMs * Math.pow(opts.multiplier, i);
    const capped = Math.min(raw, opts.capMs);
    const expected = expectedWithJitter(capped, opts.jitter);
    elapsed += expected;
    attempts.push({
      attempt: i + 1,
      rawMs: raw,
      cappedMs: capped,
      expectedMs: expected,
      elapsedMs: elapsed,
    });
  }
  return attempts;
}

export interface BackoffSummary {
  attempts: Attempt[];
  /** Expected total wait before the final failure is surfaced. */
  totalExpectedMs: number;
  /** Worst case, where every jittered delay lands at its maximum. */
  totalWorstMs: number;
  /** Total calls made per logical request, including the initial one. */
  callsPerRequest: number;
  /**
   * Load multiplier on a fully failing dependency. Every attempt fails, so
   * every retry becomes another request.
   */
  loadMultiplier: number;
}

export function summarize(opts: BackoffOptions): BackoffSummary {
  const attempts = backoffSchedule(opts);
  const totalExpectedMs = attempts.reduce((n, a) => n + a.expectedMs, 0);
  const totalWorstMs = attempts.reduce((n, a) => n + a.cappedMs, 0);
  const callsPerRequest = attempts.length + 1;
  return {
    attempts,
    totalExpectedMs,
    totalWorstMs,
    callsPerRequest,
    loadMultiplier: callsPerRequest,
  };
}

/** Requests per second arriving at a failing dependency, given retries. */
export function amplifiedLoad(baseRps: number, callsPerRequest: number): number {
  return baseRps * callsPerRequest;
}

export function formatMs(ms: number): string {
  if (!Number.isFinite(ms)) return 'never';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) {
    const s = ms / 1000;
    return `${s < 10 ? s.toFixed(1) : Math.round(s)}s`;
  }
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return s ? `${m}m ${s}s` : `${m}m`;
}
