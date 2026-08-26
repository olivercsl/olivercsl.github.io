import React, { useState, useEffect, useMemo } from 'react';
import {
  parseLdap,
  msToFiletime,
  msToGeneralized,
  isoWithTicks,
  formatDurationMs,
  readAcrossZones,
  AD_ATTRIBUTES,
  INT64_MAX,
} from '../../lib/filetime';

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

const SAMPLES: { label: string; value: string }[] = [
  { label: 'A pwdLastSet value', value: '133801632000000000' },
  { label: 'accountExpires: never', value: INT64_MAX.toString() },
  { label: 'maxPwdAge: 42 days', value: '-36288000000000' },
  { label: 'whenCreated', value: '20260826040509.0Z' },
];

function Row({
  label,
  value,
  onCopy,
  mono = true,
}: {
  label: string;
  value: string;
  onCopy: (t: string) => void;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-tx-secondary shrink-0">{label}</span>
      <span className="flex items-center gap-1.5 min-w-0">
        <span
          className={`text-sm font-semibold text-tx-primary text-right break-all ${mono ? 'font-mono' : ''}`}
        >
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

export const LdapTimestampConverter = () => {
  const [input, setInput] = useState('');
  const [attribute, setAttribute] = useState('');
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

  const parsed = useMemo(() => parseLdap(input), [input]);
  const attr = AD_ATTRIBUTES.find((a) => a.name === attribute);

  const zones = useMemo(
    () => (parsed?.ms !== undefined && ready ? readAcrossZones(parsed.ms, localZone()) : null),
    [parsed, ready],
  );

  const dateMs = useMemo(() => {
    if (!dateInput) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(dateInput);
    if (!m) return null;
    const [y, mo, d, h, mi, s] = [m[1], m[2], m[3], m[4], m[5], m[6] ?? '0'].map(Number);
    return dateMode === 'utc'
      ? Date.UTC(y!, mo! - 1, d!, h!, mi!, s!)
      : new Date(y!, mo! - 1, d!, h!, mi!, s!).getTime();
  }, [dateInput, dateMode]);

  /** What the sentinel means depends on which attribute it came from. */
  const sentinelNote = () => {
    if (!parsed) return null;
    if (parsed.kind === 'zero') {
      return attr
        ? `${attr.name} is zero: ${attr.zero.toLowerCase()}.`
        : 'Zero is a sentinel, not a date. Pick the attribute above and this will say what it means for that one. It is never 1 January 1601.';
    }
    if (parsed.kind === 'never') {
      return attr?.never
        ? `${attr.name} is set to Int64 max: ${attr.never.toLowerCase()}.`
        : 'Int64 max (9223372036854775807) means never. On accountExpires that is an account that does not expire.';
    }
    return null;
  };

  return (
    <div className="bg-white rounded-3xl border border-glass-border shadow-xl overflow-hidden">
      {/* Input */}
      <div className="p-5 md:p-6 border-b border-glass-border">
        <h2 className="text-sm font-semibold text-tx-primary mb-1">
          LDAP timestamp to date
        </h2>
        <p className="text-xs text-tx-secondary mb-3">
          Paste an 18-digit FILETIME value, a Generalized Time string such as
          20260826040509.0Z, or a negative duration from maxPwdAge. Spaces and commas are ignored.
        </p>

        <div className="flex flex-wrap gap-2 mb-3">
          <input
            type="text"
            inputMode="numeric"
            spellCheck={false}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="133801632000000000"
            className="flex-1 min-w-56 px-4 py-2.5 rounded-xl border border-glass-border bg-surface focus:bg-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
          />
          <select
            value={attribute}
            onChange={(e) => setAttribute(e.target.value)}
            aria-label="Active Directory attribute"
            className="px-3 py-2.5 rounded-xl border border-glass-border bg-white text-sm text-tx-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            <option value="">Attribute (optional)</option>
            {AD_ATTRIBUTES.map((a) => (
              <option key={a.name} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {SAMPLES.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setInput(s.value)}
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

        {attr && (
          <p className="text-xs text-tx-secondary mt-3">
            <span className="font-mono text-tx-primary">{attr.name}</span>: {attr.what}.
          </p>
        )}
      </div>

      {/* Result */}
      {input.trim() !== '' && !parsed && (
        <div className="p-5 md:p-6 border-b border-glass-border">
          <p className="text-sm text-red-600">
            Not a FILETIME value or a Generalized Time string. Expect 18 digits, or the form
            YYYYMMDDHHMMSS.0Z.
          </p>
        </div>
      )}

      {parsed && (parsed.kind === 'zero' || parsed.kind === 'never') && (
        <div className="p-5 md:p-6 border-b border-glass-border">
          <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
            <p className="text-sm font-semibold text-amber-900 mb-1">
              {parsed.kind === 'zero' ? 'Zero: a sentinel, not a date' : 'Never'}
            </p>
            <p className="text-sm text-amber-900/90 leading-relaxed">{sentinelNote()}</p>
          </div>
        </div>
      )}

      {parsed && parsed.kind === 'duration' && (
        <div className="p-5 md:p-6 border-b border-glass-border">
          <div className="rounded-xl bg-surface border border-glass-border px-4 py-4 text-center">
            <div className="text-2xl font-bold text-tx-primary">
              {formatDurationMs(parsed.durationMs!)}
            </div>
            <p className="text-xs text-tx-secondary mt-2 leading-relaxed">
              Negative values are durations rather than instants. Active Directory stores
              maxPwdAge, minPwdAge and lockoutDuration this way, as a negative count of
              100-nanosecond intervals.
            </p>
          </div>
        </div>
      )}

      {parsed && parsed.ms !== undefined && (
        <>
          <div className="p-5 md:p-6 border-b border-glass-border">
            <div className="rounded-xl border border-glass-border px-4 py-1">
              <Row
                label="UTC"
                value={isoWithTicks(parsed.ms, parsed.remainder100ns ?? 0)}
                onCopy={copy}
              />
              <Row label="Unix seconds" value={String(Math.floor(parsed.ms / 1000))} onCopy={copy} />
              <Row label="Unix milliseconds" value={String(parsed.ms)} onCopy={copy} />
              {parsed.kind === 'generalized' ? (
                <Row label="FILETIME" value={msToFiletime(parsed.ms)} onCopy={copy} />
              ) : (
                <Row label="Generalized Time" value={msToGeneralized(parsed.ms)} onCopy={copy} />
              )}
            </div>
            {(parsed.remainder100ns ?? 0) > 0 && (
              <p className="text-xs text-tx-secondary mt-2">
                Carries {parsed.remainder100ns} extra 100-nanosecond ticks beyond the millisecond.
                Kept here, since the value is past the range a floating point number can hold
                exactly.
              </p>
            )}
          </div>

          {zones && (
            <div className="p-5 md:p-6 border-b border-glass-border">
              <h2 className="text-sm font-semibold text-tx-primary mb-1">
                In UTC, PST, EST and other time zones
              </h2>
              <p className="text-xs text-tx-secondary mb-3">
                Domain controllers store times in UTC. The incident you are investigating happened
                in somebody's local hours.
              </p>
              <div className="overflow-x-auto -mx-1 px-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-tx-secondary border-b border-glass-border">
                      <th className="py-2 pr-3 font-semibold">Zone</th>
                      <th className="py-2 font-semibold">Local time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {zones.map((z) => (
                      <tr key={z.zone}>
                        <td className="py-2 pr-3 whitespace-nowrap">
                          <span className="font-medium text-tx-primary">{z.label}</span>{' '}
                          <span className="text-xs text-tx-secondary">
                            {z.abbr} · {z.offset}
                          </span>
                        </td>
                        <td className="py-2 whitespace-nowrap tabular-nums text-tx-primary">
                          {z.formatted}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Date -> FILETIME */}
      <div className="p-5 md:p-6">
        <h2 className="text-sm font-semibold text-tx-primary mb-1">Date to LDAP timestamp</h2>
        <p className="text-xs text-tx-secondary mb-3">
          For writing a value back, or for building a filter such as
          <span className="font-mono"> (accountExpires&lt;=…)</span>.
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
          <div className="rounded-xl border border-glass-border px-4 py-1">
            <Row label="FILETIME" value={msToFiletime(dateMs)} onCopy={copy} />
            <Row label="Generalized Time" value={msToGeneralized(dateMs)} onCopy={copy} />
            <Row label="Unix seconds" value={String(Math.floor(dateMs / 1000))} onCopy={copy} />
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
