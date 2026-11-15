import React, { useMemo, useState } from 'react';
import {
  findInstance,
  searchInstances,
  maxPods,
  capacityFormula,
  nodeConfigSnippet,
  INSTANCE_TYPES,
  type InstanceSpec,
  type NodeKind,
} from '../../lib/eksmaxpods';

const POPULAR = ['t3.medium', 'm5.large', 'm6i.xlarge', 'm7g.large', 'c6i.2xlarge', 'r6i.4xlarge'];

const KINDS: { id: NodeKind; label: string }[] = [
  { id: 'managed', label: 'Managed node group' },
  { id: 'self-managed', label: 'Self-managed or custom AMI' },
  { id: 'auto-mode', label: 'EKS Auto Mode' },
];

const fmt = (n: number) => n.toLocaleString('en-US');
const memory = (mib: number) => (mib >= 1024 ? `${fmt(+(mib / 1024).toFixed(1))} GiB` : `${mib} MiB`);

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-glass-border bg-white font-mono text-sm text-tx-primary focus:outline-none focus:ring-2 focus:ring-accent/40';

export const EksMaxPodsCalculator = () => {
  const [query, setQuery] = useState('');
  const [manual, setManual] = useState(false);
  const [hand, setHand] = useState({ enis: '3', ips: '10', vcpus: '2', prefixCapable: true });
  const [kind, setKind] = useState<NodeKind>('managed');
  const [prefixDelegation, setPrefixDelegation] = useState(false);
  const [customNetworking, setCustomNetworking] = useState(false);
  const [copied, setCopied] = useState(false);

  const handSpec: InstanceSpec | null = useMemo(() => {
    const enis = Number(hand.enis);
    const ips = Number(hand.ips);
    const vcpus = Number(hand.vcpus);
    if (![enis, ips, vcpus].every((n) => Number.isInteger(n) && n >= 1)) return null;
    return { type: 'custom', enis, ipsPerEni: ips, vcpus, memoryMiB: 0, prefixCapable: hand.prefixCapable };
  }, [hand]);

  const spec = manual ? handSpec : findInstance(query);
  const suggestions = !manual && !spec ? searchInstances(query) : [];
  const opts = { prefixDelegation, customNetworking };
  const r = spec ? maxPods(spec, opts) : null;
  const auto = kind === 'auto-mode';

  const headline = r ? (kind === 'managed' ? r.managed : kind === 'self-managed' ? r.selfManagedRecommended : r.autoMode) : null;

  const copySnippet = async () => {
    if (!r) return;
    try {
      await navigator.clipboard.writeText(nodeConfigSnippet(r.selfManagedRecommended));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable: the snippet stays selectable */
    }
  };

  const rows = spec
    ? [
        { label: 'Secondary IPs (default)', o: { prefixDelegation: false, customNetworking: false } },
        { label: 'Prefix delegation', o: { prefixDelegation: true, customNetworking: false } },
        { label: 'Custom networking', o: { prefixDelegation: false, customNetworking: true } },
        { label: 'Custom networking and prefixes', o: { prefixDelegation: true, customNetworking: true } },
      ].map((row) => ({ ...row, res: maxPods(spec, row.o) }))
    : [];

  return (
    <div className="bg-white rounded-3xl border border-glass-border shadow-xl overflow-hidden">
      {/* Instance */}
      <div className="p-5 md:p-6 border-b border-glass-border">
        <div className="flex items-center justify-between gap-3 mb-2">
          <label htmlFor="eks-instance" className="text-sm font-semibold text-tx-primary">
            EC2 instance type
          </label>
          <button
            type="button"
            onClick={() => setManual((m) => !m)}
            className="text-xs font-medium text-tx-secondary hover:text-accent underline underline-offset-2"
          >
            {manual ? 'Pick an instance type instead' : 'Enter the numbers by hand'}
          </button>
        </div>

        {!manual ? (
          <>
            <input
              id="eks-instance"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="m5.large"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className={inputCls}
            />
            <div className="flex flex-wrap items-center gap-1.5 mt-3 min-h-[2rem]">
              {query.trim() === '' && <span className="text-xs text-tx-secondary mr-1">Try:</span>}
              {(query.trim() === '' ? POPULAR : suggestions).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setQuery(t)}
                  className="px-2.5 py-1 rounded-lg border border-glass-border bg-white font-mono text-xs text-tx-secondary hover:text-accent hover:border-accent/40"
                >
                  {t}
                </button>
              ))}
              {query.trim() !== '' && !spec && suggestions.length === 0 && (
                <span className="text-xs text-tx-secondary">
                  Not in AWS's list of {fmt(INSTANCE_TYPES.length)} types. Check the spelling, or enter the numbers by hand.
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ['enis', 'ENIs'],
                ['ips', 'IPv4 per ENI'],
                ['vcpus', 'vCPUs'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-xs text-tx-secondary">
                {label}
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={hand[key]}
                  onChange={(e) => setHand((h) => ({ ...h, [key]: e.target.value }))}
                  className={`${inputCls} mt-1 tabular-nums`}
                />
              </label>
            ))}
            <label className="col-span-3 flex items-center gap-2 text-xs text-tx-secondary">
              <input
                type="checkbox"
                checked={hand.prefixCapable}
                onChange={(e) => setHand((h) => ({ ...h, prefixCapable: e.target.checked }))}
              />
              Nitro or bare metal (can use prefix delegation)
            </label>
            <p className="col-span-3 text-[11px] text-tx-secondary leading-relaxed">
              ENIs means network interfaces on the default network card. aws ec2 describe-instance-types shows them
              under NetworkInfo.
            </p>
          </div>
        )}
      </div>

      {/* Setup */}
      <div className="p-5 md:p-6 border-b border-glass-border">
        <span className="block text-sm font-semibold text-tx-primary mb-3">How the nodes are run</span>
        <div className="grid sm:grid-cols-3 gap-2 mb-4">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              aria-pressed={kind === k.id}
              onClick={() => setKind(k.id)}
              className={`px-3 py-2 rounded-lg border text-sm font-semibold transition-all ${
                kind === k.id
                  ? 'bg-blue-50 border-accent text-tx-primary ring-1 ring-accent/30'
                  : 'bg-white border-glass-border text-tx-secondary hover:border-accent/40 hover:text-tx-primary'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <div className={`flex flex-wrap gap-x-6 gap-y-2 ${auto ? 'opacity-40' : ''}`}>
          <label className="flex items-center gap-2 text-sm text-tx-secondary">
            <input
              type="checkbox"
              checked={prefixDelegation}
              disabled={auto}
              onChange={(e) => setPrefixDelegation(e.target.checked)}
            />
            Prefix delegation (ENABLE_PREFIX_DELEGATION)
          </label>
          <label className="flex items-center gap-2 text-sm text-tx-secondary">
            <input
              type="checkbox"
              checked={customNetworking}
              disabled={auto}
              onChange={(e) => setCustomNetworking(e.target.checked)}
            />
            Custom networking
          </label>
        </div>
        {auto && (
          <p className="text-xs text-tx-secondary mt-2">Auto Mode manages pod networking itself, so these do not apply.</p>
        )}
        {!auto && r?.prefixUnsupported && (
          <p className="text-xs text-amber-700 mt-2">
            This instance type is not Nitro-based, so the VPC CNI assigns individual addresses instead of /28
            prefixes. The figure below is without prefixes.
          </p>
        )}
      </div>

      {/* Result */}
      <div className="p-5 md:p-6">
        {!spec || !r || headline === null ? (
          <p className="text-sm text-tx-secondary text-center py-6">
            {manual ? 'Enter whole numbers of 1 or more.' : 'Type or pick an instance type to see its max pods.'}
          </p>
        ) : (
          <>
            <div className="rounded-2xl bg-surface border border-glass-border p-5 mb-4" role="status" aria-live="polite">
              <div className="text-xs font-semibold uppercase tracking-wide text-tx-secondary mb-1">
                {kind === 'self-managed' ? 'Max pods to set' : 'Max pods per node'}
                {spec.type !== 'custom' && <span className="font-mono normal-case"> · {spec.type}</span>}
              </div>
              <div className="text-5xl font-bold text-tx-primary tabular-nums mb-2">{fmt(headline)}</div>
              <p className="text-sm text-tx-secondary leading-relaxed">
                {kind === 'managed' &&
                  (r.ipCapacity > r.cap
                    ? `EKS sets this for you. The addresses allow ${fmt(r.ipCapacity)}, and managed node groups cap an instance with ${spec.vcpus} vCPUs at ${r.cap}.`
                    : `EKS sets this for you. It is under the ${r.cap} cap for ${spec.vcpus} vCPUs, so the address limit decides.`)}
                {kind === 'self-managed' &&
                  (r.selfManagedDefault === r.selfManagedRecommended
                    ? `nodeadm sets this by default, so there is nothing to change.`
                    : `If you set nothing, nodeadm uses ${fmt(r.selfManagedDefault)}. ${
                        r.selfManagedDefault < r.selfManagedRecommended
                          ? 'Prefix delegation does not raise it on its own.'
                          : 'That default ignores custom networking, so pods past the real limit would wait for an address that never comes.'
                      }`)}
                {kind === 'auto-mode' &&
                  `Auto Mode allows the lower of 110 and ENIs x (IPv4 per ENI - 1), which is ${fmt(spec.enis * (spec.ipsPerEni - 1))} here.`}
              </p>
            </div>

            {kind !== 'auto-mode' && (
              <p className="text-sm text-tx-secondary mb-4">
                Address limit:{' '}
                <span className="font-mono text-tx-primary [overflow-wrap:anywhere]">{capacityFormula(spec, r)}</span>
                {r.prefixApplied ? ' (each /28 prefix holds 16 addresses)' : ''}
              </p>
            )}

            {kind === 'self-managed' && r.selfManagedDefault !== r.selfManagedRecommended && (
              <div className="rounded-xl border border-glass-border mb-4 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-surface/60 border-b border-glass-border">
                  <span className="text-xs font-semibold text-tx-primary">NodeConfig user data (AL2023)</span>
                  <button
                    type="button"
                    onClick={copySnippet}
                    className="text-xs font-medium text-tx-secondary hover:text-accent"
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="px-4 py-3 text-xs text-tx-primary overflow-x-auto">
                  <code>{nodeConfigSnippet(r.selfManagedRecommended)}</code>
                </pre>
              </div>
            )}

            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-sm mb-5">
              {[
                ['vCPUs', fmt(spec.vcpus)],
                ...(spec.memoryMiB ? [['Memory', memory(spec.memoryMiB)]] : []),
                ['ENIs', fmt(spec.enis)],
                ['IPv4 per ENI', fmt(spec.ipsPerEni)],
                ['Prefixes', spec.prefixCapable ? 'Supported' : 'Not on Xen'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-tx-secondary">{k}</dt>
                  <dd className="font-semibold text-tx-primary tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="overflow-x-auto rounded-xl border border-glass-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-tx-secondary border-b border-glass-border bg-surface/60">
                    <th className="py-2 px-3 font-semibold">VPC CNI setup</th>
                    <th className="py-2 px-3 font-semibold text-right">Address limit</th>
                    <th className="py-2 px-3 font-semibold text-right">Managed node group</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map(({ label, o, res }) => {
                    const current =
                      !auto && o.prefixDelegation === prefixDelegation && o.customNetworking === customNetworking;
                    const na = o.prefixDelegation && !spec.prefixCapable;
                    return (
                      <tr key={label} className={current ? 'bg-blue-50/60' : ''}>
                        <td className="py-2 px-3 text-tx-primary">{label}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-tx-secondary">
                          {na ? 'n/a' : fmt(res.ipCapacity)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-tx-primary">
                          {na ? 'n/a' : fmt(res.managed)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
