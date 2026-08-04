import React, { useState, useMemo } from 'react';
import { summarize, formatMs, amplifiedLoad, JITTER_MODES, type JitterMode } from '../../lib/backoff';

const PRESETS: { label: string; baseMs: number; multiplier: number; retries: number; capMs: number }[] = [
  { label: 'AWS SDK default', baseMs: 100, multiplier: 2, retries: 3, capMs: 20_000 },
  { label: 'Aggressive', baseMs: 50, multiplier: 2, retries: 5, capMs: 5_000 },
  { label: 'Patient', baseMs: 1_000, multiplier: 2, retries: 6, capMs: 60_000 },
];

const num = (n: number) =>
  n >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : Number(n.toPrecision(4)).toString();

export const BackoffCalculator = () => {
  const [baseMs, setBaseMs] = useState('100');
  const [multiplier, setMultiplier] = useState('2');
  const [retries, setRetries] = useState('5');
  const [capMs, setCapMs] = useState('30000');
  const [jitter, setJitter] = useState<JitterMode>('full');
  const [timeoutMs, setTimeoutMs] = useState('10000');
  const [rps, setRps] = useState('100');

  const opts = useMemo(
    () => ({
      baseMs: Math.max(0, Number(baseMs) || 0),
      multiplier: Math.max(1, Number(multiplier) || 1),
      retries: Math.max(0, Math.min(20, Math.trunc(Number(retries) || 0))),
      capMs: Math.max(0, Number(capMs) || 0),
      jitter,
    }),
    [baseMs, multiplier, retries, capMs, jitter]
  );

  const summary = useMemo(() => summarize(opts), [opts]);

  const budget = Number(timeoutMs);
  const hasBudget = Number.isFinite(budget) && budget > 0;
  const exceedsAt = hasBudget
    ? summary.attempts.find((a) => a.elapsedMs > budget)?.attempt ?? null
    : null;

  const baseRps = Number(rps);
  const peakRps = Number.isFinite(baseRps) && baseRps >= 0
    ? amplifiedLoad(baseRps, summary.callsPerRequest)
    : null;

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setBaseMs(String(p.baseMs));
    setMultiplier(String(p.multiplier));
    setRetries(String(p.retries));
    setCapMs(String(p.capMs));
  };

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-glass-border bg-white font-mono text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/40';

  return (
    <div className="bg-white rounded-3xl border border-glass-border shadow-xl overflow-hidden">
      {/* Policy */}
      <div className="p-5 md:p-6 border-b border-glass-border">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-semibold text-tx-primary">Retry policy</h2>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-surface border border-glass-border text-tx-secondary hover:text-tx-primary hover:border-accent/40 font-medium"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(
            [
              ['Base delay (ms)', baseMs, setBaseMs, 'before the first retry'],
              ['Multiplier', multiplier, setMultiplier, '2 doubles each time'],
              ['Retries', retries, setRetries, 'after the initial call'],
              ['Cap (ms)', capMs, setCapMs, 'ceiling on one delay'],
            ] as [string, string, (v: string) => void, string][]
          ).map(([label, value, set, hint]) => (
            <div key={label}>
              <label className="block text-xs font-semibold text-tx-primary mb-1">{label}</label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={value}
                onChange={(e) => set(e.target.value)}
                className={inputClass}
              />
              <p className="text-[11px] text-tx-secondary mt-1">{hint}</p>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <span className="block text-xs font-semibold text-tx-primary mb-1.5">Jitter</span>
          <div className="grid sm:grid-cols-3 gap-2">
            {JITTER_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setJitter(m.id)}
                aria-pressed={jitter === m.id}
                className={`text-left px-3 py-2 rounded-xl border transition-colors ${
                  jitter === m.id
                    ? 'bg-blue-50/60 border-blue-200'
                    : 'border-glass-border hover:border-accent/40'
                }`}
              >
                <span className="block text-sm font-semibold text-tx-primary">{m.label}</span>
                <span className="block text-[11px] text-tx-secondary leading-snug">{m.blurb}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Headline numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100 border-b border-glass-border">
        {(
          [
            ['Expected total wait', formatMs(summary.totalExpectedMs)],
            ['Worst case', formatMs(summary.totalWorstMs)],
            ['Calls per request', String(summary.callsPerRequest)],
            ['Load multiplier', `${summary.loadMultiplier}x`],
          ] as [string, string][]
        ).map(([label, value]) => (
          <div key={label} className="p-4 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-tx-secondary mb-1">
              {label}
            </div>
            <div className="text-lg font-bold text-tx-primary tabular-nums">{value}</div>
          </div>
        ))}
      </div>

      {/* Schedule */}
      <div className="p-5 md:p-6 border-b border-glass-border">
        <h2 className="text-sm font-semibold text-tx-primary mb-1">Schedule</h2>
        <p className="text-xs text-tx-secondary mb-3">
          Expected delay before each retry, and the total elapsed since the first failure.
          {jitter !== 'none' && ' Jittered delays are averages, so any single run varies.'}
        </p>

        {summary.attempts.length === 0 ? (
          <p className="text-sm text-tx-secondary py-4">
            No retries configured. A single attempt, and the failure is surfaced immediately.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-tx-secondary border-b border-glass-border">
                  <th className="py-2 pr-3 font-semibold">Retry</th>
                  <th className="py-2 pr-3 font-semibold">Delay</th>
                  <th className="py-2 pr-3 font-semibold">Elapsed</th>
                  <th className="py-2 font-semibold">Bar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {summary.attempts.map((a) => {
                  const past = hasBudget && a.elapsedMs > budget;
                  const capped = a.rawMs > a.cappedMs;
                  return (
                    <tr key={a.attempt} className={past ? 'bg-amber-50/50' : ''}>
                      <td className="py-2 pr-3 tabular-nums text-tx-secondary">#{a.attempt}</td>
                      <td className="py-2 pr-3 tabular-nums font-medium text-tx-primary whitespace-nowrap">
                        {formatMs(a.expectedMs)}
                        {capped && (
                          <span className="ml-1.5 text-[10px] font-semibold uppercase text-tx-secondary">
                            capped
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3 tabular-nums text-tx-primary whitespace-nowrap">
                        {formatMs(a.elapsedMs)}
                      </td>
                      <td className="py-2 w-1/2">
                        <div className="h-2 rounded-full bg-surface overflow-hidden">
                          <div
                            className={`h-full rounded-full ${past ? 'bg-amber-400' : 'bg-accent'}`}
                            style={{
                              width: `${Math.min(
                                100,
                                (a.elapsedMs / (summary.totalExpectedMs || 1)) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Caller timeout */}
      <div className="p-5 md:p-6 border-b border-glass-border">
        <h2 className="text-sm font-semibold text-tx-primary mb-1">Against the caller's timeout</h2>
        <p className="text-xs text-tx-secondary mb-3">
          Retries are pointless once the caller has given up. Enter the deadline your client or
          upstream service enforces.
        </p>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={timeoutMs}
            onChange={(e) => setTimeoutMs(e.target.value)}
            aria-label="Caller timeout in milliseconds"
            className="w-32 px-3 py-2 rounded-lg border border-glass-border bg-white font-mono text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <span className="text-sm text-tx-secondary">ms deadline</span>
        </div>
        {hasBudget && (
          <p
            className={`text-sm leading-relaxed rounded-xl px-4 py-3 ${
              exceedsAt
                ? 'bg-amber-50 text-amber-900 border border-amber-100'
                : 'bg-emerald-50 text-emerald-900 border border-emerald-100'
            }`}
          >
            {exceedsAt
              ? `Retry #${exceedsAt} is expected to start after the ${formatMs(budget)} deadline has already passed. Everything from there burns capacity on a request nobody is waiting for. Cut retries to ${exceedsAt - 1} or lower the cap.`
              : `The full sequence finishes in about ${formatMs(summary.totalExpectedMs)}, inside the ${formatMs(budget)} deadline.`}
          </p>
        )}
      </div>

      {/* Retry storm */}
      <div className="p-5 md:p-6">
        <h2 className="text-sm font-semibold text-tx-primary mb-1">Load on a failing dependency</h2>
        <p className="text-xs text-tx-secondary mb-3">
          When a dependency fails outright, every attempt fails, so every retry becomes another
          request. This is the arithmetic behind a retry storm.
        </p>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={rps}
            onChange={(e) => setRps(e.target.value)}
            aria-label="Normal requests per second"
            className="w-32 px-3 py-2 rounded-lg border border-glass-border bg-white font-mono text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <span className="text-sm text-tx-secondary">req/s under normal conditions</span>
        </div>
        {peakRps !== null && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-glass-border p-4 text-center">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-tx-secondary mb-1">
                Normal
              </div>
              <div className="text-xl font-bold text-tx-primary tabular-nums">{num(baseRps)}</div>
              <div className="text-xs text-tx-secondary">req/s</div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-center">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-800 mb-1">
                While it is down
              </div>
              <div className="text-xl font-bold text-amber-900 tabular-nums">{num(peakRps)}</div>
              <div className="text-xs text-amber-800">req/s</div>
            </div>
          </div>
        )}
        <p className="text-xs text-tx-secondary mt-3 leading-relaxed">
          A dependency that fails under load then receives {summary.loadMultiplier} times its usual
          traffic, which is why it stays down after the original cause clears. A circuit breaker,
          which stops calling after a threshold of failures, is what bounds this. Jitter spreads the
          arrivals but does not reduce the total.
        </p>
      </div>
    </div>
  );
};
