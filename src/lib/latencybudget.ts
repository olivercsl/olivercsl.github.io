/**
 * Splitting an end to end latency target across the components that consume it.
 *
 * Serial addition is the model here, because a request that passes through a
 * gateway, a service and a database waits for each in turn. That is the right
 * model for a budget, with one caveat worth stating plainly on the page:
 * percentile latencies do not add. Two components with 100ms p99 each do not
 * produce a 200ms p99, since both are rarely slow on the same request. Adding
 * them is conservative, which is what you want when allocating, but it is not
 * a prediction of the measured figure.
 */

export interface BudgetItem {
  id: number;
  name: string;
  /** Allocated milliseconds. */
  ms: number;
}

export interface BudgetAnalysis {
  totalAllocated: number;
  remaining: number;
  /** Above 100 means the budget is exceeded. */
  usedPercent: number;
  overBudget: boolean;
  /** Share of the total budget each item takes, largest first. */
  shares: { name: string; ms: number; percent: number }[];
  /** The item consuming the most, which is where optimisation pays. */
  largest: { name: string; ms: number } | null;
}

export function analyzeBudget(budgetMs: number, items: BudgetItem[]): BudgetAnalysis {
  const valid = items.filter((i) => Number.isFinite(i.ms) && i.ms > 0);
  const totalAllocated = valid.reduce((n, i) => n + i.ms, 0);
  const budget = Math.max(0, budgetMs);

  const shares = valid
    .map((i) => ({
      name: i.name.trim() || 'Unnamed',
      ms: i.ms,
      percent: budget > 0 ? (i.ms / budget) * 100 : 0,
    }))
    .sort((a, b) => b.ms - a.ms);

  return {
    totalAllocated,
    remaining: budget - totalAllocated,
    usedPercent: budget > 0 ? (totalAllocated / budget) * 100 : 0,
    overBudget: totalAllocated > budget,
    shares,
    largest: shares.length ? { name: shares[0]!.name, ms: shares[0]!.ms } : null,
  };
}

/**
 * Round trip time floor imposed by physics for a given distance.
 * Light in fibre travels at roughly two thirds of c, and a round trip covers
 * the distance twice.
 */
export function rttFloorMs(distanceKm: number): number {
  const kmPerMs = 299_792.458 / 1000 * (2 / 3); // about 200 km per ms
  return (distanceKm * 2) / kmPerMs;
}
