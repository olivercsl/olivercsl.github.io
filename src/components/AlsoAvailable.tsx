import React from 'react';

/**
 * Secondary capabilities, deliberately compact. These are real offerings, but
 * putting them in big tiles made the firm read as a generalist reseller and
 * diluted the two core stories (AWS, China). One quiet row is enough.
 */
const items = [
  'AI token sourcing at wholesale rates',
  'Cloudflare WAF, CDN & DDoS protection',
  'Partner-led penetration testing',
  'Fortinet secure networking',
  'SOC design & security hardening',
];

export const AlsoAvailable = () => {
  return (
    <section className="py-12 px-6 border-t border-glass-border">
      <div className="max-w-7xl mx-auto">
        <p className="text-center text-sm font-medium text-tx-secondary mb-5">Also available</p>
        <ul className="flex flex-wrap justify-center gap-2.5">
          {items.map((item) => (
            <li
              key={item}
              className="px-4 py-2 rounded-full bg-surface border border-glass-border text-sm text-tx-primary"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
