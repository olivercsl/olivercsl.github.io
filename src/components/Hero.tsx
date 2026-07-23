import React from 'react';
import { motion } from 'framer-motion';

export const Hero = () => {
  return (
    <section className="relative pt-36 pb-20 md:pt-44 md:pb-28 px-6 overflow-hidden bg-[radial-gradient(78%_120%_at_50%_-8%,#eef5ff_0%,#ffffff_58%)]">
      <div className="max-w-3xl mx-auto relative z-10 flex flex-col items-center text-center gap-7">

        {/* Verified partner badge */}
        <motion.a
          href="https://partners.amazonaws.com/partners/0018W00002IkfioQAB/Cloudzeta%20Solutions%20Limited"
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-semibold hover:bg-blue-100 transition-colors"
        >
          <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          AWS Advanced Partner · Verified
        </motion.a>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl md:text-7xl font-semibold tracking-tight text-tx-primary leading-[1.05] text-balance"
        >
          Enterprise AWS.<br />
          <span className="text-accent">China Connectivity.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="text-xl md:text-2xl text-tx-secondary leading-relaxed text-balance max-w-2xl"
        >
          We build and run AWS infrastructure for companies worldwide, and make global platforms
          fast and reliable for users in mainland China.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
          className="flex flex-col sm:flex-row items-center gap-5 text-lg font-medium mt-1"
        >
          <a href="#contact" className="inline-flex items-center justify-center px-8 py-4 bg-tx-primary text-white rounded-full hover:bg-tx-primary/90 transition-all shadow-lg hover:shadow-xl">
            Talk to Oliver
          </a>
          <a href="#services" className="text-accent hover:underline flex items-center gap-1 px-4">
            See how we can help <span className="text-sm">›</span>
          </a>
        </motion.div>

      </div>
    </section>
  );
};
