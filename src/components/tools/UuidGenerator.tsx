import React, { useState, useCallback, useEffect } from 'react';
import {
  generate,
  applyFormat,
  UUID_VERSIONS,
  DEFAULT_FORMAT,
  MAX_COUNT,
  type UuidVersion,
  type FormatOptions,
} from '../../lib/uuid';

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
          checked ? 'bg-accent' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-4' : ''
          }`}
        />
      </button>
      <span className="text-sm text-tx-primary">{label}</span>
    </label>
  );
}

export const UuidGenerator = () => {
  const [version, setVersion] = useState<UuidVersion>('v4');
  const [count, setCount] = useState(5);
  const [format, setFormat] = useState<FormatOptions>(DEFAULT_FORMAT);
  const [uuids, setUuids] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const regenerate = useCallback(() => {
    const n = version === 'nil' ? Math.min(count, MAX_COUNT) : Math.min(Math.max(count, 1), MAX_COUNT);
    // v7/v1 embed a timestamp; nudging it per row keeps a bulk batch ordered
    // and distinct rather than all sharing one millisecond.
    const base = Date.now();
    setUuids(Array.from({ length: n }, (_, i) => generate(version, base + i)));
  }, [version, count]);

  useEffect(() => {
    regenerate();
  }, [regenerate]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const formatted = uuids.map((u) => applyFormat(u, format));

  const copy = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast(message);
    } catch {
      setToast('Copy failed. Select the text and copy manually.');
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-glass-border shadow-xl overflow-hidden">
      {/* Version */}
      <div className="p-5 md:p-6 border-b border-glass-border">
        <span className="block text-sm font-semibold text-tx-primary mb-3">Version</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {UUID_VERSIONS.map((v) => (
            <button
              key={v.id}
              type="button"
              aria-pressed={version === v.id}
              onClick={() => setVersion(v.id)}
              className={`text-left px-3 py-2.5 rounded-xl border transition-all ${
                version === v.id
                  ? 'bg-blue-50 border-accent ring-1 ring-accent/30'
                  : 'bg-white border-glass-border hover:border-accent/40'
              }`}
            >
              <span className="block font-semibold text-tx-primary text-sm">{v.label}</span>
              <span className="block text-xs text-tx-secondary leading-tight mt-0.5">{v.blurb}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="p-5 md:p-6 border-b border-glass-border flex flex-wrap items-end gap-x-8 gap-y-5">
        <div className={version === 'nil' ? 'opacity-40 pointer-events-none' : ''}>
          <label htmlFor="uuid-count" className="block text-sm font-semibold text-tx-primary mb-2">
            How many <span className="text-tx-secondary font-normal">(1–{MAX_COUNT})</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              id="uuid-count"
              type="number"
              min={1}
              max={MAX_COUNT}
              value={count}
              onChange={(e) => setCount(Math.min(Math.max(Number(e.target.value) || 1, 1), MAX_COUNT))}
              className="w-24 px-3 py-2 rounded-lg border border-glass-border bg-white tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
            {[1, 10, 50].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCount(n)}
                className="px-2.5 py-2 rounded-lg border border-glass-border text-sm font-medium text-tx-secondary hover:text-tx-primary hover:border-accent/40 tabular-nums"
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="block text-sm font-semibold text-tx-primary mb-2">Format</span>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Toggle label="Uppercase" checked={format.uppercase} onChange={(v) => setFormat({ ...format, uppercase: v })} />
            <Toggle label="Hyphens" checked={format.hyphens} onChange={(v) => setFormat({ ...format, hyphens: v })} />
            <Toggle label="Braces" checked={format.braces} onChange={(v) => setFormat({ ...format, braces: v })} />
          </div>
        </div>
      </div>

      {/* Output */}
      <div className="p-5 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-tx-primary">
            {formatted.length} {formatted.length === 1 ? 'UUID' : 'UUIDs'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={regenerate}
              className="px-3 py-1.5 rounded-lg border border-glass-border text-sm font-medium text-tx-secondary hover:text-accent hover:border-accent/40 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Regenerate
            </button>
            <button
              type="button"
              onClick={() => copy(formatted.join('\n'), `Copied ${formatted.length} to clipboard`)}
              className="px-4 py-1.5 rounded-lg bg-tx-primary text-white text-sm font-semibold hover:bg-tx-primary/90"
            >
              Copy all
            </button>
          </div>
        </div>

        <ul className="rounded-xl border border-glass-border divide-y divide-gray-100 overflow-hidden max-h-[420px] overflow-y-auto">
          {formatted.map((u, i) => (
            <li key={i} className="group flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-surface/60">
              <code className="font-mono text-sm text-tx-primary break-all">{u}</code>
              <button
                type="button"
                onClick={() => copy(u, 'Copied to clipboard')}
                aria-label={`Copy ${u}`}
                className="shrink-0 p-1.5 rounded-lg text-tx-secondary hover:text-accent opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
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
