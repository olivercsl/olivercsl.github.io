import React from 'react';
import { motion } from 'framer-motion';
import { FinanceSecurityVisual } from './visuals/FinanceSecurityVisual';

export const FinanceSecuritySection = () => {
  return (
    <section className="py-32 px-6 overflow-hidden border-b border-glass-border">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        
        {/* Text Content */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-6">
            Finance-Grade Security
          </div>
          <h2 className="text-4xl md:text-5xl font-semibold text-tx-primary mb-6">
            Secure by Design. <br/>Verified by Partners.
          </h2>
          <p className="text-xl text-tx-secondary leading-relaxed mb-8">
            We help you secure your cloud environments with banking-grade standards. From consolidated access control to real-time threat monitoring.
          </p>
          
          <ul className="space-y-6">
            <li className="flex gap-4">
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-1">
                <svg className="w-3.5 h-3.5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-tx-primary">Consolidated Access Control</h4>
                <p className="text-tx-secondary">Centralized IAM and SSO to ensure only the right people access your critical infrastructure.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-1">
                <svg className="w-3.5 h-3.5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-tx-primary">SOC Architecture & Design</h4>
                <p className="text-tx-secondary">We build and deploy your Security Operations Center using cloud-native tools, handing over full ownership to your team.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-1">
                <svg className="w-3.5 h-3.5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-tx-primary">Partner-Led Penetration Testing</h4>
                <p className="text-tx-secondary">We work with trusted security partners to validate your defenses with rigorous pentests.</p>
              </div>
            </li>
          </ul>
        </motion.div>
        
        {/* Visual */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="relative h-[500px]"
        >
           <FinanceSecurityVisual />
        </motion.div>

      </div>
    </section>
  );
};
