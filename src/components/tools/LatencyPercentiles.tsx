import React, { useState, useMemo } from 'react';
import { parseNumbers, latencyStats } from '../../lib/capacity';

const fmt = (n: number) => (n >= 100 ? Math.round(n).toLocaleString('en-US') : Number(n.toPrecision(3)).toString());

const SAMPLE = '120 95 110 105 98 102 130 99 101 97 640 108 96 100 103 94 115 99 880 106';

export const LatencyPercentiles = () => {
  const [input, setInput] = useState('');

  const values = useMemo(() => parseNumbers(input), [input]);
  const stats = useMemo(() => latencyStats(values), [values]);

  const rows = stats
    ? ([
        ['P50 (median)', stats.p50],
        ['P90', stats.p90],
        ['P95', stats.p95],
        ['P99', stats.p99],
        ['P99.9', stats.p999],
        ['Min', stats.min],
        ['Mean', stats.mean],
        ['Max', stats.max],
      ] as [string, number][])
    : [];

  return (
    <div className="bg-white rounded-3xl border border-glass-border shadow-xl overflow-hidden">
      <div className="p-5 md:p-6 border-b border-glass-border">
        <label htmlFor="lat-in" className="block text-sm font-semibold text-tx-primary mb-1">
          Latency samples
        </label>
        <p className="text-xs text-tx-secondary mb-3">
          Paste numbers in any unit, separated by spaces, commas or newlines. Straight from a log or
          a spreadsheet column is fine.
        </p>
        <textarea
          id="lat-in"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={5}
          placeholder={SAMPLE}
          spellCheck={false}
          className="w-full px-4 py-3 rounded-xl border border-glass-border bg-surface focus:bg-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all resize-y"
        />
        <button
          type="button"
          onClick={() => setInput(SAMPLE)}
          className="mt-2 px-3 py-1.5 rounded-lg border border-glass-border text-sm font-medium text-tx-secondary hover:border-accent/40 hover:text-tx-primary"
        >
          Try sample data
        </button>
      </div>

      <div className="p-5 md:p-6">
        {stats ? (
          <>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-sm font-semibold text-tx-primary">
                {stats.count.toLocaleString('en-US')} samples
              </h2>
              {stats.tailRatio >= 3 && Number.isFinite(stats.tailRatio) && (
                <span className="text-sm font-semibold text-amber-600">
                  Long tail: P99 is {fmt(stats.tailRatio)}x the median
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {rows.map(([label, v]) => (
                <div
                  key={label}
                  className={`rounded-xl border p-3 text-center ${
                    label.startsWith('P9') || label.startsWith('P5')
                      ? 'bg-blue-50/60 border-blue-100'
                      : 'bg-surface border-glass-border'
                  }`}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-tx-secondary mb-1">
                    {label}
                  </div>
                  <div className="text-sm font-bold text-tx-primary tabular-nums">{fmt(v)}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-tx-secondary mt-4">
              Percentiles use linear interpolation between closest ranks, the same definition as
              numpy and most monitoring systems. Units are whatever you pasted.
            </p>
          </>
        ) : (
          <p className="text-sm text-tx-secondary">
            Paste samples above to see P50 through P99.9, min, mean and max.
          </p>
        )}
      </div>
    </div>
  );
};
