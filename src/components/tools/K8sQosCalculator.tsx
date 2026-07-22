import React, { useState } from 'react';
import { qosClass, qosFindings, type ContainerResources } from '../../lib/k8sqos';

interface Row extends ContainerResources {
  id: number;
}

let seq = 0;
const newRow = (): Row => ({ id: seq++, cpuRequest: null, cpuLimit: null, memRequest: null, memLimit: null });

const CLASS_STYLE: Record<string, string> = {
  Guaranteed: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  Burstable: 'bg-amber-50 border-amber-200 text-amber-800',
  BestEffort: 'bg-rose-50 border-rose-200 text-rose-700',
};

const CLASS_BLURB: Record<string, string> = {
  Guaranteed: 'Evicted last under node pressure. Requests equal limits, so usage is fully accounted.',
  Burstable: 'Middle of the eviction order. Can use spare capacity, and can lose it under pressure.',
  BestEffort: 'First to be evicted under any node pressure. Fine for truly disposable workloads only.',
};

const FIELDS: { key: keyof ContainerResources; label: string; unit: string }[] = [
  { key: 'cpuRequest', label: 'CPU request', unit: 'm' },
  { key: 'cpuLimit', label: 'CPU limit', unit: 'm' },
  { key: 'memRequest', label: 'Memory request', unit: 'MiB' },
  { key: 'memLimit', label: 'Memory limit', unit: 'MiB' },
];

export const K8sQosCalculator = () => {
  const [rows, setRows] = useState<Row[]>([
    { id: seq++, cpuRequest: 250, cpuLimit: 500, memRequest: 256, memLimit: 512 },
  ]);

  const cls = qosClass(rows);
  const findings = qosFindings(rows);

  const setField = (id: number, key: keyof ContainerResources, raw: string) => {
    const v = raw.trim() === '' ? null : Number(raw);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: v } : r)));
  };

  return (
    <div className="bg-white rounded-3xl border border-glass-border shadow-xl overflow-hidden">
      <div className="p-5 md:p-6 border-b border-glass-border">
        <h2 className="text-sm font-semibold text-tx-primary mb-1">Container resources</h2>
        <p className="text-xs text-tx-secondary mb-4">
          CPU in millicores (500m is half a core), memory in MiB. Leave a field empty for unset,
          which is exactly how the kubelet sees it.
        </p>

        <div className="space-y-4">
          {rows.map((row, i) => (
            <div key={row.id} className="rounded-xl border border-glass-border p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-tx-primary">Container {i + 1}</span>
                <button
                  type="button"
                  onClick={() => setRows((prev) => prev.filter((r) => r.id !== row.id))}
                  disabled={rows.length <= 1}
                  aria-label={`Remove container ${i + 1}`}
                  className="p-1.5 text-tx-secondary hover:text-red-600 disabled:opacity-25"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {FIELDS.map((f) => (
                  <label key={f.key} className="text-xs text-tx-secondary">
                    {f.label}
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={row[f.key] ?? ''}
                        placeholder="unset"
                        onChange={(e) => setField(row.id, f.key, e.target.value)}
                        aria-label={`${f.label} for container ${i + 1}`}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-glass-border bg-white font-mono text-sm text-tx-primary tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/40"
                      />
                      <span className="text-[11px] shrink-0">{f.unit}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, newRow()])}
          className="mt-3 px-3 py-1.5 rounded-lg border border-glass-border text-sm font-medium text-tx-secondary hover:text-accent hover:border-accent/40"
        >
          + Add a container
        </button>
      </div>

      <div className="p-5 md:p-6">
        <div className={`rounded-xl border p-5 mb-4 ${CLASS_STYLE[cls]}`}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-1">QoS class</div>
          <div className="text-2xl font-bold mb-1">{cls}</div>
          <p className="text-sm leading-relaxed">{CLASS_BLURB[cls]}</p>
        </div>

        {findings.length > 0 && (
          <ul className="space-y-2">
            {findings.map((f, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <span
                  className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                    f.severity === 'risk' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {f.severity}
                </span>
                <span className="text-tx-secondary leading-relaxed">{f.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
