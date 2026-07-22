import React, { useState, useMemo } from 'react';
import {
  SIZE_UNITS,
  RATE_UNITS,
  toBytes,
  toBitsPerSecond,
  transferSeconds,
  formatSeconds,
  sizeBreakdown,
  type SizeUnit,
  type RateUnit,
} from '../../lib/bandwidth';

const fmt = (n: number) =>
  n >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  : n >= 1 ? n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  : n.toPrecision(3);

const COMMON_LINKS: { label: string; value: number; unit: RateUnit }[] = [
  { label: '100 Mbps', value: 100, unit: 'Mbps' },
  { label: '500 Mbps', value: 500, unit: 'Mbps' },
  { label: '1 Gbps', value: 1, unit: 'Gbps' },
  { label: '10 Gbps', value: 10, unit: 'Gbps' },
];

export const BandwidthCalculator = () => {
  const [sizeValue, setSizeValue] = useState('10');
  const [sizeUnit, setSizeUnit] = useState<SizeUnit>('TB');
  const [rateValue, setRateValue] = useState('1');
  const [rateUnit, setRateUnit] = useState<RateUnit>('Gbps');
  const [efficiency, setEfficiency] = useState(90);

  const bytes = useMemo(() => {
    const v = Number(sizeValue);
    return Number.isFinite(v) && v > 0 ? toBytes(v, sizeUnit) : null;
  }, [sizeValue, sizeUnit]);

  const bps = useMemo(() => {
    const v = Number(rateValue);
    return Number.isFinite(v) && v > 0 ? toBitsPerSecond(v, rateUnit) : null;
  }, [rateValue, rateUnit]);

  const seconds = bytes !== null && bps !== null ? transferSeconds(bytes, bps, efficiency) : null;
  const breakdown = bytes !== null ? sizeBreakdown(bytes) : null;

  return (
    <div className="bg-white rounded-3xl border border-glass-border shadow-xl overflow-hidden">
      {/* Inputs */}
      <div className="p-5 md:p-6 border-b border-glass-border">
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm font-semibold text-tx-primary">
            Data size
            <div className="flex gap-2 mt-1.5">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={sizeValue}
                onChange={(e) => setSizeValue(e.target.value)}
                className="w-28 px-3 py-2 rounded-lg border border-glass-border bg-white font-mono text-sm font-normal tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              <select
                value={sizeUnit}
                onChange={(e) => setSizeUnit(e.target.value as SizeUnit)}
                className="px-3 py-2 rounded-lg border border-glass-border bg-white text-sm font-normal text-tx-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                {Object.keys(SIZE_UNITS).map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </label>

          <label className="text-sm font-semibold text-tx-primary">
            Link speed
            <div className="flex gap-2 mt-1.5">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={rateValue}
                onChange={(e) => setRateValue(e.target.value)}
                className="w-28 px-3 py-2 rounded-lg border border-glass-border bg-white font-mono text-sm font-normal tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              <select
                value={rateUnit}
                onChange={(e) => setRateUnit(e.target.value as RateUnit)}
                className="px-3 py-2 rounded-lg border border-glass-border bg-white text-sm font-normal text-tx-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                {Object.keys(RATE_UNITS).map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </label>

          <div className="flex gap-2">
            {COMMON_LINKS.map((l) => (
              <button
                key={l.label}
                type="button"
                onClick={() => { setRateValue(String(l.value)); setRateUnit(l.unit); }}
                className="px-3 py-2 rounded-lg border border-glass-border text-sm font-medium text-tx-secondary hover:border-accent/40 hover:text-tx-primary"
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="bw-eff" className="flex justify-between text-sm text-tx-secondary mb-1">
            <span>Protocol efficiency</span>
            <span className="font-semibold text-tx-primary tabular-nums">{efficiency}%</span>
          </label>
          <input
            id="bw-eff"
            type="range"
            min={50}
            max={100}
            value={efficiency}
            onChange={(e) => setEfficiency(Number(e.target.value))}
            className="w-full accent-accent cursor-pointer"
          />
          <p className="text-xs text-tx-secondary mt-1">
            Real transfers rarely reach line rate. 85 to 95% is typical for TCP on a clean path.
          </p>
        </div>
      </div>

      {/* Result */}
      <div className="p-5 md:p-6 border-b border-glass-border">
        {seconds !== null ? (
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="text-sm text-tx-secondary">Transfer time</span>
            <span className="text-3xl font-bold text-tx-primary tabular-nums">{formatSeconds(seconds)}</span>
            <span className="text-sm text-tx-secondary tabular-nums">
              ({fmt(seconds)} seconds at {efficiency}% efficiency)
            </span>
          </div>
        ) : (
          <p className="text-sm text-tx-secondary">Enter a size and a link speed.</p>
        )}
      </div>

      {/* Unit table */}
      {breakdown && (
        <div className="p-5 md:p-6">
          <h2 className="text-sm font-semibold text-tx-primary mb-3">The same size in other units</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(['MB', 'GB', 'TB', 'GiB', 'TiB'] as SizeUnit[]).map((u) => (
              <div key={u} className="bg-surface rounded-xl border border-glass-border p-3 text-center">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-tx-secondary mb-1">{u}</div>
                <div className="text-sm font-bold text-tx-primary tabular-nums">{fmt(breakdown[u])}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
