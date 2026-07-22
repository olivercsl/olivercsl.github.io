import React, { useState, useEffect, useMemo } from 'react';
import {
  parseIPv4,
  maskFromPrefix,
  ipToString,
  subnetInfo,
  splitSubnets,
} from '../../lib/subnet';

const fmtCount = (n: number) => n.toLocaleString('en-US');

/**
 * The classic Class A / B / C quick start. Each presets the canonical private
 * network and default mask for that class; the active one tracks whichever
 * address is currently entered.
 */
const CLASS_PRESETS = [
  { letter: 'A', ip: '10.0.0.0', prefix: 8, hint: '10.0.0.0/8' },
  { letter: 'B', ip: '172.16.0.0', prefix: 16, hint: '172.16.0.0/16' },
  { letter: 'C', ip: '192.168.1.0', prefix: 24, hint: '192.168.1.0/24' },
] as const;

export const SubnetCalculator = () => {
  const [ipInput, setIpInput] = useState('192.168.1.0');
  const [prefix, setPrefix] = useState(24);
  const [splitPrefix, setSplitPrefix] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const ip = parseIPv4(ipInput);
  const info = ip !== null ? subnetInfo(ip, prefix) : null;

  const split = useMemo(
    () => (ip !== null && splitPrefix !== null ? splitSubnets(ip, prefix, splitPrefix) : null),
    [ip, prefix, splitPrefix],
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  // A shorter target prefix stops making sense when the network changes.
  useEffect(() => {
    if (splitPrefix !== null && splitPrefix <= prefix) setSplitPrefix(null);
  }, [prefix, splitPrefix]);

  const copyAll = async () => {
    if (!split) return;
    try {
      await navigator.clipboard.writeText(split.shown.map((s) => s.cidr).join('\n'));
      setToast(`Copied ${split.shown.length} CIDR blocks`);
    } catch {
      setToast('Copy failed. Select the text and copy manually.');
    }
  };

  const rows: [string, string][] = info
    ? [
        ['CIDR', info.cidr],
        ['Network address', info.networkAddress],
        ['Usable range', `${info.firstUsable} to ${info.lastUsable}`],
        ['Broadcast address', info.broadcastAddress],
        ['Total addresses', fmtCount(info.totalAddresses)],
        ['Usable hosts', fmtCount(info.usableHosts)],
        ['Netmask', info.netmask],
        ['Wildcard mask', info.wildcardMask],
        ['Class', info.ipClass],
        ['Scope', info.scope],
      ]
    : [];

  return (
    <div className="bg-white rounded-3xl border border-glass-border shadow-xl overflow-hidden">
      {/* Class quick start */}
      <div className="px-5 md:px-6 pt-5 md:pt-6">
        <span className="block text-sm font-semibold text-tx-primary mb-2">Network class</span>
        <div className="grid grid-cols-3 gap-2 max-w-md">
          {CLASS_PRESETS.map((c) => {
            const active = info?.ipClass === c.letter;
            return (
              <button
                key={c.letter}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setIpInput(c.ip);
                  setPrefix(c.prefix);
                  setSplitPrefix(null);
                }}
                className={`px-3 py-2 rounded-xl border text-center transition-all ${
                  active
                    ? 'bg-blue-50 border-accent ring-1 ring-accent/30'
                    : 'bg-white border-glass-border hover:border-accent/40'
                }`}
              >
                <span className="block text-sm font-semibold text-tx-primary">Class {c.letter}</span>
                <span className="block text-[11px] text-tx-secondary font-mono">{c.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Inputs */}
      <div className="p-5 md:p-6 border-b border-glass-border flex flex-wrap items-end gap-4">
        <label className="text-sm font-semibold text-tx-primary">
          IP address
          <input
            type="text"
            inputMode="decimal"
            value={ipInput}
            onChange={(e) => setIpInput(e.target.value)}
            placeholder="192.168.1.0"
            spellCheck={false}
            className={`block mt-1.5 w-44 px-3 py-2 rounded-lg border bg-white font-mono text-sm font-normal focus:outline-none focus:ring-2 focus:ring-accent/40 ${
              ip === null ? 'border-red-300 text-red-700' : 'border-glass-border text-tx-primary'
            }`}
          />
        </label>

        <label className="text-sm font-semibold text-tx-primary">
          Prefix
          <select
            value={prefix}
            onChange={(e) => setPrefix(Number(e.target.value))}
            className="block mt-1.5 px-3 py-2 rounded-lg border border-glass-border bg-white font-mono text-sm font-normal text-tx-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            {Array.from({ length: 33 }, (_, p) => (
              <option key={p} value={p}>
                /{p}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-semibold text-tx-primary">
          Netmask
          <select
            value={prefix}
            onChange={(e) => setPrefix(Number(e.target.value))}
            aria-label="Netmask (mirrors the prefix)"
            className="block mt-1.5 px-3 py-2 rounded-lg border border-glass-border bg-white font-mono text-sm font-normal text-tx-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            {Array.from({ length: 33 }, (_, p) => (
              <option key={p} value={p}>
                {ipToString(maskFromPrefix(p))}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Results */}
      {ip === null ? (
        <div className="p-6 text-sm text-red-600">Enter a valid IPv4 address, four numbers from 0 to 255.</div>
      ) : (
        info && (
          <>
            <dl className="grid sm:grid-cols-2 gap-x-8 px-5 md:px-6 py-4 border-b border-glass-border">
              {rows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-1.5 border-b border-gray-50 last:border-0 sm:[&:nth-last-child(2)]:border-0">
                  <dt className="text-sm text-tx-secondary shrink-0">{k}</dt>
                  <dd className="text-sm font-semibold text-tx-primary font-mono text-right break-all">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="px-5 md:px-6 py-4 border-b border-glass-border bg-surface/40">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-tx-secondary mb-2">Binary</div>
              <div className="font-mono text-xs text-tx-primary space-y-1 overflow-x-auto">
                <div><span className="inline-block w-16 text-tx-secondary">Address</span>{info.binaryIp}</div>
                <div><span className="inline-block w-16 text-tx-secondary">Mask</span>{info.binaryMask}</div>
              </div>
            </div>

            {/* Split */}
            <div className="p-5 md:p-6">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h2 className="text-sm font-semibold text-tx-primary">Split into smaller subnets</h2>
                <select
                  value={splitPrefix ?? ''}
                  onChange={(e) => setSplitPrefix(e.target.value === '' ? null : Number(e.target.value))}
                  aria-label="Target prefix for splitting"
                  className="px-3 py-1.5 rounded-lg border border-glass-border bg-white font-mono text-sm text-tx-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  <option value="">Choose a prefix</option>
                  {Array.from({ length: 32 - prefix }, (_, i) => prefix + 1 + i).map((p) => (
                    <option key={p} value={p}>
                      /{p} ({fmtCount(2 ** (p - prefix))} subnets)
                    </option>
                  ))}
                </select>
                {split && split.shown.length > 0 && (
                  <button
                    type="button"
                    onClick={copyAll}
                    className="px-3 py-1.5 rounded-lg bg-tx-primary text-white text-sm font-semibold hover:bg-tx-primary/90"
                  >
                    Copy CIDRs
                  </button>
                )}
              </div>

              {split && split.shown.length > 0 ? (
                <>
                  <ul className="rounded-xl border border-glass-border divide-y divide-gray-100 max-h-72 overflow-y-auto">
                    {split.shown.map((s) => (
                      <li key={s.cidr} className="flex flex-wrap justify-between gap-x-4 px-4 py-2 text-sm">
                        <code className="font-mono font-semibold text-tx-primary">{s.cidr}</code>
                        <span className="text-tx-secondary font-mono text-xs self-center">
                          {s.firstUsable} to {s.lastUsable}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {split.truncated && (
                    <p className="text-xs text-tx-secondary mt-2">
                      Showing the first {split.shown.length} of {fmtCount(split.count)} subnets.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-tx-secondary">
                  Pick a longer prefix to divide {info.cidr} into equal blocks, useful for planning
                  VPC subnets across availability zones.
                </p>
              )}
            </div>
          </>
        )
      )}

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
