import React from 'react';
import { motion } from 'framer-motion';

export const TrustSection = () => {
  return (
    <section className="py-24 bg-surface-hover border-y border-glass-border">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="grid md:grid-cols-3 gap-12 items-start mb-16">
          
          {/* 1. Experience */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center md:text-left p-6 rounded-2xl bg-white/50 border border-white/60 shadow-sm"
          >
            <div className="text-4xl font-bold text-tx-primary mb-3 tracking-tight">
              20 Years
            </div>
            <div className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
              Engineering Heritage
            </div>
            <p className="text-sm text-tx-secondary leading-relaxed">
              Established 2023. Backed by two decades of delivering critical financial infrastructure.
            </p>
          </motion.div>

          {/* 2. AWS Partner Status (Linked) */}
          <motion.a 
            href="https://partners.amazonaws.com/partners/0018W00002IkfioQAB/Cloudzeta%20Solutions%20Limited"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="group relative text-center md:text-left p-6 rounded-2xl bg-white border border-blue-100 shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
               <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </div>
            <div className="text-4xl font-bold text-tx-primary mb-3 tracking-tight group-hover:text-blue-600 transition-colors">
              Advanced
            </div>
            <div className="flex items-center gap-2 mb-2 justify-center md:justify-start">
               <div className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                 AWS Partner
               </div>
               <div className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">Verified</div>
            </div>
            <p className="text-sm text-tx-secondary leading-relaxed group-hover:text-gray-900 transition-colors">
              Recognized for technical proficiency and proven customer success. Click to verify status.
            </p>
          </motion.a>

          {/* 3. Ownership */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-center md:text-left p-6 rounded-2xl bg-white/50 border border-white/60 shadow-sm"
          >
            <div className="text-4xl font-bold text-tx-primary mb-3 tracking-tight">
              The Right Fit
            </div>
            <div className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
              Strategic Selection
            </div>
            <p className="text-sm text-tx-secondary leading-relaxed">
              We cut through the noise to identify the single solution most suitable for your business.
            </p>
          </motion.div>

        </div>

      </div>
    </section>
  );
};