import React, { useState, useMemo } from 'react';
import { analyzeBudget, rttFloorMs, type BudgetItem } from '../../lib/latencybudget';

const DEFAULT_ITEMS: BudgetItem[] = [
  { id: 1, name: 'CDN and TLS', ms: 20 },
  { id: 2, name: 'API gateway', ms: 15 },
  { id: 3, name: 'Application', ms: 60 },
  { id: 4, name: 'Database', ms: 40 },
  { id: 5, name: 'Third-party API', ms: 30 },
];

const ROUTES: { label: string; km: number }[] = [
  { label: 'Sydney to Singapore', km: 6_300 },
  { label: 'Hong Kong to Sydney', km: 7_400 },
  { label: 'Shanghai to Frankfurt', km: 8_700 },
  { label: 'Sydney to Virginia', km: 15_800 },
];

const BAR_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-violet-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-lime-500',
];

const round = (n: number) => Math.round(n * 10) / 10;

export const LatencyBudgetAllocator = () => {
  const [budgetInput, setBudgetInput] = useState('200');
  const [items, setItems] = useState<BudgetItem[]>(DEFAULT_ITEMS);
  const [nextId, setNextId] = useState(DEFAULT_ITEMS.length + 1);
  const [distance, setDistance] = useState('');

  const budget = Math.max(0, Number(budgetInput) || 0);
  const analysis = useMemo(() => analyzeBudget(budget, items), [budget, items]);

  const update = (id: number, patch: Partial<BudgetItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const addItem = () => {
    setItems((prev) => [...prev, { id: nextId, name: '', ms: 10 }]);
    setNextId((n) => n + 1);
  };

  const km = Number(distance);
  const floor = Number.isFinite(km) && km > 0 ? rttFloorMs(km) : null;

  return (
    <div className="bg-white rounded-3xl border border-glass-border shadow-xl overflow-hidden">
      {/* Budget */}
      <div className="p-5 md:p-6 border-b border-glass-border">
        <label className="block text-sm font-semibold text-tx-primary mb-1">
          End to end budget
        </label>
        <p className="text-xs text-tx-secondary mb-3">
          The number you have promised, usually a p95 or p99 target for the whole request.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
            aria-label="End to end latency budget in milliseconds"
            className="w-28 px-3 py-2 rounded-lg border border-glass-border bg-white font-mono text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <span className="text-sm text-tx-secondary mr-1">ms</span>
          {[100, 200, 500, 1000].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setBudgetInput(String(v))}
              className="text-[11px] px-2.5 py-1 rounded-full bg-surface border border-glass-border text-tx-secondary hover:text-tx-primary hover:border-accent/40 font-medium"
            >
              {v}ms
            </button>
          ))}
        </div>
      </div>

      {/* Status */}
      <div
        className={`px-5 md:px-6 py-4 border-b border-glass-border ${
          analysis.overBudget ? 'bg-amber-50/70' : 'bg-surface'
        }`}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 mb-3">
          <span className="text-sm text-tx-secondary">
            Allocated{' '}
            <strong className="text-tx-primary tabular-nums">{round(analysis.totalAllocated)}ms</strong>{' '}
            of {round(budget)}ms
          </span>
          <span
            className={`text-sm font-semibold tabular-nums ${
              analysis.overBudget ? 'text-amber-800' : 'text-emerald-700'
            }`}
          >
            {analysis.overBudget
              ? `${round(-analysis.remaining)}ms over`
              : `${round(analysis.remaining)}ms left`}
          </span>
        </div>

        {/* Stacked bar. Kept in the order the components are listed, so a segment
            lines up with the row that owns it. */}
        <div className="h-4 rounded-full bg-white border border-glass-border overflow-hidden flex">
          {items
            .filter((i) => i.ms > 0)
            .map((item) => (
              <div
                key={item.id}
                className={BAR_COLORS[items.indexOf(item) % BAR_COLORS.length]}
                style={{ width: `${budget > 0 ? Math.min(100, (item.ms / budget) * 100) : 0}%` }}
                title={`${item.name.trim() || 'Unnamed'}: ${round(item.ms)}ms`}
              />
            ))}
        </div>

        {analysis.overBudget && (
          <p className="text-sm text-amber-900 mt-3 leading-relaxed">
            The parts already exceed the whole. Something has to give: cut{' '}
            <strong>{analysis.largest?.name}</strong>, run components in parallel rather than in
            series, or renegotiate the target before you build against it.
          </p>
        )}
        {!analysis.overBudget && analysis.largest && (
          <p className="text-sm text-tx-secondary mt-3 leading-relaxed">
            <strong className="text-tx-primary">{analysis.largest.name}</strong> takes the largest
            share at {round(analysis.largest.ms)}ms, which is where optimisation pays first. Halving
            anything smaller moves the total less than the measurement noise.
          </p>
        )}
      </div>

      {/* Components */}
      <div className="p-5 md:p-6 border-b border-glass-border">
        <h2 className="text-sm font-semibold text-tx-primary mb-3">Components in series</h2>
        <ul className="space-y-2">
          {items.map((item, i) => {
            const share = budget > 0 ? (item.ms / budget) * 100 : 0;
            return (
              <li key={item.id} className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${BAR_COLORS[i % BAR_COLORS.length]}`} />
                <input
                  type="text"
                  value={item.name}
                  placeholder="Component"
                  onChange={(e) => update(item.id, { name: e.target.value })}
                  aria-label="Component name"
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-glass-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={item.ms}
                  onChange={(e) => update(item.id, { ms: Number(e.target.value) || 0 })}
                  aria-label={`${item.name || 'Component'} milliseconds`}
                  className="w-20 px-2.5 py-2 rounded-lg border border-glass-border bg-white font-mono text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
                <span className="w-12 text-right text-xs text-tx-secondary tabular-nums shrink-0">
                  {Math.round(share)}%
                </span>
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((x) => x.id !== item.id))}
                  aria-label={`Remove ${item.name || 'component'}`}
                  className="shrink-0 w-8 h-8 rounded-lg text-tx-secondary hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  &times;
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={addItem}
          className="mt-3 px-3 py-1.5 rounded-lg border border-glass-border text-sm font-medium text-tx-secondary hover:border-accent/40 hover:text-tx-primary"
        >
          Add component
        </button>
      </div>

      {/* Network floor */}
      <div className="p-5 md:p-6 border-b border-glass-border">
        <h2 className="text-sm font-semibold text-tx-primary mb-1">Network floor</h2>
        <p className="text-xs text-tx-secondary mb-3">
          Distance costs time that no amount of tuning recovers. Light in fibre travels at about two
          thirds of its speed in vacuum, and a round trip covers the distance twice.
        </p>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={distance}
            placeholder="0"
            onChange={(e) => setDistance(e.target.value)}
            aria-label="Distance in kilometres"
            className="w-28 px-3 py-2 rounded-lg border border-glass-border bg-white font-mono text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <span className="text-sm text-tx-secondary mr-1">km</span>
          {ROUTES.map((r) => (
            <button
              key={r.label}
              type="button"
              onClick={() => setDistance(String(r.km))}
              className="text-[11px] px-2.5 py-1 rounded-full bg-surface border border-glass-border text-tx-secondary hover:text-tx-primary hover:border-accent/40 font-medium"
            >
              {r.label}
            </button>
          ))}
        </div>
        {floor !== null && (
          <div className="rounded-xl bg-surface border border-glass-border p-4">
            <div className="text-xl font-bold text-tx-primary tabular-nums">
              {round(floor)}ms
              <span className="text-xs font-normal text-tx-secondary ml-2">
                minimum round trip, one hop
              </span>
            </div>
            <p className="text-xs text-tx-secondary mt-2 leading-relaxed">
              That is {Math.round((floor / (budget || 1)) * 100)}% of your budget spent before any
              code runs, and real paths are longer than the straight line. If a TLS handshake or a
              chatty protocol adds round trips, multiply it.
            </p>
          </div>
        )}
      </div>

      {/* Caveat */}
      <div className="p-5 md:p-6">
        <h2 className="text-sm font-semibold text-tx-primary mb-2">Percentiles do not add</h2>
        <p className="text-sm text-tx-secondary leading-relaxed">
          Two components with a 100ms p99 each do not produce a 200ms p99, because both are rarely
          slow on the same request. Adding them is conservative, which is what you want when
          allocating a budget, but it is not a prediction of what you will measure. The measured p99
          of the whole is usually lower than the sum and higher than any single part.
        </p>
      </div>
    </div>
  );
};
