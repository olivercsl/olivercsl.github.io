import React from 'react';
import { motion } from 'framer-motion';

const steps = [
  {
    number: "01",
    title: "Audit & Analysis",
    desc: "We review your current cloud spend, security posture, and connectivity bottlenecks.",
    color: "bg-blue-50 text-blue-600"
  },
  {
    number: "02",
    title: "Solution Design",
    desc: "We architect a compliant, low-latency topology optimized for finance workflows.",
    color: "bg-indigo-50 text-indigo-600"
  },
  {
    number: "03",
    title: "Implementation",
    desc: "Our team builds the environment using Infrastructure-as-Code (Terraform/CDK).",
    color: "bg-purple-50 text-purple-600"
  },
  {
    number: "04",
    title: "Handover",
    desc: "We transfer full ownership, keys, and documentation to your internal team.",
    color: "bg-emerald-50 text-emerald-600"
  }
];

export const ProcessSection = () => {
  return (
    <section className="py-24 bg-white border-b border-glass-border overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold text-tx-primary mb-4">How We Work.</h2>
          <p className="text-xl text-tx-secondary">From discovery to ownership handover.</p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-8 left-0 w-full h-[2px] bg-gradient-to-r from-blue-100 via-purple-100 to-emerald-100 -z-10"></div>

          {steps.map((step, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              viewport={{ once: true }}
              className="relative bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group"
            >
              {/* Number Badge */}
              <div className={`w-16 h-16 ${step.color} rounded-2xl flex items-center justify-center text-xl font-bold mb-6 group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                {step.number}
              </div>
              
              <h3 className="text-lg font-semibold text-tx-primary mb-3">{step.title}</h3>
              <p className="text-sm text-tx-secondary leading-relaxed">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};
