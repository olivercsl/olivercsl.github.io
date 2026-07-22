/**
 * DNS cutover timeline math. Pure functions, no dependencies.
 *
 * The rule the plan encodes: resolvers cache a record for up to its TTL, so a
 * TTL change only takes full effect after the OLD TTL has elapsed. To cut over
 * quickly you lower the TTL at least one old-TTL before the switch, flip the
 * record, wait out the LOW TTL, then restore a normal TTL once verified.
 */

export interface CutoverPlan {
  /** When to lower the TTL (ms epoch). */
  lowerTtlAt: number;
  /** The cutover instant itself (ms epoch). */
  cutoverAt: number;
  /** When effectively all resolvers see the new record (ms epoch). */
  fullyPropagatedAt: number;
  /** Earliest sensible time to raise the TTL back up (ms epoch). */
  restoreTtlAt: number;
  /** Worst-case time a client could still hit the old target, in seconds. */
  worstCaseStaleSeconds: number;
  /** Rollback stays this fast (seconds) while the low TTL is in force. */
  rollbackWindowSeconds: number;
}

export function cutoverPlan(
  cutoverAtMs: number,
  currentTtlSeconds: number,
  loweredTtlSeconds: number,
  /** How long to observe the new target before restoring the TTL. */
  verifySeconds = 3600,
): CutoverPlan | null {
  if (
    !Number.isFinite(cutoverAtMs) ||
    currentTtlSeconds <= 0 ||
    loweredTtlSeconds <= 0 ||
    loweredTtlSeconds > currentTtlSeconds
  ) {
    return null;
  }
  return {
    lowerTtlAt: cutoverAtMs - currentTtlSeconds * 1000,
    cutoverAt: cutoverAtMs,
    fullyPropagatedAt: cutoverAtMs + loweredTtlSeconds * 1000,
    restoreTtlAt: cutoverAtMs + Math.max(loweredTtlSeconds, verifySeconds) * 1000,
    worstCaseStaleSeconds: loweredTtlSeconds,
    rollbackWindowSeconds: loweredTtlSeconds,
  };
}

/** "1h", "5m", "30s" style rendering for TTL values. */
export function formatTtl(seconds: number): string {
  if (seconds % 86_400 === 0 && seconds >= 86_400) return `${seconds / 86_400}d`;
  if (seconds % 3_600 === 0 && seconds >= 3_600) return `${seconds / 3_600}h`;
  if (seconds % 60 === 0 && seconds >= 60) return `${seconds / 60}m`;
  return `${seconds}s`;
}

export const COMMON_TTLS = [
  { seconds: 60, label: '60s, cutover-ready' },
  { seconds: 300, label: '5m, common low' },
  { seconds: 3600, label: '1h, typical' },
  { seconds: 14400, label: '4h' },
  { seconds: 86400, label: '24h, conservative' },
] as const;
