import React, { useState, useMemo } from 'react';
import { searchPorts, PORTS } from '../../lib/ports';

export const PortReference = () => {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchPorts(query), [query]);

  return (
    <div className="bg-white rounded-3xl border border-glass-border shadow-xl overflow-hidden">
      <div className="p-5 md:p-6 border-b border-glass-border">
        <label htmlFor="port-search" className="block text-sm font-semibold text-tx-primary mb-2">
          Search {PORTS.length} common ports
        </label>
        <div className="relative">
          <input
            id="port-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try 5432, redis, kafka, or udp"
            spellCheck={false}
            className="w-full px-4 py-3 pr-10 rounded-xl border border-glass-border bg-surface focus:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
          />
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-tx-secondary pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
        </div>
      </div>

      <div className="max-h-[560px] overflow-y-auto">
        {results.length ? (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface border-b border-glass-border">
              <tr className="text-left text-[11px] uppercase tracking-wide text-tx-secondary">
                <th className="px-5 md:px-6 py-2.5 font-semibold">Port</th>
                <th className="px-3 py-2.5 font-semibold">Proto</th>
                <th className="px-3 py-2.5 font-semibold">Service</th>
                <th className="px-3 py-2.5 font-semibold hidden sm:table-cell">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {results.map((p) => (
                <tr key={`${p.port}-${p.proto}`} className="hover:bg-surface/60">
                  <td className="px-5 md:px-6 py-2.5 font-mono font-semibold text-tx-primary tabular-nums">
                    {p.port}
                  </td>
                  <td className="px-3 py-2.5 text-tx-secondary font-mono text-xs">{p.proto}</td>
                  <td className="px-3 py-2.5 font-medium text-tx-primary">{p.service}</td>
                  <td className="px-3 py-2.5 text-tx-secondary hidden sm:table-cell">{p.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="p-6 text-sm text-tx-secondary">
            No match. Try a port number, a service name like postgres, or a protocol.
          </p>
        )}
      </div>
    </div>
  );
};
