import React from 'react';
import { motion } from 'framer-motion';

/**
 * Anonymized engagements. Every claim here maps to a real client — do not add
 * hypothetical or embellished entries, and do not add metrics that were not
 * actually measured. Clients are described by industry only, by agreement.
 */
const cases = [
  {
    tag: 'Global FX & CFD broker',
    tagColor: 'bg-blue-50 text-blue-700',
    title: 'Website & client portal, accelerated into mainland China',
    body: 'Marketing sites and the client portal were slow and unreliable for mainland users. We put them on premium CEN routes — and gave the team a self-service portal, so they add and manage accelerated domains themselves without learning any new tech.',
  },
  {
    tag: 'International trading platform',
    tagColor: 'bg-indigo-50 text-indigo-700',
    title: 'New domains live without specialist China knowledge',
    body: 'Same pattern, different brand: China acceleration that their existing ops team runs day-to-day through the portal. Launching a new domain into China stopped being a project and became a few clicks.',
  },
  {
    tag: 'Trading technology provider',
    tagColor: 'bg-emerald-50 text-emerald-700',
    title: 'MetaTrader 4/5 stable for mainland traders',
    body: 'Price streaming and order execution over MT4/5 suffered behind the Great Firewall. We built acceleration for the trading protocol itself — not just the website — keeping sessions stable for users in mainland China.',
  },
];

export const ProofSection = () => {
  return (
    <section className="py-20 md:py-24 px-6 bg-surface border-y border-glass-border">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <div className="inline-block px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold mb-5">
            Proven behind the Great Firewall
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold text-tx-primary mb-4">
            Trading platforms trust us with China.
          </h2>
          <p className="text-xl text-tx-secondary max-w-2xl mx-auto">
            Four global trading brands run their mainland-China access on infrastructure we built.
            Named references available on request.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {cases.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-white rounded-2xl border border-glass-border shadow-sm p-7 flex flex-col"
            >
              <span className={`self-start px-2.5 py-1 rounded-full text-xs font-semibold mb-4 ${c.tagColor}`}>
                {c.tag}
              </span>
              <h3 className="text-lg font-semibold text-tx-primary mb-3 leading-snug">{c.title}</h3>
              <p className="text-tx-secondary leading-relaxed">{c.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
