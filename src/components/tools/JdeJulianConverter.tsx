import React, { useEffect, useMemo, useState } from 'react';
import {
  read,
  dateToJde,
  convertColumn,
  longDate,
  parseDateText,
  isoDate,
  dayOfYear,
  daysInYear,
  type CalendarDate,
  type Direction,
  type JdeDate,
} from '../../lib/jde';

/** Holds a value's space until the browser knows today's date, so nothing moves (see EpochConverter). */
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
  value: string | null;
  mono?: boolean;
  onCopy: (text: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-tx-secondary shrink-0">{label}</span>
      <span className="flex items-center gap-1.5 min-w-0">
        <span className={`text-sm font-semibold text-tx-primary text-right break-all ${mono ? 'font-mono' : ''}`}>
          {value ?? <Placeholder w="w-24" />}
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

const Note = ({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'warn' }) => (
  <p
    className={`text-sm leading-relaxed rounded-xl px-4 py-3 mt-3 ${
      tone === 'warn' ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'bg-surface text-tx-secondary'
    }`}
  >
    {children}
  </p>
);

const Mono = ({ children }: { children: React.ReactNode }) => (
  <span className="font-mono text-tx-primary">{children}</span>
);

const breakdown = (d: JdeDate) => {
  const c = Math.floor(d.value / 100000);
  return `C ${c} (${19 + c}00s), YY ${String(Math.floor(d.value / 1000) % 100).padStart(2, '0')}, day ${String(d.dayOfYear).padStart(3, '0')} of ${d.daysInYear}`;
};

export const JdeJulianConverter = () => {
  // Today's date in the visitor's zone. Null until mounted so the server and
  // the browser render the same thing.
  const [today, setToday] = useState<CalendarDate | null>(null);
  const [input, setInput] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [direction, setDirection] = useState<Direction>('to-date');
  const [column, setColumn] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const n = new Date();
    const t = { year: n.getFullYear(), month: n.getMonth() + 1, day: n.getDate() };
    setToday(t);
    setDateInput(isoDate(t));
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

  // Before mount there is no current year, so no YYDDD second reading yet.
  const reading = useMemo(() => read(input, today ? today.year : 0), [input, today]);
  const picked = parseDateText(dateInput);
  const pickedJde = picked ? dateToJde(picked) : null;
  const todayJde = today ? dateToJde(today) : null;
  const columnResult = useMemo(() => (column.trim() ? convertColumn(column, direction) : null), [column, direction]);

  return (
    <div className="bg-white rounded-3xl border border-glass-border shadow-xl overflow-hidden">
      <div className="p-5 md:p-6 border-b border-glass-border">
        <h2 className="text-base font-semibold text-tx-primary mb-1">
          <label htmlFor="jde-in">JDE Julian date to calendar date</label>
        </h2>
        <p className="text-xs text-tx-secondary mb-3">
          JD Edwards dates are CYYDDD numbers such as 126001. Paste a date such as 2026-01-01 to convert
          the other way.
        </p>
        <input
          id="jde-in"
          type="text"
          inputMode="numeric"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste a JDE date here, e.g. 126001"
          spellCheck={false}
          autoComplete="off"
          className="w-full px-4 py-3 rounded-xl border-2 border-glass-border bg-white font-mono text-base text-tx-primary placeholder:font-sans placeholder:text-sm placeholder:text-tx-secondary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
        />

        {reading.kind === 'jde' && (
          <div className="mt-3">
            <div className="rounded-xl border border-glass-border px-4 py-1">
              <CopyRow label="Calendar date" value={reading.date.iso} onCopy={copy} />
              <CopyRow label="Day" value={longDate(reading.date)} mono={false} onCopy={copy} />
              <CopyRow label="Reads as" value={breakdown(reading.date)} mono={false} onCopy={copy} />
            </div>
            {reading.date.value < 100000 && (
              <Note>
                A 1900s date loses its leading zero when it is stored as a number, so this is{' '}
                <Mono>{reading.date.padded}</Mono> with the zero dropped.
              </Note>
            )}
            {reading.asYyddd && (
              <Note tone="warn">
                If this value came from a system that writes YYDDD rather than from JD Edwards, it means{' '}
                <Mono>{reading.asYyddd.iso}</Mono> ({longDate(reading.asYyddd)}). In JD Edwards that date is{' '}
                <Mono>{dateToJde(reading.asYyddd)}</Mono>.
              </Note>
            )}
            {reading.date.year >= 2100 && (
              <Note tone="warn">
                That is after 2099: the century digit {Math.floor(reading.date.value / 100000)} means the{' '}
                {19 + Math.floor(reading.date.value / 100000)}00s. Check the value if you expected this century.
              </Note>
            )}
          </div>
        )}

        {reading.kind === 'date' && (
          <div className="mt-3">
            {reading.jde !== null ? (
              <div className="rounded-xl border border-glass-border px-4 py-1">
                <CopyRow label="JDE Julian date" value={String(reading.jde)} onCopy={copy} />
                <CopyRow label="Day" value={longDate(reading.date)} mono={false} onCopy={copy} />
                <CopyRow
                  label="Day of the year"
                  value={`${dayOfYear(reading.date)} of ${daysInYear(reading.date.year)}`}
                  mono={false}
                  onCopy={copy}
                />
              </div>
            ) : (
              <Note tone="warn">CYYDDD can hold dates from 1900 to 2899 only.</Note>
            )}
          </div>
        )}

        {reading.kind === 'year-day' && (
          <Note tone="warn">
            Seven digits is not CYYDDD. Read as a year and a day of that year (YYYYDDD), it is{' '}
            <Mono>{isoDate(reading.date)}</Mono>
            {reading.jde !== null ? (
              <>
                , which in JD Edwards is <Mono>{reading.jde}</Mono>. Subtract 1900000 to go from one to the other.
              </>
            ) : (
              '.'
            )}
          </Note>
        )}

        {reading.kind === 'julian-day-number' && (
          <Note tone="warn">
            This looks like an astronomical Julian Day Number, a count of days since 4713 BC, not a JD Edwards
            date. The{' '}
            <a
              href="https://aa.usno.navy.mil/data/JulianDate"
              className="underline hover:text-accent"
              rel="noopener"
            >
              US Naval Observatory converter
            </a>{' '}
            reads those.
          </Note>
        )}

        {reading.kind === 'no-date' && (
          <Note>
            0 is not a date. Oracle's JDBC driver for JD Edwards World reads it as no date at all (NULL), so
            treat it as blank.
          </Note>
        )}

        {reading.kind === 'max-date' && (
          <Note>
            999999 is not a real CYYDDD date, since there is no day 999. Oracle's JDBC driver for JD Edwards
            World reads it as <Mono>9999-12-31</Mono>, and so does the column converter below.
          </Note>
        )}

        {reading.kind === 'bad-day' && (
          <Note tone="warn">
            {reading.dayOfYear === 0
              ? 'There is no day 000. The last three digits are the day of the year, starting at 001.'
              : `${reading.year} has ${daysInYear(reading.year)} days, so day ${String(reading.dayOfYear).padStart(3, '0')} does not exist.${
                  reading.dayOfYear === 366 ? ' Day 366 only exists in leap years.' : ''
                }`}
          </Note>
        )}

        {reading.kind === 'unreadable' && (
          <Note tone="warn">
            Not a JD Edwards date or a calendar date. Try a number such as <Mono>126001</Mono> or a date such as{' '}
            <Mono>2026-01-01</Mono>.
          </Note>
        )}
      </div>

      <div className="p-5 md:p-6 border-b border-glass-border">
        <h2 className="text-sm font-semibold text-tx-primary mb-1">
          <label htmlFor="jde-date">Date to JDE Julian date</label>
        </h2>
        <p className="text-xs text-tx-secondary mb-3">Opens on today's date in your time zone.</p>
        <input
          id="jde-date"
          type="date"
          min="1900-01-01"
          max="2899-12-31"
          value={dateInput}
          onChange={(e) => setDateInput(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-glass-border bg-white font-mono text-sm text-tx-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        <div className="rounded-xl border border-glass-border px-4 py-1 mt-3">
          {today !== null && pickedJde === null ? (
            <p className="py-2.5 text-sm text-tx-secondary">Pick a date between 1900 and 2899.</p>
          ) : (
            <>
              <CopyRow label="JDE Julian date" value={pickedJde !== null ? String(pickedJde) : null} onCopy={copy} />
              <CopyRow
                label="Day of the year"
                value={picked && pickedJde !== null ? `${dayOfYear(picked)} of ${daysInYear(picked.year)}` : null}
                mono={false}
                onCopy={copy}
              />
            </>
          )}
          <CopyRow label="Today" value={todayJde !== null ? String(todayJde) : null} onCopy={copy} />
        </div>
      </div>

      <div className="p-5 md:p-6">
        <h2 className="text-sm font-semibold text-tx-primary mb-1">Convert a whole column</h2>
        <p className="text-xs text-tx-secondary mb-3">
          Paste one value per line, straight from a spreadsheet or a query result. Blank lines stay blank, so
          the result pastes back into the same rows. Dates go in as 2026-01-01, 2026/01/01 or 20260101. A 0
          comes out blank and 999999 as 9999-12-31, as Oracle's JDBC driver reads them.
        </p>
        <div className="inline-flex gap-1 p-1 bg-surface rounded-xl border border-glass-border mb-3">
          {(
            [
              ['to-date', 'JDE to date'],
              ['to-jde', 'Date to JDE'],
            ] as const
          ).map(([d, label]) => (
            <button
              key={d}
              type="button"
              aria-pressed={direction === d}
              onClick={() => setDirection(d)}
              className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                direction === d ? 'bg-white text-accent shadow-sm' : 'text-tx-secondary hover:text-tx-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="jde-col-in" className="block text-xs font-semibold text-tx-secondary mb-1">
              {direction === 'to-date' ? 'JDE dates' : 'Dates'}
            </label>
            <textarea
              id="jde-col-in"
              rows={7}
              value={column}
              onChange={(e) => setColumn(e.target.value)}
              placeholder={direction === 'to-date' ? '126001\n125365\n98185' : '2026-01-01\n2025-12-31\n1998-07-04'}
              spellCheck={false}
              className="w-full px-3 py-2 rounded-xl border border-glass-border bg-white font-mono text-sm text-tx-primary placeholder:text-tx-secondary/70 focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          <div>
            <label htmlFor="jde-col-out" className="block text-xs font-semibold text-tx-secondary mb-1">
              {direction === 'to-date' ? 'Calendar dates (YYYY-MM-DD)' : 'JDE dates (CYYDDD)'}
            </label>
            <textarea
              id="jde-col-out"
              rows={7}
              readOnly
              value={columnResult ? columnResult.output : ''}
              className="w-full px-3 py-2 rounded-xl border border-glass-border bg-surface/60 font-mono text-sm text-tx-primary focus:outline-none"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 mt-2 min-h-9">
          <p className="text-xs text-tx-secondary" aria-live="polite">
            {columnResult
              ? `${columnResult.converted} converted${columnResult.invalid ? `, ${columnResult.invalid} marked invalid` : ''}.`
              : ''}
          </p>
          {columnResult && columnResult.converted > 0 && (
            <button
              type="button"
              onClick={() => copy(columnResult.output)}
              className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-glass-border text-tx-primary hover:text-accent"
            >
              Copy result
            </button>
          )}
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
