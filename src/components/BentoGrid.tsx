import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Zap, Globe, Server, Activity, Lock, Cloud, Brain, Database, Cpu } from 'lucide-react';

const tiles = [
  // 1. AWS (Flagship - 2 col)
  {
    span: "md:col-span-2",
    title: "AWS Cloud Solutions",
    desc: "Full access to AWS services at competitive rates. We handle procurement, account setup, and ongoing local support as your Advanced Partner.",
    icon: Server,
  },
  // 2. AI (High Value - 1 col)
  {
    span: "md:col-span-1",
    title: "Smart Token Sourcing",
    desc: "Stop overpaying for intelligence. Access top-tier model performance at wholesale market rates.",
    icon: Brain,
  },
  // 3. Go China (Major Differentiator - 2 col)
  {
    span: "md:col-span-2",
    title: "Go China Solutions",
    desc: "Seamless China connectivity via Alibaba Cloud CEN & China fibre routes. We handle the technical complexity of cross-border routing and ICP filing compliance.",
    icon: Globe,
  },
  // 4. Managed Services (Smaller Scope - 1 col)
  {
    span: "md:col-span-1",
    title: "Managed Infrastructure",
    desc: "Expert oversight for your critical workloads. Regular patching, security hardening, and architecture reviews.",
    icon: Activity,
  },
  // 5. Cloudflare (Defense - 1 col)
  {
    span: "md:col-span-1",
    title: "Cloudflare Security",
    desc: "Enterprise WAF, CDN, and DDoS protection to defend your public-facing assets.",
    icon: ShieldCheck,
  },
  // 6. Pentest (Security - 1 col)
  {
    span: "md:col-span-1",
    title: "Penetration Testing",
    desc: "Rigorous security validation by certified partners. Identify vulnerabilities before they are exploited.",
    icon: Lock,
  },
  // 7. Fortinet & GCP (Secondary - 1 col)
  {
    span: "md:col-span-1",
    title: "Fortinet & GCP",
    desc: "Secure hardware networking and Google Cloud data solutions.",
    icon: Zap,
  },
];

export const BentoGrid = () => {
  return (
    <section className="px-6 pb-32 max-w-7xl mx-auto bg-surface py-24 rounded-3xl my-24 border border-glass-border">
      <div className="text-center mb-16">
         <h2 className="text-4xl md:text-5xl font-semibold text-tx-primary mb-4">Our Services.</h2>
         <p className="text-xl text-tx-secondary">Procurement, licensing, and managed solutions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6">
        {tiles.map((tile, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: i * 0.1, duration: 0.6 }}
            className={`
              bg-white rounded-2xl p-8 relative overflow-hidden group 
              shadow-sm hover:shadow-xl transition-all duration-500 border border-glass-border
              ${tile.span}
            `}
          >
            <div className="relative z-10 h-full flex flex-col justify-between min-h-[200px]">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gray-50 rounded-lg text-tx-primary">
                    <tile.icon size={24} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-semibold text-tx-primary">{tile.title}</h3>
                </div>
                <p className="text-tx-secondary text-base leading-relaxed">
                  {tile.desc}
                </p>
              </div>
              
              <div className="mt-6">
                <span className="text-sm font-semibold text-accent opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 inline-flex items-center gap-1">
                  View details <span>›</span>
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};