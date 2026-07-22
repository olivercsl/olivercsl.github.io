import React, { useState, useEffect } from 'react';
import {
  PERIODS,
  COMMON_TARGETS,
  downtimeSeconds,
  compositeAvailability,
  errorBudget,
  formatDuration,
  ninesLabel,
  type PeriodKey,
} from '../../lib/sla';

const DISPLAY_PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'day', label: 'Per day' },
  { key: 'week', label: 'Per week' },
  { key: 'month', label: 'Per month' },
  { key: 'quarter', label: 'Per quarter' },
  { key: 'year', label: 'Per year' },
];

const fmtPercent = (p: number) => {
  if (!Number.isFinite(p)) return '0';
  const s = p.toFixed(5);
  return s.replace(/0+$/, '').replace(/\.$/, '');
};

let rowSeq = 0;

export const SlaCalculator = () => {
  // Section 1: single SLA -> downtime table
  const [target, setTarget] = useState(99.9);
  const [targetInput, setTargetInput] = useState('99.9');

  // Section 2: composite chain
  const [chain, setChain] = useState<{ id: number; name: string; value: string }[]>([
    { id: rowSeq++, name: '', value: '99.99' },
    { id: rowSeq++, name: '', value: '99.9' },
  ]);
  const [toast, setToast] = useState<string | null>(null);

  // Section 3: error budget
  const [budgetTarget, setBudgetTarget] = useState('99.9');
  const [budgetPeriod, setBudgetPeriod] = useState<PeriodKey>('month');
  const [usedMinutes, setUsedMinutes] = useState('0');

  const applyTarget = (raw: string) => {
    setTargetInput(raw);
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0 && n <= 100) setTarget(n);
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const serviceName = (row: { name: string }, i: number) => row.name.trim() || `Service ${i + 1}`;

  /** Everything on screen, as a spreadsheet the user can keep. */
  const downloadCsv = () => {
    const esc = (v: string | number) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const line = (...cells: (string | number)[]) => cells.map(esc).join(',');

    const rows: string[] = [];
    rows.push(line('SLA target', `${fmtPercent(target)}%`));
    rows.push(line('Period', 'Allowed downtime', 'Seconds'));
    for (const p of DISPLAY_PERIODS) {
      const s = downtimeSeconds(target, PERIODS[p.key]);
      rows.push(line(p.label, formatDuration(s), Math.round(s)));
    }
    rows.push('');
    rows.push(line('Dependency chain'));
    rows.push(line('Service', 'Availability %'));
    chain.forEach((r, i) => {
      const n = Number(r.value);
      if (Number.isFinite(n) && n > 0 && n <= 100) rows.push(line(serviceName(r, i), r.value));
    });
    rows.push(line('Effective availability', `${fmtPercent(chainResult)}%`));
    rows.push(line('Downtime per year', formatDuration(downtimeSeconds(chainResult, PERIODS.year))));
    rows.push('');
    rows.push(line('Error budget'));
    rows.push(line('Target', `${budgetTarget}%`));
    rows.push(line('Period', budgetPeriod));
    rows.push(line('Budget', formatDuration(budget.allowedSeconds), Math.round(budget.allowedSeconds)));
    rows.push(line('Used', formatDuration(budget.usedSeconds), Math.round(budget.usedSeconds)));
    rows.push(line('Remaining', formatDuration(budget.remainingSeconds), Math.round(budget.remainingSeconds)));
    rows.push(line('Burned', `${Math.round(budget.burnedPercent)}%`));

    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sla-calculation.csv';
    a.click();
    URL.revokeObjectURL(url);
    setToast('CSV downloaded');
  };

  const chainValues = chain
    .map((r) => Number(r.value))
    .filter((n) => Number.isFinite(n) && n > 0 && n <= 100);
  const chainResult = compositeAvailability(chainValues);

  const budget = errorBudget(
    Math.min(100, Math.max(0, Number(budgetTarget) || 0)),
    budgetPeriod,
    (Number(usedMinutes) || 0) * 60,
  );
  const burnedClamped = Math.min(100, budget.burnedPercent);

  const label = ninesLabel(target);

  return (
    <div className="bg-white rounded-3xl border border-glass-border shadow-xl overflow-hidden">

      {/* 1. SLA to downtime */}
      <div className="p-5 md:p-6 border-b border-glass-border">
        <h2 className="text-sm font-semibold text-tx-primary mb-1">What an SLA allows in downtime</h2>
        <p className="text-xs text-tx-secondary mb-4">
          Pick a target or type one. A month here is 30.44 days, one twelfth of a year.
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {COMMON_TARGETS.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={target === t}
              onClick={() => applyTarget(String(t))}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all tabular-nums ${
                target === t
                  ? 'bg-accent text-white border-accent'
                  : 'bg-white text-tx-secondary border-glass-border hover:border-accent/40'
              }`}
            >
              {t}%
            </button>
          ))}
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step="0.001"
              value={targetInput}
              onChange={(e) => applyTarget(e.target.value)}
              aria-label="Custom availability percentage"
              className="w-28 px-3 py-1.5 rounded-lg border border-glass-border bg-white text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
            <span className="text-sm text-tx-secondary">%</span>
          </div>
        </div>

        <div className="flex items-baseline gap-3 mb-3">
          <span className="text-2xl font-bold text-tx-primary tabular-nums">{fmtPercent(target)}%</span>
          {label && <span className="text-sm text-tx-secondary">({label})</span>}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {DISPLAY_PERIODS.map((p) => (
            <div key={p.key} className="bg-surface rounded-xl border border-glass-border p-3 text-center">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-tx-secondary mb-1">
                {p.label}
              </div>
              <div className="text-sm font-bold text-tx-primary tabular-nums">
                {formatDuration(downtimeSeconds(target, PERIODS[p.key]))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Composite chain */}
      <div className="p-5 md:p-6 border-b border-glass-border">
        <h2 className="text-sm font-semibold text-tx-primary mb-1">Composite SLA of a dependency chain</h2>
        <p className="text-xs text-tx-secondary mb-4">
          If your service is up only when every dependency is up, availabilities multiply.
        </p>

        <div className="space-y-2 mb-3">
          {chain.map((row, i) => (
            <div key={row.id} className="flex items-center gap-2">
              <input
                type="text"
                value={row.name}
                placeholder={`Service ${i + 1}`}
                onChange={(e) =>
                  setChain((prev) => prev.map((r) => (r.id === row.id ? { ...r, name: e.target.value } : r)))
                }
                aria-label={`Name of service ${i + 1}`}
                className="w-36 px-3 py-1.5 rounded-lg border border-glass-border bg-white text-sm text-tx-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="0.01"
                value={row.value}
                onChange={(e) =>
                  setChain((prev) => prev.map((r) => (r.id === row.id ? { ...r, value: e.target.value } : r)))
                }
                aria-label={`Availability of service ${i + 1}`}
                className="w-28 px-3 py-1.5 rounded-lg border border-glass-border bg-white text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              <span className="text-sm text-tx-secondary">%</span>
              <button
                type="button"
                onClick={() => setChain((prev) => prev.filter((r) => r.id !== row.id))}
                disabled={chain.length <= 1}
                aria-label={`Remove service ${i + 1}`}
                className="p-1.5 text-tx-secondary hover:text-red-600 disabled:opacity-25"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setChain((prev) => [...prev, { id: rowSeq++, value: '99.9' }])}
          className="px-3 py-1.5 rounded-lg border border-glass-border text-sm font-medium text-tx-secondary hover:text-accent hover:border-accent/40 mb-4"
        >
          + Add a dependency
        </button>

        <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="text-sm text-tx-secondary">Effective availability</span>
          <span className="text-2xl font-bold text-tx-primary tabular-nums">{fmtPercent(chainResult)}%</span>
          <span className="text-sm text-tx-secondary tabular-nums">
            {formatDuration(downtimeSeconds(chainResult, PERIODS.year))} of downtime per year
          </span>
        </div>
      </div>

      {/* 3. Error budget */}
      <div className="p-5 md:p-6">
        <h2 className="text-sm font-semibold text-tx-primary mb-1">Error budget</h2>
        <p className="text-xs text-tx-secondary mb-4">
          How much downtime your target allows, and how much of it you have already spent.
        </p>

        <div className="flex flex-wrap items-end gap-4 mb-4">
          <label className="text-xs text-tx-secondary">
            Target
            <div className="flex items-center gap-1.5 mt-1">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="0.01"
                value={budgetTarget}
                onChange={(e) => setBudgetTarget(e.target.value)}
                className="w-24 px-3 py-1.5 rounded-lg border border-glass-border bg-white text-sm text-tx-primary tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              <span className="text-sm">%</span>
            </div>
          </label>
          <label className="text-xs text-tx-secondary">
            Period
            <select
              value={budgetPeriod}
              onChange={(e) => setBudgetPeriod(e.target.value as PeriodKey)}
              className="block mt-1 px-3 py-1.5 rounded-lg border border-glass-border bg-white text-sm text-tx-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <option value="month">Month</option>
              <option value="quarter">Quarter</option>
              <option value="year">Year</option>
            </select>
          </label>
          <label className="text-xs text-tx-secondary">
            Downtime so far (minutes)
            <input
              type="number"
              inputMode="decimal"
              min={0}
              value={usedMinutes}
              onChange={(e) => setUsedMinutes(e.target.value)}
              className="block mt-1 w-32 px-3 py-1.5 rounded-lg border border-glass-border bg-white text-sm text-tx-primary tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-2 text-sm text-tx-secondary">
          <span>
            Budget: <strong className="text-tx-primary tabular-nums">{formatDuration(budget.allowedSeconds)}</strong>
          </span>
          <span>
            Remaining:{' '}
            <strong className={`tabular-nums ${budget.remainingSeconds < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
              {formatDuration(budget.remainingSeconds)}
            </strong>
          </span>
          <span className="tabular-nums">{Math.round(budget.burnedPercent)}% burned</span>
        </div>
        <div
          className="h-2 bg-gray-200 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(burnedClamped)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Error budget burned"
        >
          <div
            className={`h-full rounded-full transition-all ${
              budget.burnedPercent >= 100 ? 'bg-red-500' : budget.burnedPercent >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${burnedClamped}%` }}
          />
        </div>
      </div>

      {/* Takeaway */}
      <div className="px-5 md:px-6 py-4 border-t border-glass-border flex items-center justify-between gap-3 flex-wrap">
        <span className="text-xs text-tx-secondary">
          Takes everything above with it: the downtime table, the named chain, and the budget.
        </span>
        <button
          type="button"
          onClick={downloadCsv}
          className="px-4 py-2 rounded-lg bg-tx-primary text-white text-sm font-semibold hover:bg-tx-primary/90"
        >
          Download CSV
        </button>
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="toast-pop fixed bottom-6 left-1/2 z-50 px-5 py-3 rounded-full shadow-xl text-sm font-medium text-white bg-emerald-600"
        >
          {toast}
        </div>
      )}
    </div>
  );
};
