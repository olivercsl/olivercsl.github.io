import React, { useState, useMemo } from 'react';
import { littlesLaw, rateBreakdown } from '../../lib/capacity';

const fmt = (n: number) =>
  n >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : Number(n.toPrecision(4)).toString();

type Solve = 'l' | 'lambda' | 'w';

const FIELDS: { key: Solve; label: string; hint: string; unit: string }[] = [
  { key: 'l', label: 'Concurrency (L)', hint: 'requests in flight', unit: 'in system' },
  { key: 'lambda', label: 'Throughput (λ)', hint: 'arrival rate', unit: 'req/s' },
  { key: 'w', label: 'Latency (W)', hint: 'time in system', unit: 'seconds' },
];

export const LittlesLaw = () => {
  const [solveFor, setSolveFor] = useState<Solve>('l');
  const [inputs, setInputs] = useState<Record<Solve, string>>({ l: '', lambda: '100', w: '0.25' });
  const [rpsInput, setRpsInput] = useState('100');

  const result = useMemo(() => {
    const known: { l?: number; lambda?: number; w?: number } = {};
    for (const f of FIELDS) {
      if (f.key === solveFor) continue;
      const v = Number(inputs[f.key]);
      if (Number.isFinite(v) && v >= 0) known[f.key] = v;
    }
    return littlesLaw(known);
  }, [inputs, solveFor]);

  const rps = Number(rpsInput);
  const rates = Number.isFinite(rps) && rps >= 0 ? rateBreakdown(rps) : null;

  return (
    <div className="bg-white rounded-3xl border border-glass-border shadow-xl overflow-hidden">
      {/* Little's Law */}
      <div className="p-5 md:p-6 border-b border-glass-border">
        <h2 className="text-sm font-semibold text-tx-primary mb-1">Little's Law: L = λ × W</h2>
        <p className="text-xs text-tx-secondary mb-4">
          Concurrency equals throughput times latency. Fill any two and the third follows.
        </p>

        <div className="grid sm:grid-cols-3 gap-3">
          {FIELDS.map((f) => {
            const solved = f.key === solveFor;
            return (
              <div
                key={f.key}
                className={`rounded-xl border p-3 ${solved ? 'bg-blue-50/60 border-blue-200' : 'border-glass-border'}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-tx-primary">{f.label}</span>
                  <button
                    type="button"
                    onClick={() => setSolveFor(f.key)}
                    aria-pressed={solved}
                    className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                      solved ? 'bg-accent text-white' : 'bg-surface text-tx-secondary hover:text-tx-primary'
                    }`}
                  >
                    {solved ? 'solving' : 'solve'}
                  </button>
                </div>
                {solved ? (
                  <div className="text-xl font-bold text-tx-primary tabular-nums py-1">
                    {result ? fmt(result[f.key]) : '...'}
                    <span className="text-xs font-normal text-tx-secondary ml-1.5">{f.unit}</span>
                  </div>
                ) : (
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={inputs[f.key]}
                    onChange={(e) => setInputs({ ...inputs, [f.key]: e.target.value })}
                    aria-label={f.label}
                    className="w-full px-3 py-1.5 rounded-lg border border-glass-border bg-white font-mono text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                )}
                <p className="text-[11px] text-tx-secondary mt-1">{f.hint}</p>
              </div>
            );
          })}
        </div>

        {result && solveFor === 'l' && (
          <p className="text-xs text-tx-secondary mt-3">
            Reading: at {fmt(result.lambda)} req/s with {fmt(result.w)}s in the system, you need
            capacity for {fmt(result.l)} concurrent requests. Size thread pools, connections and
            worker counts from this number, with headroom.
          </p>
        )}
      </div>

      {/* Rate windows */}
      <div className="p-5 md:p-6">
        <h2 className="text-sm font-semibold text-tx-primary mb-1">Request rate across windows</h2>
        <p className="text-xs text-tx-secondary mb-3">
          The same load quoted per second, minute, hour, day and month (30.44 days).
        </p>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={rpsInput}
            onChange={(e) => setRpsInput(e.target.value)}
            aria-label="Requests per second"
            className="w-32 px-3 py-2 rounded-lg border border-glass-border bg-white font-mono text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <span className="text-sm text-tx-secondary">requests per second</span>
        </div>
        {rates && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(
              [
                ['Per minute', rates.minute],
                ['Per hour', rates.hour],
                ['Per day', rates.day],
                ['Per month', rates.month],
              ] as [string, number][]
            ).map(([label, v]) => (
              <div key={label} className="bg-surface rounded-xl border border-glass-border p-3 text-center">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-tx-secondary mb-1">{label}</div>
                <div className="text-sm font-bold text-tx-primary tabular-nums">{fmt(v)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
