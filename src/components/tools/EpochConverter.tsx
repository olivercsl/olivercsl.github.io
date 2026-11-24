import React, { useState, useEffect, useMemo } from 'react';
import { useLocalZone } from './useLocalZone';
import {
  smartParse,
  epochStrings,
  utcToMs,
  formatRelative,
  zoneTable,
  UNIT_LABELS,
  ZONE_PRESETS,
  type EpochUnit,
  type ZoneReading,
} from '../../lib/epoch';

const pad = (n: number) => String(n).padStart(2, '0');

const isoUtc = (ms: number) => new Date(ms).toISOString().replace('.000Z', 'Z');

const localZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time';
  } catch {
    return 'local time';
  }
};

const localString = (ms: number) =>
  new Date(ms).toLocaleString('en-GB', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

/** datetime-local value for an instant, in the visitor's zone. */
const toLocalInput = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/**
 * Stands in for a value that only exists once the page's script runs (the
 * clock, the zone readings). Rendering the row with this instead of leaving
 * the row out keeps the page from jumping when the values arrive: Lighthouse
 * measured a layout shift of 0.33 on this page with the rows missing.
 */
const Placeholder = ({ w }: { w: string }) => (
  <span aria-hidden="true" className={`inline-block h-4 ${w} max-w-full rounded bg-surface animate-pulse align-middle`} />
);

function CopyRow({
  label,
  value,
  mono = true,
  onCopy,
}: {
  label: string;
  /** Null until the value is known; the row keeps its height meanwhile. */
  value: string | null;
  mono?: boolean;
  onCopy: (text: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-tx-secondary shrink-0">{label}</span>
      <span className="flex items-center gap-1.5 min-w-0">
        <span className={`text-sm font-semibold text-tx-primary text-right break-all ${mono ? 'font-mono' : ''}`}>
          {value ?? <Placeholder w="w-32" />}
        </span>
        <button
          type="button"
          onClick={() => value !== null && onCopy(value)}
          disabled={value === null}
          aria-label={`Copy ${label}`}
          className="shrink-0 p-1.5 rounded-lg text-tx-secondary hover:text-accent disabled:opacity-40"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </button>
      </span>
    </div>
  );
}

export const EpochConverter = () => {
  // Ticking clock; null until mounted so SSR and client agree.
  const [now, setNow] = useState<number | null>(null);
  const zone = useLocalZone();
  const [input, setInput] = useState('');
  const [forcedUnit, setForcedUnit] = useState<EpochUnit | 'auto'>('auto');
  const [dateInput, setDateInput] = useState('');
  const [dateMode, setDateMode] = useState<'local' | 'utc'>('local');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setNow(Date.now());
    setDateInput(toLocalInput(Date.now()));
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
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

  const parsed = useMemo(
    () => smartParse(input, forcedUnit === 'auto' ? undefined : forcedUnit),
    [input, forcedUnit],
  );

  // Human date -> epoch
  const dateMs = useMemo(() => {
    if (!dateInput) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(dateInput);
    if (!m) return null;
    const [y, mo, d, h, mi, s] = [m[1], m[2], m[3], m[4], m[5], m[6] ?? '0'].map(Number);
    if (dateMode === 'utc') return utcToMs(y!, mo!, d!, h!, mi!, s!);
    return new Date(y!, mo! - 1, d!, h!, mi!, s!).getTime();
  }, [dateInput, dateMode]);

  const nowStrings = now !== null ? epochStrings(now) : null;

  // The parsed instant if there is one, otherwise the clock. Null before mount
  // so the server and the client render the same thing.
  const zoneRows = useMemo(() => {
    const ms = parsed ? parsed.ms : now;
    if (ms === null) return null;
    return zoneTable(ms, localZone());
  }, [parsed, now]);

  // Before the clock starts: the preset zones without readings, so the table
  // already has its full height and nothing below it moves (see Placeholder).
  const tableRows: { zone: string; label: string; r: ZoneReading | null }[] = zoneRows
    ? zoneRows.map((r) => ({ zone: r.zone, label: r.label, r }))
    : ZONE_PRESETS.map((z) => ({ ...z, r: null }));

  return (
    <div className="bg-white rounded-3xl border border-glass-border shadow-xl overflow-hidden">

      {/*
        The input leads. It used to sit under the live clock, and with a bare
        number as its placeholder it read as one more row of read-only output
        on a page already full of monospace numbers. Somebody arriving with a
        timestamp to convert could not find where to put it.
      */}
      <div className="p-5 md:p-6 border-b border-glass-border">
        <h2 className="text-base font-semibold text-tx-primary mb-1">
          <label htmlFor="epoch-in">Unix timestamp to date</label>
        </h2>
        <p className="text-xs text-tx-secondary mb-3">
          Seconds, milliseconds, microseconds or nanoseconds. The unit is detected from the
          magnitude. Date strings like 2026-07-22T09:00Z work too.
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <input
            id="epoch-in"
            type="text"
            inputMode="numeric"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your timestamp here, e.g. 1784678400"
            spellCheck={false}
            className="flex-1 min-w-56 px-4 py-3 rounded-xl border-2 border-glass-border bg-white font-mono text-base text-tx-primary placeholder:font-sans placeholder:text-sm placeholder:text-tx-secondary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
          />
          <select
            value={forcedUnit}
            onChange={(e) => setForcedUnit(e.target.value as EpochUnit | 'auto')}
            aria-label="Timestamp unit"
            className="px-3 py-2.5 rounded-xl border border-glass-border bg-white text-sm text-tx-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            <option value="auto">Auto-detect</option>
            <option value="s">Seconds</option>
            <option value="ms">Milliseconds</option>
            <option value="us">Microseconds</option>
            <option value="ns">Nanoseconds</option>
          </select>
        </div>

        {input.trim() !== '' && !parsed && (
          <p className="text-sm text-red-600">
            Not a recognisable timestamp or date. Try an epoch number or an ISO date.
          </p>
        )}

        {parsed && now !== null && (
          <div>
            {parsed.kind === 'epoch' && forcedUnit === 'auto' && (
              <p className="text-xs text-tx-secondary mb-2">
                Detected: <span className="font-semibold text-tx-primary">{UNIT_LABELS[parsed.unit!]}</span>
              </p>
            )}
            <div className="rounded-xl border border-glass-border px-4 py-1">
              <CopyRow label="ISO 8601 UTC" value={isoUtc(parsed.ms)} onCopy={copy} />
              <CopyRow label={zone} value={localString(parsed.ms)} onCopy={copy} />
              <CopyRow label="Relative" value={formatRelative(parsed.ms, now)} mono={false} onCopy={copy} />
              {parsed.kind === 'date' && (
                <>
                  <CopyRow label="Epoch seconds" value={epochStrings(parsed.ms).s} onCopy={copy} />
                  <CopyRow label="Epoch milliseconds" value={epochStrings(parsed.ms).ms} onCopy={copy} />
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Now */}
      <div className="p-5 md:p-6 border-b border-glass-border">
        <h2 className="text-sm font-semibold text-tx-primary mb-3">Current epoch time</h2>
        <div className="grid sm:grid-cols-2 gap-x-8">
          <CopyRow label="Seconds" value={nowStrings ? nowStrings.s : null} onCopy={copy} />
          <CopyRow label="Milliseconds" value={nowStrings ? nowStrings.ms : null} onCopy={copy} />
          <CopyRow label="ISO 8601 UTC" value={now !== null ? isoUtc(now) : null} onCopy={copy} />
          <CopyRow label={zone} value={now !== null ? localString(now) : null} onCopy={copy} />
        </div>
      </div>

      {/* Every zone at once. A timestamp is an instant, and the question people
          actually have is what it reads as somewhere specific. */}
      <div className="p-5 md:p-6 border-b border-glass-border">
        <h2 className="text-sm font-semibold text-tx-primary mb-1">
          Epoch to UTC, PST, EST and other time zones
        </h2>
        <p className="text-xs text-tx-secondary mb-3">
          {parsed
            ? 'The timestamp above, read in each zone. Abbreviations follow the date, so a July timestamp shows PDT and a January one shows PST.'
            : 'The current time in each zone. Paste a timestamp above to convert that instant instead.'}
        </p>
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-tx-secondary border-b border-glass-border">
                <th className="py-2 pr-3 font-semibold">Zone</th>
                <th className="py-2 pr-3 font-semibold">Local time</th>
                <th className="py-2 font-semibold">ISO 8601</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tableRows.map(({ zone: key, label, r }) => (
                <tr key={key}>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    <span className="font-medium text-tx-primary">{label}</span>{' '}
                    <span className="text-xs text-tx-secondary">
                      {r ? `${r.abbr} · ${r.offset}` : <Placeholder w="w-20" />}
                    </span>
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap tabular-nums text-tx-primary">
                    {r ? r.formatted : <Placeholder w="w-36" />}
                  </td>
                  <td className="py-2 whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-tx-secondary">{r ? r.iso : <Placeholder w="w-44" />}</span>
                      <button
                        type="button"
                        onClick={() => r && copy(r.iso)}
                        disabled={!r}
                        aria-label={`Copy ISO 8601 for ${label}`}
                        className="shrink-0 p-1 rounded text-tx-secondary hover:text-accent disabled:opacity-40"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Date -> timestamp */}
      <div className="p-5 md:p-6">
        <h2 className="text-sm font-semibold text-tx-primary mb-1">Date to timestamp</h2>
        <p className="text-xs text-tx-secondary mb-3">
          Pick a date and time, interpreted in your local zone or UTC.
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
            {(['local', 'utc'] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={dateMode === m}
                onClick={() => setDateMode(m)}
                className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                  dateMode === m ? 'bg-white text-accent shadow-sm' : 'text-tx-secondary hover:text-tx-primary'
                }`}
              >
                {m === 'local' ? zone : 'UTC'}
              </button>
            ))}
          </div>
        </div>

        {(dateMs !== null || now === null) && (
          <div className="rounded-xl border border-glass-border px-4 py-1">
            <CopyRow label="Epoch seconds" value={dateMs !== null ? epochStrings(dateMs).s : null} onCopy={copy} />
            <CopyRow label="Epoch milliseconds" value={dateMs !== null ? epochStrings(dateMs).ms : null} onCopy={copy} />
            <CopyRow label="ISO 8601 UTC" value={dateMs !== null ? isoUtc(dateMs) : null} onCopy={copy} />
          </div>
        )}
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
