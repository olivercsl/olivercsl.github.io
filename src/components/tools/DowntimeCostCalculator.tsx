import React, { useState, useMemo } from 'react';
import { costTable, incidentCost, hourlyFromAnnual, formatMoney } from '../../lib/downtimecost';
import { formatDuration, ninesLabel, type PeriodKey } from '../../lib/sla';

const PERIOD_LABELS: { key: PeriodKey; label: string }[] = [
  { key: 'month', label: 'Month' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'year', label: 'Year' },
];

const CURRENCIES = ['USD', 'AUD', 'HKD', 'EUR', 'GBP', 'SGD', 'CNY'];

const INCIDENT_PRESETS = [5, 30, 60, 240];

export const DowntimeCostCalculator = () => {
  const [mode, setMode] = useState<'hourly' | 'annual'>('hourly');
  const [hourlyInput, setHourlyInput] = useState('5000');
  const [annualInput, setAnnualInput] = useState('20000000');
  const [currency, setCurrency] = useState('USD');
  const [period, setPeriod] = useState<PeriodKey>('year');
  const [minutes, setMinutes] = useState('60');

  const hourly = useMemo(() => {
    if (mode === 'hourly') return Math.max(0, Number(hourlyInput) || 0);
    return Math.max(0, hourlyFromAnnual(Number(annualInput) || 0));
  }, [mode, hourlyInput, annualInput]);

  const rows = useMemo(() => costTable(hourly, period), [hourly, period]);
  const money = (n: number) => formatMoney(n, currency);

  const mins = Math.max(0, Number(minutes) || 0);
  const single = incidentCost(hourly, mins);

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-glass-border bg-white font-mono text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/40';

  return (
    <div className="bg-white rounded-3xl border border-glass-border shadow-xl overflow-hidden">
      {/* Inputs */}
      <div className="p-5 md:p-6 border-b border-glass-border">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {(
            [
              ['hourly', 'I know the hourly cost'],
              ['annual', 'I know annual revenue'],
            ] as ['hourly' | 'annual', string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              aria-pressed={mode === id}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                mode === id
                  ? 'bg-accent text-white'
                  : 'bg-surface text-tx-secondary hover:text-tx-primary border border-glass-border'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-tx-primary mb-1">
              {mode === 'hourly' ? 'Cost of one hour down' : 'Annual revenue'}
            </label>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={mode === 'hourly' ? hourlyInput : annualInput}
              onChange={(e) =>
                mode === 'hourly' ? setHourlyInput(e.target.value) : setAnnualInput(e.target.value)
              }
              className={inputClass}
            />
            <p className="text-[11px] text-tx-secondary mt-1">
              {mode === 'hourly'
                ? 'Lost revenue, plus anything else an hour of outage costs you.'
                : `Spread evenly, that is ${money(hourly)} per hour.`}
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-tx-primary mb-1">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-glass-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-tx-secondary mt-1">Formatting only, no conversion.</p>
          </div>
        </div>
      </div>

      {/* Single incident */}
      <div className="p-5 md:p-6 border-b border-glass-border">
        <h2 className="text-sm font-semibold text-tx-primary mb-1">One incident</h2>
        <p className="text-xs text-tx-secondary mb-3">What a single outage of this length costs.</p>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            aria-label="Incident duration in minutes"
            className="w-28 px-3 py-2 rounded-lg border border-glass-border bg-white font-mono text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <span className="text-sm text-tx-secondary mr-1">minutes</span>
          {INCIDENT_PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMinutes(String(m))}
              className="text-[11px] px-2.5 py-1 rounded-full bg-surface border border-glass-border text-tx-secondary hover:text-tx-primary hover:border-accent/40 font-medium"
            >
              {m}m
            </button>
          ))}
        </div>
        <div className="rounded-xl bg-surface border border-glass-border p-4 text-center">
          <div className="text-2xl md:text-3xl font-bold text-tx-primary tabular-nums">
            {money(single)}
          </div>
          <div className="text-xs text-tx-secondary mt-1">
            {formatDuration(mins * 60)} at {money(hourly)} per hour
          </div>
        </div>
      </div>

      {/* Tier comparison */}
      <div className="p-5 md:p-6 border-b border-glass-border">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <h2 className="text-sm font-semibold text-tx-primary">What each availability tier costs</h2>
          <div className="flex gap-1">
            {PERIOD_LABELS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
                aria-pressed={period === p.key}
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  period === p.key
                    ? 'bg-accent text-white'
                    : 'bg-surface text-tx-secondary hover:text-tx-primary border border-glass-border'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-tx-secondary mb-3">
          Every target permits some downtime. This is what that allowance is worth per {period}, and
          what buying the next tier would save you.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-tx-secondary border-b border-glass-border">
                <th className="py-2 pr-3 font-semibold">Target</th>
                <th className="py-2 pr-3 font-semibold">Downtime allowed</th>
                <th className="py-2 pr-3 font-semibold text-right">Cost</th>
                <th className="py-2 font-semibold text-right">Saved vs tier below</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r) => {
                const nines = ninesLabel(r.percent);
                return (
                  <tr key={r.percent}>
                    <td className="py-2.5 pr-3 font-mono font-medium text-tx-primary whitespace-nowrap">
                      {r.percent}%
                      {nines && (
                        <span className="ml-1.5 text-[10px] text-tx-secondary font-sans">{nines}</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-tx-secondary whitespace-nowrap">
                      {formatDuration(r.downtimeSeconds)}
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums font-medium text-tx-primary whitespace-nowrap">
                      {money(r.cost)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-emerald-700 whitespace-nowrap">
                      {r.savingVsPrevious === null ? '' : money(r.savingVsPrevious)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-tx-secondary mt-3 leading-relaxed">
          The right way to read this column: the saving is your budget for the engineering that buys
          the extra nine. If reaching 99.99% costs more per {period} than the number beside it, the
          target is not worth having.
        </p>
      </div>

      {/* Caveats */}
      <div className="p-5 md:p-6">
        <h2 className="text-sm font-semibold text-tx-primary mb-2">What this leaves out</h2>
        <ul className="space-y-1.5 text-sm text-tx-secondary leading-relaxed">
          <li>Reputation and churn, which outlast the incident.</li>
          <li>SLA credits you owe customers, often a multiple of the lost revenue.</li>
          <li>Engineering hours spent on the incident and the follow-up.</li>
          <li>
            Outages rarely land at quiet hours. Weighting by traffic usually raises the figure.
          </li>
        </ul>
        <p className="text-xs text-tx-secondary mt-3">
          Every one of these pushes the number up, so treat the result as a floor rather than a
          forecast.
        </p>
      </div>
    </div>
  );
};
