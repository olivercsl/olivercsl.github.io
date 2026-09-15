import React, { useState, useEffect, useMemo } from 'react';
import {
  parseQuantity,
  findings,
  formatCpu,
  formatMemory,
  PRESETS,
  type Kind,
} from '../../lib/k8sunits';

const LEVEL_STYLE = {
  error: 'bg-rose-50 border-rose-100 text-rose-900',
  warn: 'bg-amber-50 border-amber-100 text-amber-900',
  info: 'bg-slate-50 border-slate-200 text-slate-800',
} as const;

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

export const K8sUnitsConverter = () => {
  const [kind, setKind] = useState<Kind>('memory');
  const [input, setInput] = useState('');
  const [toast, setToast] = useState<string | null>(null);

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

  const q = useMemo(() => parseQuantity(input), [input]);
  const notes = q ? findings(q, kind) : [];

  return (
    <div className="bg-white rounded-3xl border border-glass-border shadow-xl overflow-hidden">
      <div className="p-5 md:p-6 border-b border-glass-border">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-base font-semibold text-tx-primary">
            <label htmlFor="k8s-in">Kubernetes resource quantity</label>
          </h2>
          <div className="inline-flex gap-1 p-1 bg-surface rounded-xl border border-glass-border">
            {(['memory', 'cpu'] as const).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
                className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                  kind === k ? 'bg-white text-accent shadow-sm' : 'text-tx-secondary hover:text-tx-primary'
                }`}
              >
                {k === 'memory' ? 'Memory' : 'CPU'}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-tx-secondary mb-3">
          Paste the value from a manifest exactly as written, suffix and all. The suffix is where the
          mistakes live.
        </p>
        <input
          id="k8s-in"
          type="text"
          spellCheck={false}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={kind === 'memory' ? 'Paste a quantity here, e.g. 512Mi' : 'Paste a quantity here, e.g. 250m'}
          className="w-full px-4 py-3 rounded-xl border-2 border-glass-border bg-white font-mono text-base text-tx-primary placeholder:font-sans placeholder:text-sm placeholder:text-tx-secondary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
        />
        <div className="flex flex-wrap gap-1.5 mt-2">
          {PRESETS[kind].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setInput(p)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-surface border border-glass-border text-tx-secondary hover:text-tx-primary hover:border-accent/40 font-mono font-medium"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {input.trim() !== '' && !q && (
        <div className="p-5 md:p-6 border-b border-glass-border">
          <p className="text-sm text-red-600">
            Not a valid Kubernetes quantity. Suffixes are case sensitive: Mi and Gi, or m, k, M and G.
            Forms like MB, GB or K are rejected by the API server.
          </p>
        </div>
      )}

      {q && (
        <div className="p-5 md:p-6 border-b border-glass-border">
          {notes.length > 0 && (
            <ul className="space-y-2 mb-4">
              {notes.map((n, i) => (
                <li key={i} className={`rounded-xl border px-4 py-2.5 text-sm leading-relaxed ${LEVEL_STYLE[n.level]}`}>
                  {n.message}
                </li>
              ))}
            </ul>
          )}
          <div className="rounded-xl border border-glass-border px-4 py-1">
            {kind === 'cpu' ? (
              <>
                <Row label="Millicores" value={formatCpu(q.value).millicores} onCopy={copy} />
                <Row label="Cores" value={formatCpu(q.value).cores} onCopy={copy} />
                <Row label="Share of one vCPU" value={`${Number((q.value * 100).toFixed(1))}%`} onCopy={copy} />
              </>
            ) : (
              <>
                <Row label="Binary (Ki, Mi, Gi)" value={formatMemory(q.value).binary} onCopy={copy} />
                <Row label="Decimal (k, M, G)" value={formatMemory(q.value).decimal} onCopy={copy} />
                <Row label="Bytes" value={formatMemory(q.value).bytes} onCopy={copy} />
              </>
            )}
          </div>
        </div>
      )}

      {/* Reference */}
      <div className="p-5 md:p-6">
        <h2 className="text-sm font-semibold text-tx-primary mb-3">Suffix reference</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-tx-secondary border-b border-glass-border">
                <th className="py-2 pr-3 font-semibold">Suffix</th>
                <th className="py-2 pr-3 font-semibold">Means</th>
                <th className="py-2 font-semibold">Use for</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                ['m', 'one thousandth', 'CPU millicores. Never memory'],
                ['(none)', 'one', 'whole CPU cores, or bytes'],
                ['k, M, G, T', 'powers of 1,000', 'rarely what you want for memory'],
                ['Ki, Mi, Gi, Ti', 'powers of 1,024', 'memory, almost always'],
                ['e6, e9', 'scientific notation', 'accepted, but hard to read'],
              ].map(([s, m, u]) => (
                <tr key={s}>
                  <td className="py-2 pr-3 font-mono text-tx-primary whitespace-nowrap">{s}</td>
                  <td className="py-2 pr-3 text-tx-secondary whitespace-nowrap">{m}</td>
                  <td className="py-2 text-tx-secondary">{u}</td>
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
