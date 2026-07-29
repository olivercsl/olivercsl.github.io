import React, { useState, useMemo } from 'react';
import { parseZone, analyzeZone, type Verdict } from '../../lib/zonefile';

const VERDICT_STYLE: Record<Verdict, { badge: string; label: string }> = {
  pass: { badge: 'bg-emerald-100 text-emerald-700', label: 'OK' },
  warn: { badge: 'bg-amber-100 text-amber-700', label: 'Check' },
  fail: { badge: 'bg-rose-100 text-rose-700', label: 'Fix' },
  info: { badge: 'bg-slate-100 text-slate-700', label: 'Note' },
};

const SAMPLE = `$ORIGIN example.com.
$TTL 3600
@       IN  SOA ns1.example.com. admin.example.com. (
            2026072701 7200 3600 1209600 3600 )
@       IN  NS  ns1.example.com.
@       IN  NS  ns2.example.com.
@       IN  MX  10 mail.example.com.
@       IN  TXT "v=spf1 include:_spf.google.com ~all"
@       IN  TXT "google-site-verification=8mL2xQeR4tYuIoP"
www     IN  A   192.0.2.1
mail    IN  A   192.0.2.2
api 86400 IN A  192.0.2.3
`;

export const ZoneFileChecker = () => {
  const [text, setText] = useState('');

  const result = useMemo(() => {
    if (!text.trim()) return null;
    const zone = parseZone(text);
    return { zone, analysis: analyzeZone(zone) };
  }, [text]);

  const errors = result?.zone.issues.filter((i) => i.severity === 'error') ?? [];
  const warnings = result?.zone.issues.filter((i) => i.severity === 'warning') ?? [];

  return (
    <div className="bg-white rounded-3xl border border-glass-border shadow-xl overflow-hidden">
      {/* Input */}
      <div className="p-5 md:p-6 border-b border-glass-border">
        <label htmlFor="zone-in" className="block text-sm font-semibold text-tx-primary mb-1">
          Zone file
        </label>
        <p className="text-xs text-tx-secondary mb-3">
          Paste the zone exported from your current DNS provider. It is parsed in your browser and
          never uploaded, which matters because a zone file maps your whole infrastructure.
        </p>
        <textarea
          id="zone-in"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          spellCheck={false}
          placeholder={SAMPLE}
          className="w-full px-4 py-3 rounded-xl border border-glass-border bg-surface focus:bg-white font-mono text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all resize-y"
        />
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            type="button"
            onClick={() => setText(SAMPLE)}
            className="px-3 py-1.5 rounded-lg border border-glass-border text-sm font-medium text-tx-secondary hover:border-accent/40 hover:text-tx-primary"
          >
            Try sample zone
          </button>
          {text && (
            <button
              type="button"
              onClick={() => setText('')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-tx-secondary hover:text-red-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {!result ? (
        <div className="px-6 py-14 text-center">
          <p className="text-tx-primary font-medium mb-1">Nothing to check yet</p>
          <p className="text-sm text-tx-secondary max-w-md mx-auto">
            Paste a zone file above. This reports what a migration would break, not just whether the
            syntax parses.
          </p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="p-5 md:p-6 border-b border-glass-border">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-3">
              <span className="text-sm font-semibold text-tx-primary">
                {result.analysis.recordCount} records
              </span>
              {result.zone.origin && (
                <span className="text-sm text-tx-secondary font-mono">{result.zone.origin}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(result.analysis.byType)
                .sort((a, b) => b[1] - a[1])
                .map(([type, n]) => (
                  <span
                    key={type}
                    className="px-2.5 py-1 rounded-lg bg-surface border border-glass-border text-xs font-mono text-tx-primary"
                  >
                    {type} <span className="text-tx-secondary">{n}</span>
                  </span>
                ))}
            </div>
          </div>

          {/* Findings */}
          <div className="p-5 md:p-6 border-b border-glass-border">
            <h2 className="text-sm font-semibold text-tx-primary mb-3">Migration readiness</h2>
            <ul className="space-y-3">
              {result.analysis.findings.map((f, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className={`shrink-0 mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                      VERDICT_STYLE[f.verdict].badge
                    }`}
                  >
                    {VERDICT_STYLE[f.verdict].label}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-tx-primary">{f.title}</span>
                    <span className="block text-sm text-tx-secondary leading-relaxed break-words">
                      {f.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Parse issues */}
          {(errors.length > 0 || warnings.length > 0) && (
            <div className="p-5 md:p-6 border-b border-glass-border">
              <h2 className="text-sm font-semibold text-tx-primary mb-3">Parsing</h2>
              <ul className="space-y-2">
                {[...errors, ...warnings].map((issue, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span
                      className={`shrink-0 mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        issue.severity === 'error'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      line {issue.line}
                    </span>
                    <span className="text-tx-secondary leading-relaxed">{issue.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Proxy decisions */}
          {result.analysis.proxyCandidates.length > 0 && (
            <div className="p-5 md:p-6">
              <h2 className="text-sm font-semibold text-tx-primary mb-1">Proxy decisions</h2>
              <p className="text-xs text-tx-secondary mb-3">
                Only A, AAAA and CNAME records can be proxied. Everything else is served as ordinary
                DNS regardless.
              </p>
              <ul className="rounded-xl border border-glass-border divide-y divide-gray-50 overflow-hidden">
                {result.analysis.proxyCandidates.map((r, i) => {
                  const isMail = result.analysis.mailHosts.includes(r.name);
                  return (
                    <li key={i} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5 text-sm">
                      <span className="font-mono text-tx-primary">
                        {r.name} <span className="text-tx-secondary text-xs">{r.type}</span>
                      </span>
                      <span
                        className={`text-xs font-semibold ${
                          isMail ? 'text-amber-600' : 'text-emerald-600'
                        }`}
                      >
                        {isMail ? 'Leave unproxied, mail host' : 'Safe to proxy if it serves HTTP'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};
