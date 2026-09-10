import React, { useState, useEffect, useMemo } from 'react';
import {
  parseDuration,
  hasCalendarComponents,
  toSecondsNominal,
  toSecondsFrom,
  applyTo,
  formatHuman,
  formatClock,
  secondsToDuration,
  toIso,
  WHERE_USED,
} from '../../lib/isoduration';

const SAMPLES = ['PT1H30M', 'PT4M13S', 'P3DT4H5M6S', 'P1Y2M', 'P2W'];

const pad = (n: number) => String(n).padStart(2, '0');
const toDateInput = (d: Date) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

function Row({
  label,
  value,
  note,
  onCopy,
}: {
  label: string;
  value: string;
  note?: string;
  onCopy: (t: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-tx-secondary shrink-0">
        {label}
        {note && <span className="block text-[11px] text-tx-secondary/80">{note}</span>}
      </span>
      <span className="flex items-center gap-1.5 min-w-0">
        <span className="text-sm font-semibold text-tx-primary font-mono text-right break-all">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onCopy(value)}
          aria-label={`Copy ${label}`}
          className="shrink-0 p-1.5 rounded-lg text-tx-secondary hover:text-accent"
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

export const IsoDurationConverter = () => {
  const [input, setInput] = useState('');
  const [anchor, setAnchor] = useState('');
  const [secondsInput, setSecondsInput] = useState('5400');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setAnchor(toDateInput(new Date()));
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

  const parsed = useMemo(() => parseDuration(input), [input]);
  const calendar = parsed ? hasCalendarComponents(parsed) : false;

  const anchorDate = useMemo(() => {
    if (!anchor) return null;
    const d = new Date(`${anchor}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [anchor]);

  const exact = parsed && anchorDate ? toSecondsFrom(parsed, anchorDate) : null;
  const nominal = parsed ? toSecondsNominal(parsed) : null;

  const secs = Number(secondsInput);
  const fromSeconds = Number.isFinite(secs) ? secondsToDuration(secs) : null;

  return (
    <div className="bg-white rounded-3xl border border-glass-border shadow-xl overflow-hidden">
      {/* Duration -> everything */}
      <div className="p-5 md:p-6 border-b border-glass-border">
        <h2 className="text-base font-semibold text-tx-primary mb-1">
          <label htmlFor="iso-in">ISO 8601 duration to a readable time</label>
        </h2>
        <p className="text-xs text-tx-secondary mb-3">
          Paste a value like PT1H30M or P3DT4H5M6S. The M before the T means months, the M after it
          means minutes.
        </p>
        <input
          id="iso-in"
          type="text"
          spellCheck={false}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste a duration here, e.g. PT1H30M"
          className="w-full px-4 py-3 rounded-xl border-2 border-glass-border bg-white font-mono text-base text-tx-primary placeholder:font-sans placeholder:text-sm placeholder:text-tx-secondary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
        />
        <div className="flex flex-wrap gap-1.5 mt-2">
          {SAMPLES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setInput(s)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-surface border border-glass-border text-tx-secondary hover:text-tx-primary hover:border-accent/40 font-mono font-medium"
            >
              {s}
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

      {input.trim() !== '' && !parsed && (
        <div className="p-5 md:p-6 border-b border-glass-border">
          <p className="text-sm text-red-600">
            Not an ISO 8601 duration. It has to start with P, and any hours, minutes or seconds have
            to come after a T. PT1H30M, not P1H30M.
          </p>
        </div>
      )}

      {parsed && (
        <>
          <div className="p-5 md:p-6 border-b border-glass-border">
            <div className="rounded-xl border border-glass-border px-4 py-1">
              <Row label="In words" value={formatHuman(parsed)} onCopy={copy} />
              <Row label="Canonical form" value={toIso(parsed)} onCopy={copy} />
              {!calendar && (
                <>
                  <Row label="Total seconds" value={String(nominal)} onCopy={copy} />
                  <Row label="Clock" value={formatClock(nominal!)} onCopy={copy} />
                </>
              )}
            </div>
          </div>

          {calendar && (
            <div className="p-5 md:p-6 border-b border-glass-border">
              <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 mb-4">
                <p className="text-sm font-semibold text-amber-900 mb-1">
                  This one has no single answer in seconds
                </p>
                <p className="text-sm text-amber-900/90 leading-relaxed">
                  It contains years or months, and those have no fixed length. One month is 28, 29,
                  30 or 31 days depending on which month. Give it a start date and the answer becomes
                  exact.
                </p>
              </div>

              <label className="block text-xs font-semibold text-tx-primary mb-1">
                Measured from
              </label>
              <input
                type="date"
                value={anchor}
                onChange={(e) => setAnchor(e.target.value)}
                className="px-3 py-2 rounded-lg border border-glass-border bg-white font-mono text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-accent/40"
              />

              <div className="rounded-xl border border-glass-border px-4 py-1">
                {exact !== null && anchorDate && (
                  <>
                    <Row
                      label="Exact seconds"
                      note={`from ${anchor}`}
                      value={String(Math.round(exact))}
                      onCopy={copy}
                    />
                    <Row
                      label="Ends at"
                      value={applyTo(parsed, anchorDate).toISOString().replace('.000Z', 'Z')}
                      onCopy={copy}
                    />
                  </>
                )}
                <Row
                  label="Approximate seconds"
                  note="mean Gregorian month and year"
                  value={String(Math.round(nominal!))}
                  onCopy={copy}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Seconds -> duration */}
      <div className="p-5 md:p-6 border-b border-glass-border">
        <h2 className="text-sm font-semibold text-tx-primary mb-1">Seconds to an ISO duration</h2>
        <p className="text-xs text-tx-secondary mb-3">
          Going the other way. Stops at days, because a count of seconds cannot know which months
          you meant.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={secondsInput}
            onChange={(e) => setSecondsInput(e.target.value)}
            aria-label="Seconds"
            className="w-40 px-3 py-2 rounded-lg border border-glass-border bg-white font-mono text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <span className="text-sm text-tx-secondary">seconds</span>
          {fromSeconds && (
            <span className="flex items-center gap-1.5 ml-auto">
              <span className="font-mono text-base font-bold text-tx-primary">{fromSeconds}</span>
              <button
                type="button"
                onClick={() => copy(fromSeconds)}
                aria-label="Copy duration"
                className="p-1.5 rounded-lg text-tx-secondary hover:text-accent"
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
          )}
        </div>
      </div>

      {/* Where you meet these */}
      <div className="p-5 md:p-6">
        <h2 className="text-sm font-semibold text-tx-primary mb-3">Where this format turns up</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-50">
              {WHERE_USED.map((w) => (
                <tr key={w.name}>
                  <td className="py-2 pr-3 font-medium text-tx-primary whitespace-nowrap">{w.name}</td>
                  <td className="py-2 pr-3 font-mono text-xs text-tx-primary whitespace-nowrap">
                    {w.example}
                  </td>
                  <td className="py-2 text-xs text-tx-secondary">{w.note}</td>
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
