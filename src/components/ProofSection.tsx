import React from 'react';
import { motion } from 'framer-motion';

/**
 * Anonymized engagements. Every claim here maps to a real client — do not add
 * hypothetical or embellished entries, and do not add metrics that were not
 * actually measured. Clients are described by industry only, by agreement.
 */
const cases = [
  {
    tag: 'Enterprise brokerage',
    tagColor: 'bg-rose-50 text-rose-700',
    span: true,
    title: 'Securing and scaling AWS for billions of trades a month',
    body: 'A global brokerage processing billions of trades a month on AWS, with its own enterprise IT organisation. We work alongside their teams to keep the environment secure and to scale it as trading volumes grow.',
  },
  {
    tag: 'Crypto exchange',
    tagColor: 'bg-amber-50 text-amber-700',
    title: 'AWS architecture support, lower monthly bill',
    body: 'A digital-asset exchange running its platform on AWS through us. Our engineers provide ongoing architecture support, and the move cut their cloud spend compared to their previous setup. The AWS side of the house earns its keep too.',
  },
  {
    tag: 'Risk & dealing systems provider',
    tagColor: 'bg-cyan-50 text-cyan-700',
    title: 'The same problem, in the other direction',
    body: 'A financial risk and dealing solutions provider whose engineers sit in China, while their AWS dev and prod environments sit outside it. We put their team’s access to those environments on accelerated routes, alongside ongoing AWS support and cost optimization.',
  },
  {
    tag: 'Global FX & CFD broker',
    tagColor: 'bg-blue-50 text-blue-700',
    title: 'Website & client portal, accelerated into mainland China',
    body: 'Marketing sites and the client portal were slow and unreliable for mainland users. On premium routes their accelerated domains show measurably lower packet loss than non-accelerated ones, and the team adds and manages domains through a self-service portal, no new tech to learn.',
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
    body: 'Price streaming and order execution over MT4/5 suffered on congested international routes. We built acceleration for the trading protocol itself, not just the website, keeping sessions stable for users in mainland China.',
  },
  {
    tag: 'US medical society',
    tagColor: 'bg-purple-50 text-purple-700',
    title: 'A flagship annual congress, reachable from mainland China',
    body: 'A major American medical society with a large audience in mainland China. We put their annual event platform on accelerated routes into the mainland and supported it through the event itself. Not just trading platforms: any global event or platform that needs to work well in China.',
  },
];

export const ProofSection = () => {
  return (
    <section className="py-20 md:py-24 px-6 bg-surface border-y border-glass-border">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <div className="inline-block px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold mb-5">
            Real engagements · anonymized
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold text-tx-primary mb-4">
            Fintech and finance platforms trust us.
          </h2>
          <p className="text-xl text-tx-secondary max-w-2xl mx-auto">
            Eight global brands, from enterprise brokerages to a major American medical society,
            run on infrastructure we built: AWS secured and scaled to enterprise volume, and China
            acceleration in both directions. Named references available on request.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {cases.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`bg-white rounded-2xl border border-glass-border shadow-sm p-7 flex flex-col ${
                'span' in c && c.span ? 'sm:col-span-2' : ''
              }`}
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
