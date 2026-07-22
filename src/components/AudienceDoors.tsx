import React from 'react';
import { motion } from 'framer-motion';

/**
 * The two buyer paths, stated as their problems — not our org chart.
 * Nearly all traffic is outreach-sourced validation visits, so each visitor
 * should find their door within one scroll of the hero.
 */
export const AudienceDoors = () => {
  return (
    <section id="services" className="py-20 md:py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-6">

          {/* Door 1: AWS */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-3xl border border-glass-border shadow-sm hover:shadow-xl transition-shadow p-8 md:p-10 flex flex-col"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12H3l9-9 9 9h-2M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold text-tx-primary mb-4">Run on AWS</h2>
            <p className="text-lg text-tx-secondary leading-relaxed mb-6">
              Buy AWS through an Advanced Partner and get competitive rates, engineers in Sydney and
              Hong Kong who answer across time zones, and the hard parts done properly: migration,
              cost optimization, security hardening.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                'Procurement and account setup at competitive rates',
                'Cost optimization with a free initial review',
                'Build & handover, or fully managed under SLA. Your choice',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-tx-primary font-medium">
                  <svg className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <a href="#contact" className="mt-auto text-blue-600 font-semibold hover:underline">
              Start with a free cost &amp; architecture review →
            </a>
          </motion.div>

          {/* Door 2: China */}
          <motion.div
            id="china"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-white rounded-3xl border border-glass-border shadow-sm hover:shadow-xl transition-shadow p-8 md:p-10 flex flex-col"
          >
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18M12 3a15 15 0 000 18M3 12a9 9 0 1018 0 9 9 0 00-18 0" />
              </svg>
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold text-tx-primary mb-4">Reach China</h2>
            <p className="text-lg text-tx-secondary leading-relaxed mb-6">
              Your platform works everywhere except mainland China, where congested international
              routes make it slow and unreliable. We fix that with premium CEN fibre routes and
              Alibaba Cloud, with ICP compliance handled for you.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                'Website and client-portal acceleration on premium routes into the mainland',
                'MetaTrader 4/5 and trading-platform acceleration',
                'Self-service portal: your team manages domains, no new tech to learn',
                'Both directions: China-based teams reach your overseas AWS fast',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-tx-primary font-medium">
                  <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <a href="#contact" className="mt-auto text-red-600 font-semibold hover:underline">
              Get a China access assessment for your platform →
            </a>
          </motion.div>

        </div>
      </div>
    </section>
  );
};
