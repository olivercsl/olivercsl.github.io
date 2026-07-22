import React, { useState, useEffect, useMemo } from 'react';
import { cutoverPlan, formatTtl, COMMON_TTLS } from '../../lib/dnsttl';

const pad = (n: number) => String(n).padStart(2, '0');
const toLocalInput = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const show = (ms: number) =>
  new Date(ms).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export const DnsTtlPlanner = () => {
  const [cutoverInput, setCutoverInput] = useState('');
  const [currentTtl, setCurrentTtl] = useState(3600);
  const [loweredTtl, setLoweredTtl] = useState(300);
  const [verifyHours, setVerifyHours] = useState(2);

  // Default the cutover to tomorrow morning, set on the client only.
  useEffect(() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    t.setHours(9, 0, 0, 0);
    setCutoverInput(toLocalInput(t.getTime()));
  }, []);

  const plan = useMemo(() => {
    if (!cutoverInput) return null;
    const ms = new Date(cutoverInput).getTime();
    if (Number.isNaN(ms)) return null;
    return cutoverPlan(ms, currentTtl, loweredTtl, verifyHours * 3600);
  }, [cutoverInput, currentTtl, loweredTtl, verifyHours]);

  const steps = plan
    ? [
        {
          at: plan.lowerTtlAt,
          title: `Lower the TTL to ${formatTtl(loweredTtl)}`,
          body: `At the latest. Resolvers holding the old ${formatTtl(currentTtl)} TTL need this long to pick up the shorter one. Earlier is fine.`,
        },
        {
          at: plan.cutoverAt,
          title: 'Cut over: point the record at the new target',
          body: `From this moment, no resolver should cache the old answer for longer than ${formatTtl(plan.worstCaseStaleSeconds)}.`,
        },
        {
          at: plan.fullyPropagatedAt,
          title: 'Effectively fully propagated',
          body: `The lowered TTL has elapsed. Traffic still arriving at the old target after this points at clients pinning DNS or resolvers ignoring TTLs, which a few do.`,
        },
        {
          at: plan.restoreTtlAt,
          title: `Verified: restore the TTL to ${formatTtl(currentTtl)}`,
          body: `After ${verifyHours}h of observation. While the TTL stays low, a rollback also takes only ${formatTtl(plan.rollbackWindowSeconds)}.`,
        },
      ]
    : [];

  const ttlSelect = (value: number, onChange: (n: number) => void, label: string) => (
    <label className="text-sm font-semibold text-tx-primary">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="block mt-1.5 px-3 py-2 rounded-lg border border-glass-border bg-white font-mono text-sm font-normal text-tx-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
      >
        {COMMON_TTLS.map((t) => (
          <option key={t.seconds} value={t.seconds}>
            {t.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="bg-white rounded-3xl border border-glass-border shadow-xl overflow-hidden">
      <div className="p-5 md:p-6 border-b border-glass-border flex flex-wrap items-end gap-4">
        <label className="text-sm font-semibold text-tx-primary">
          Planned cutover
          <input
            type="datetime-local"
            value={cutoverInput}
            onChange={(e) => setCutoverInput(e.target.value)}
            className="block mt-1.5 px-3 py-2 rounded-lg border border-glass-border bg-white font-mono text-sm font-normal focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </label>
        {ttlSelect(currentTtl, setCurrentTtl, 'Current TTL')}
        {ttlSelect(loweredTtl, setLoweredTtl, 'Lowered TTL')}
        <label className="text-sm font-semibold text-tx-primary">
          Verify for
          <select
            value={verifyHours}
            onChange={(e) => setVerifyHours(Number(e.target.value))}
            className="block mt-1.5 px-3 py-2 rounded-lg border border-glass-border bg-white font-mono text-sm font-normal text-tx-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            {[1, 2, 4, 8, 24].map((h) => (
              <option key={h} value={h}>{h}h</option>
            ))}
          </select>
        </label>
      </div>

      <div className="p-5 md:p-6">
        {plan ? (
          <ol className="relative border-l-2 border-blue-100 ml-3 space-y-6">
            {steps.map((s, i) => (
              <li key={i} className="pl-6 relative">
                <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-accent" />
                <div className="text-xs font-semibold text-accent tabular-nums mb-0.5">{show(s.at)}</div>
                <div className="text-sm font-semibold text-tx-primary">{s.title}</div>
                <p className="text-sm text-tx-secondary leading-relaxed">{s.body}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-red-600">
            The lowered TTL must be shorter than the current TTL, and the cutover time valid.
          </p>
        )}
      </div>
    </div>
  );
};
