import React from 'react';
import { motion } from 'framer-motion';

import { ChinaDashboard } from './visuals/ChinaDashboard';
import { BillingTrends } from './visuals/BillingTrends';

export const FeatureSection = () => {
  return (
    <section className="py-32 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto space-y-32">
        
        {/* Feature 1: China Connectivity */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold mb-6">
              Global Performance
            </div>
            <h2 className="text-4xl md:text-5xl font-semibold text-tx-primary mb-6">
              China Connectivity, <br/>Solved.
            </h2>
            <p className="text-xl text-tx-secondary leading-relaxed mb-8">
              Ensure your global platforms, such as trading apps, exam portals, and SaaS tools, perform flawlessly via our premium China fibre (CEN) backbone. Low latency China connectivity, solved. 
            </p>
            <ul className="space-y-4 mb-8">
              {['Very low packet loss', 'Low latency routing', 'Regulatory compliance'].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-tx-primary font-medium">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  {item}
                </li>
              ))}
            </ul>
            <a href="#contact" className="text-blue-600 font-semibold hover:underline">Check Coverage & Latency →</a>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative h-[500px]"
          >
             <ChinaDashboard />
          </motion.div>
        </div>

        {/* Feature 2: Unified Procurement */}
        <div className="grid md:grid-cols-2 gap-12 items-center md:flex-row-reverse">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="order-2 md:order-1 relative h-[500px]"
          >
             <BillingTrends />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="order-1 md:order-2"
          >
            <div className="inline-block px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold mb-6">
              Operational Efficiency
            </div>
            <h2 className="text-4xl md:text-5xl font-semibold text-tx-primary mb-6">
              Unified Cloud Procurement.
            </h2>
            <p class="text-xl text-tx-secondary leading-relaxed mb-8">
              Consolidate your AWS, Azure, and Alibaba Cloud spend. We simplify multi-vendor billing while actively optimizing your architecture to drive down costs.
            </p>
            <ul class="space-y-4 mb-8">
              {['Smart cost savings', 'Single currency invoice', 'Better cost visibility'].map((item, i) => (
                <li key={i} class="flex items-center gap-3 text-tx-primary font-medium">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  {item}
                </li>
              ))}
            </ul>
            <a href="#contact" className="text-indigo-600 font-semibold hover:underline">Get a Cost Audit →</a>
          </motion.div>
        </div>

      </div>
    </section>
  );
};
