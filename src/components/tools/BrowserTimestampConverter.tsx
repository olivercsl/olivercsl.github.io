import React, { useState, useEffect, useMemo } from 'react';
import {
  decodeAll,
  isSentinel,
  fromUnixMs,
  FORMATS,
  KNOWN_COLUMNS,
  type BrowserTimeFormat,
} from '../../lib/browsertime';
import { zoneTable } from '../../lib/epoch';

const pad = (n: number) => String(n).padStart(2, '0');

const localZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time';
  } catch {
    return 'local time';
  }
};

const toLocalInput = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const iso = (ms: number) => new Date(ms).toISOString().replace('.000Z', 'Z');

const SAMPLES = [
  { label: 'Chrome visit_time', value: '13350000000000000' },
  { label: 'Safari NSDate', value: '725843000' },
  { label: 'Cookie never expires', value: '0' },
];

function Copy({ text, label, onCopy }: { text: string; label: string; onCopy: (t: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onCopy(text)}
      aria-label={`Copy ${label}`}
      className="shrink-0 p-1 rounded text-tx-secondary hover:text-accent"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
    </button>
  );
}

export const BrowserTimestampConverter = () => {
  const [input, setInput] = useState('');
  const [expanded, setExpanded] = useState<BrowserTimeFormat | null>(null);
  const [dateInput, setDateInput] = useState('');
  const [dateMode, setDateMode] = useState<'local' | 'utc'>('utc');
  const [toast, setToast] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDateInput(toLocalInput(Date.now()));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast('Copied to clipboard');
    } catch {
      setToast('Copy failed. Select the text and copy manually.');
    }
  };

  const sentinel = input.trim() !== '' && isSentinel(input);
  const readings = useMemo(() => (sentinel ? [] : decodeAll(input)), [input, sentinel]);

  const zones = useMemo(() => {
    if (!ready || !expanded) return null;
    const r = readings.find((x) => x.format === expanded);
    return r ? zoneTable(r.ms, localZone()) : null;
  }, [expanded, readings, ready]);

  const dateMs = useMemo(() => {
    if (!dateInput) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(dateInput);
    if (!m) return null;
    const [y, mo, d, h, mi, s] = [m[1], m[2], m[3], m[4], m[5], m[6] ?? '0'].map(Number);
    return dateMode === 'utc'
      ? Date.UTC(y!, mo! - 1, d!, h!, mi!, s!)
      : new Date(y!, mo! - 1, d!, h!, mi!, s!).getTime();
  }, [dateInput, dateMode]);

  return (
    <div className="bg-white rounded-3xl border border-glass-border shadow-xl overflow-hidden">
      {/* Input */}
      <div className="p-5 md:p-6 border-b border-glass-border">
        <h2 className="text-sm font-semibold text-tx-primary mb-1">Decode a browser timestamp</h2>
        <p className="text-xs text-tx-secondary mb-3">
          Paste a raw value from a Chrome, Safari or Firefox database. Every reading is shown,
          because the same digits are a valid timestamp in more than one format.
        </p>
        <input
          type="text"
          inputMode="numeric"
          spellCheck={false}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setExpanded(null);
          }}
          placeholder="13350000000000000"
          className="w-full px-4 py-2.5 rounded-xl border border-glass-border bg-surface focus:bg-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
        />
        <div className="flex flex-wrap gap-1.5 mt-2">
          {SAMPLES.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => {
                setInput(s.value);
                setExpanded(null);
              }}
              className="text-[11px] px-2.5 py-1 rounded-full bg-surface border border-glass-border text-tx-secondary hover:text-tx-primary hover:border-accent/40 font-medium"
            >
              {s.label}
            </button>
          ))}
          {input && (
            <button
              type="button"
              onClick={() => setInput('')}
              className="text-[11px] px-2.5 py-1 rounded-full text-tx-secondary hover:text-red-600 font-medium"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {sentinel && (
        <div className="p-5 md:p-6 border-b border-glass-border">
          <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
            <p className="text-sm font-semibold text-amber-900 mb-1">Zero is not 1601</p>
            <p className="text-sm text-amber-900/90 leading-relaxed">
              A zero in one of these columns means the row has no value rather than a date at the
              epoch. In Chrome Cookies, <span className="font-mono">expires_utc = 0</span> is a
              session cookie that is not persisted. In History, a zero visit time means no visit was
              recorded.
            </p>
          </div>
        </div>
      )}

      {input.trim() !== '' && !sentinel && readings.length === 0 && (
        <div className="p-5 md:p-6 border-b border-glass-border">
          <p className="text-sm text-red-600">
            Not a number. Paste the raw column value, not the column name.
          </p>
        </div>
      )}

      {readings.length > 0 && (
        <div className="p-5 md:p-6 border-b border-glass-border">
          <h2 className="text-sm font-semibold text-tx-primary mb-1">Every reading</h2>
          <p className="text-xs text-tx-secondary mb-3">
            Ordered with the plausible ones first. Only you know which database the value came out
            of, so nothing here is guessed on your behalf.
          </p>
          <ul className="rounded-xl border border-glass-border divide-y divide-gray-50 overflow-hidden">
            {readings.map((r) => {
              const fmt = FORMATS.find((f) => f.id === r.format)!;
              const open = expanded === r.format;
              return (
                <li key={r.format} className={r.plausible ? '' : 'opacity-55'}>
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-tx-primary">
                        {fmt.name}
                        {!r.plausible && (
                          <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-tx-secondary">
                            unlikely
                          </span>
                        )}
                      </span>
                      <span className="block text-[11px] text-tx-secondary">
                        {fmt.unit} since {fmt.epoch}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-sm text-tx-primary tabular-nums">
                        {iso(r.ms)}
                      </span>
                      <Copy text={iso(r.ms)} label={fmt.name} onCopy={copy} />
                      <button
                        type="button"
                        onClick={() => setExpanded(open ? null : r.format)}
                        aria-expanded={open}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-surface border border-glass-border text-tx-secondary hover:text-tx-primary font-medium"
                      >
                        {open ? 'hide zones' : 'zones'}
                      </button>
                    </span>
                  </div>
                  {open && zones && (
                    <div className="px-4 pb-3 overflow-x-auto">
                      <table className="w-full text-xs">
                        <tbody className="divide-y divide-gray-50">
                          {zones.map((z) => (
                            <tr key={z.zone}>
                              <td className="py-1.5 pr-3 whitespace-nowrap text-tx-secondary">
                                {z.label} <span className="text-[10px]">{z.abbr}</span>
                              </td>
                              <td className="py-1.5 whitespace-nowrap tabular-nums text-tx-primary">
                                {z.formatted}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Date -> raw */}
      <div className="p-5 md:p-6 border-b border-glass-border">
        <h2 className="text-sm font-semibold text-tx-primary mb-1">Date to a stored value</h2>
        <p className="text-xs text-tx-secondary mb-3">
          For writing a WHERE clause against one of these databases.
        </p>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <input
            type="datetime-local"
            step="1"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            aria-label="Date and time"
            className="px-4 py-2.5 rounded-xl border border-glass-border bg-white font-mono text-sm text-tx-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <div className="inline-flex gap-1 p-1 bg-surface rounded-xl border border-glass-border">
            {(['utc', 'local'] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={dateMode === m}
                onClick={() => setDateMode(m)}
                className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                  dateMode === m ? 'bg-white text-accent shadow-sm' : 'text-tx-secondary hover:text-tx-primary'
                }`}
              >
                {m === 'utc' ? 'UTC' : localZone()}
              </button>
            ))}
          </div>
        </div>
        {dateMs !== null && (
          <ul className="rounded-xl border border-glass-border divide-y divide-gray-50 overflow-hidden">
            {FORMATS.map((f) => {
              const v = fromUnixMs(dateMs, f.id);
              return (
                <li
                  key={f.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5"
                >
                  <span className="text-sm text-tx-secondary">{f.name}</span>
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono text-sm font-semibold text-tx-primary tabular-nums break-all">
                      {v}
                    </span>
                    <Copy text={v} label={f.name} onCopy={copy} />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Column reference */}
      <div className="p-5 md:p-6">
        <h2 className="text-sm font-semibold text-tx-primary mb-1">Which column is which</h2>
        <p className="text-xs text-tx-secondary mb-3">
          The tables and columns these values come out of, so you can work backwards from what you
          are looking at.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-tx-secondary border-b border-glass-border">
                <th className="py-2 pr-3 font-semibold">Database</th>
                <th className="py-2 pr-3 font-semibold">Column</th>
                <th className="py-2 font-semibold">Format</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {KNOWN_COLUMNS.map((c) => (
                <tr key={`${c.db}-${c.column}`}>
                  <td className="py-2 pr-3 text-tx-secondary whitespace-nowrap">{c.db}</td>
                  <td className="py-2 pr-3 font-mono text-xs text-tx-primary whitespace-nowrap">
                    {c.table}.{c.column}
                  </td>
                  <td className="py-2 text-tx-secondary whitespace-nowrap">
                    {FORMATS.find((f) => f.id === c.format)!.name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
