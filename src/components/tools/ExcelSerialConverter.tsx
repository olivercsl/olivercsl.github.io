import React, { useState, useEffect, useMemo } from 'react';
import {
  serialToDate,
  dateToSerial,
  convertSystem,
  unixToSerial,
  serialToUnix,
  timeOfDay,
  formulas,
  type DateSystem,
} from '../../lib/excelserial';

const pad = (n: number) => String(n).padStart(2, '0');
const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const isoFull = (ms: number) => new Date(ms).toISOString().replace('.000Z', 'Z');
const trim = (n: number) => String(Number(n.toFixed(6)));

const toInput = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};

function Row({ label, value, onCopy }: { label: string; value: string; onCopy: (t: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-tx-secondary shrink-0">{label}</span>
      <span className="flex items-center gap-1.5 min-w-0">
        <span className="text-sm font-semibold text-tx-primary font-mono text-right break-all">{value}</span>
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

function SystemToggle({ value, onChange }: { value: DateSystem; onChange: (s: DateSystem) => void }) {
  return (
    <div className="inline-flex gap-1 p-1 bg-surface rounded-xl border border-glass-border">
      {(['1900', '1904'] as const).map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={value === s}
          onClick={() => onChange(s)}
          className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-all ${
            value === s ? 'bg-white text-accent shadow-sm' : 'text-tx-secondary hover:text-tx-primary'
          }`}
        >
          {s} system
        </button>
      ))}
    </div>
  );
}

export const ExcelSerialConverter = () => {
  const [serialInput, setSerialInput] = useState('');
  const [system, setSystem] = useState<DateSystem>('1900');
  const [dateInput, setDateInput] = useState('');
  const [unixInput, setUnixInput] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const now = Date.now();
    setDateInput(toInput(now));
    setUnixInput(String(Math.floor(now / 1000)));
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

  const serial = Number(serialInput.trim().replace(/,/g, ''));
  const reading = useMemo(
    () => (serialInput.trim() && Number.isFinite(serial) ? serialToDate(serial, system) : null),
    [serialInput, serial, system],
  );

  const dateMs = useMemo(() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(dateInput);
    return m ? Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!) : null;
  }, [dateInput]);

  const unix = Number(unixInput);
  const unixOk = unixInput.trim() !== '' && Number.isFinite(unix);

  return (
    <div className="bg-white rounded-3xl border border-glass-border shadow-xl overflow-hidden">
      {/* Serial -> date */}
      <div className="p-5 md:p-6 border-b border-glass-border">
        <h2 className="text-base font-semibold text-tx-primary mb-1">
          <label htmlFor="serial-in">Excel serial number to date</label>
        </h2>
        <p className="text-xs text-tx-secondary mb-3">
          The number a date cell shows when its format is set to General. The fraction is the time of
          day.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="serial-in"
            type="text"
            inputMode="decimal"
            spellCheck={false}
            value={serialInput}
            onChange={(e) => setSerialInput(e.target.value)}
            placeholder="Paste a serial here, e.g. 45321.75"
            className="flex-1 min-w-56 px-4 py-3 rounded-xl border-2 border-glass-border bg-white font-mono text-base text-tx-primary placeholder:font-sans placeholder:text-sm placeholder:text-tx-secondary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
          />
          <SystemToggle value={system} onChange={setSystem} />
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {['45321.75', '25569', '60', '1'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSerialInput(s)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-surface border border-glass-border text-tx-secondary hover:text-tx-primary hover:border-accent/40 font-mono font-medium"
            >
              {s}
            </button>
          ))}
        </div>

        {serialInput.trim() !== '' && !reading && (
          <p className="text-sm text-red-600 mt-3">
            Not a date serial. Excel serials are zero or positive numbers; negative values are not
            shown as dates.
          </p>
        )}

        {reading && (
          <div className="mt-4">
            {reading.phantomLeapDay && (
              <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 mb-3">
                <p className="text-sm font-semibold text-amber-900 mb-1">29 February 1900 never happened</p>
                <p className="text-sm text-amber-900/90 leading-relaxed">
                  Excel shows serial 60 as 29 February 1900 because it treats 1900 as a leap year, a bug
                  inherited from Lotus 1-2-3. There is no real date to give, so the nearest real day is
                  shown below.
                </p>
              </div>
            )}
            {reading.beforeLeapBug && !reading.phantomLeapDay && reading.sheetsMs !== null && (
              <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 mb-3">
                <p className="text-sm text-amber-900 leading-relaxed">
                  Before 1 March 1900, Excel and Google Sheets disagree by a day. Excel reads this as{' '}
                  <strong>{isoDate(reading.ms)}</strong>; Sheets and LibreOffice read it as{' '}
                  <strong>{isoDate(reading.sheetsMs)}</strong>.
                </p>
              </div>
            )}
            <div className="rounded-xl border border-glass-border px-4 py-1">
              <Row label="Date" value={isoDate(reading.ms)} onCopy={copy} />
              <Row label="Time of day" value={timeOfDay(serial)} onCopy={copy} />
              <Row label="ISO 8601" value={isoFull(reading.ms)} onCopy={copy} />
              {system === '1900' && serial >= 61 && (
                <Row label="Unix seconds" value={trim(serialToUnix(serial))} onCopy={copy} />
              )}
              <Row
                label={`Same date in the ${system === '1900' ? '1904' : '1900'} system`}
                value={trim(convertSystem(serial, system, system === '1900' ? '1904' : '1900'))}
                onCopy={copy}
              />
            </div>
            <p className="text-[11px] text-tx-secondary mt-2">
              Spreadsheets store no timezone. These times are the wall clock of whoever entered the
              value, shown here labelled as UTC.
            </p>
          </div>
        )}
      </div>

      {/* Date -> serial */}
      <div className="p-5 md:p-6 border-b border-glass-border">
        <h2 className="text-sm font-semibold text-tx-primary mb-1">Date to Excel serial number</h2>
        <p className="text-xs text-tx-secondary mb-3">For writing a value back into a sheet or a formula.</p>
        <input
          type="datetime-local"
          value={dateInput}
          onChange={(e) => setDateInput(e.target.value)}
          aria-label="Date and time"
          className="px-4 py-2.5 rounded-xl border border-glass-border bg-white font-mono text-sm text-tx-primary mb-3 focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        {dateMs !== null && (
          <div className="rounded-xl border border-glass-border px-4 py-1">
            <Row label="1900 system (Windows, Mac 2011+)" value={trim(dateToSerial(dateMs, '1900'))} onCopy={copy} />
            <Row label="1904 system (legacy Mac)" value={trim(dateToSerial(dateMs, '1904'))} onCopy={copy} />
          </div>
        )}
      </div>

      {/* Unix <-> serial */}
      <div className="p-5 md:p-6 border-b border-glass-border">
        <h2 className="text-sm font-semibold text-tx-primary mb-1">Unix timestamp to Excel date</h2>
        <p className="text-xs text-tx-secondary mb-3">Seconds since 1970, as logs and APIs hand them over.</p>
        <input
          type="text"
          inputMode="numeric"
          value={unixInput}
          onChange={(e) => setUnixInput(e.target.value)}
          aria-label="Unix seconds"
          className="w-48 px-3 py-2 rounded-lg border border-glass-border bg-white font-mono text-sm tabular-nums mb-3 focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        {unixOk && (
          <div className="rounded-xl border border-glass-border px-4 py-1">
            <Row label="Excel serial (1900)" value={trim(unixToSerial(unix))} onCopy={copy} />
            <Row label="Date" value={isoFull(unix * 1000)} onCopy={copy} />
          </div>
        )}
      </div>

      {/* Formulas */}
      <div className="p-5 md:p-6">
        <h2 className="text-sm font-semibold text-tx-primary mb-3">Formulas to paste into a sheet</h2>
        <div className="rounded-xl border border-glass-border px-4 py-1">
          {formulas('A1').map((f) => (
            <Row key={f.label} label={f.label} value={f.formula} onCopy={copy} />
          ))}
        </div>
        <p className="text-[11px] text-tx-secondary mt-2">
          Format the result cell as a date afterwards, or it will display as a plain number.
        </p>
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
