import React from 'react';
import { motion } from 'framer-motion';

const logos = [
  { name: "AWS", url: "/assets/aws-logo.png" },
  { name: "Alibaba Cloud", url: "/assets/alibaba_l.png" },
  { name: "Microsoft", url: "/assets/microsoft.png" },
  { name: "Cloudflare", url: "/assets/cloudflare.png" },
  { name: "Tencent Cloud", url: "/assets/tencent_l.png" }
];

export const LogoStrip = () => {
  return (
    <section className="py-12 border-b border-glass-border">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-center text-sm font-medium text-tx-secondary mb-8">Trusted by global enterprises and built on top-tier infrastructure</p>
        <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20">
          {logos.map((logo, i) => (
            <img 
              key={i} 
              src={logo.url} 
              alt={logo.name} 
              className={`object-contain transition-transform duration-300 hover:scale-125 cursor-pointer ${
                logo.name === "Microsoft" 
                  ? "h-17 md:h-21 w-auto" 
                  : "h-8 md:h-10 w-auto"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};