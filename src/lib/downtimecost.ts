/**
 * Downtime expressed in money rather than minutes.
 *
 * The arithmetic is trivial. The point of the tool is the comparison table:
 * seeing that the step from 99.9% to 99.99% is worth a specific number per
 * year turns an availability target from an engineering preference into a
 * budget decision.
 *
 * Deliberately excluded: reputation damage, SLA credits owed to customers,
 * staff time during incidents, and the fact that outages rarely land at quiet
 * hours. All are real, none can be estimated honestly from two inputs, so the
 * figures here are a floor rather than a forecast.
 */
import { PERIODS, downtimeSeconds, type PeriodKey } from './sla';

export const COMPARISON_TIERS = [99, 99.5, 99.9, 99.95, 99.99, 99.999] as const;

/** Revenue per hour implied by an annual figure. */
export function hourlyFromAnnual(annualRevenue: number): number {
  return annualRevenue / (PERIODS.year / 3600);
}

export interface CostRow {
  percent: number;
  downtimeSeconds: number;
  cost: number;
  /** Money saved per period by moving up from the previous tier. */
  savingVsPrevious: number | null;
}

/**
 * Cost of the downtime each availability tier permits over a period.
 * hourlyCost is revenue or loss per hour of outage.
 */
export function costTable(hourlyCost: number, period: PeriodKey): CostRow[] {
  const rows: CostRow[] = [];
  let previousCost: number | null = null;

  for (const percent of COMPARISON_TIERS) {
    const seconds = downtimeSeconds(percent, PERIODS[period]);
    const cost = (seconds / 3600) * Math.max(0, hourlyCost);
    rows.push({
      percent,
      downtimeSeconds: seconds,
      cost,
      savingVsPrevious: previousCost === null ? null : previousCost - cost,
    });
    previousCost = cost;
  }
  return rows;
}

/** Cost of a single incident of a given duration. */
export function incidentCost(hourlyCost: number, minutes: number): number {
  return (Math.max(0, minutes) / 60) * Math.max(0, hourlyCost);
}

export function formatMoney(n: number, currency = 'USD'): string {
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: n < 100 ? 2 : 0,
  });
}
