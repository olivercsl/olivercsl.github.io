import React from 'react';
import { motion } from 'framer-motion';
import { HeroDashboard } from './visuals/HeroDashboard';

export const Hero = () => {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10 grid lg:grid-cols-2 gap-12 items-center">
        
        {/* Left Column: Text */}
        <div className="text-left">
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-5xl md:text-7xl font-semibold tracking-tight text-tx-primary mb-6 leading-[1.1]"
            >
              Scale your AI Agents. <br />
              <span className="text-purple-600">Not your bill.</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-xl md:text-2xl font-medium text-tx-primary mb-8 text-balance max-w-lg"
            >
              High-performance Qwen3 tokens at a fraction of the cost. The perfect execution engine for your agentic workflows.
            </motion.p>
            
            {/* Links */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-6 text-lg font-medium"
            >
              <a href="#contact" className="inline-flex items-center justify-center px-8 py-4 bg-tx-primary text-white rounded-full hover:bg-tx-primary/90 transition-all shadow-lg hover:shadow-xl">
                Start a project
              </a>
              <a href="#services" className="text-accent hover:underline flex items-center gap-1 px-4">
                View capabilities <span className="text-sm">›</span>
              </a>
            </motion.div>
        </div>

        {/* Right Column: Visual */}
        <motion.div 
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full"
        >
           <HeroDashboard />
           {/* Reflection/Shadow under the floating device */}
           <div className="absolute -bottom-10 left-10 right-10 h-12 bg-black/5 blur-3xl rounded-[50%] -z-10"></div>
        </motion.div>

      </div>
    </section>
  );
};
