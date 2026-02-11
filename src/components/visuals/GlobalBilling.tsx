import React from 'react';
import { motion } from 'framer-motion';

export const GlobalBilling = () => {
  return (
    <div className="relative w-full aspect-video md:h-[500px] md:aspect-auto flex items-center justify-center">
      
      {/* Background Glow */}
      <div className="absolute inset-0 flex items-center justify-center">
         <div className="w-[70%] h-[70%] bg-gradient-to-tr from-purple-50/50 to-blue-50/50 rounded-full blur-3xl opacity-60"></div>
      </div>

      {/* Main Invoice Card - Floating, Borderless */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
      >
        
        {/* Header */}
        <div className="h-16 border-b border-gray-100 flex items-center justify-between px-6 bg-slate-900">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">C</div>
              <span className="text-white text-sm font-semibold tracking-wide">Cloudzeta Consolidated</span>
           </div>
           <span className="text-[10px] font-mono text-slate-400">INV-2026-02</span>
        </div>

        {/* Invoice Body */}
        <div className="p-6 space-y-4">
           
           {/* Line Items */}
           <div className="space-y-3">
             <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
               <div className="flex items-center gap-3">
                 <img src="/assets/aws-logo.png" className="h-5 w-auto grayscale opacity-80" alt="AWS" />
                 <span className="text-sm text-gray-700">AWS Infrastructure</span>
               </div>
               <span className="text-sm font-medium text-gray-900">$4,250.00</span>
             </div>

             <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
               <div className="flex items-center gap-3">
                 <img src="/assets/microsoft.png" className="h-5 w-auto grayscale opacity-80" alt="Azure" />
                 <span className="text-sm text-gray-700">Azure Services</span>
               </div>
               <span className="text-sm font-medium text-gray-900">$2,100.00</span>
             </div>

             <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
               <div className="flex items-center gap-3">
                 <img src="/assets/alibaba_l.png" className="h-5 w-auto grayscale opacity-80" alt="Alibaba" />
                 <span className="text-sm text-gray-700">Alibaba Cloud</span>
               </div>
               <span className="text-sm font-medium text-gray-900">$1,850.00</span>
             </div>
           </div>

           {/* Total & Savings */}
           <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-end">
              <div>
                 <div className="text-[10px] uppercase font-bold text-gray-400">Total Due</div>
                 <div className="text-3xl font-bold text-gray-900">$8,200.00</div>
              </div>
              <div className="text-right">
                 <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-xs font-bold mb-1 inline-block">
                    Optimized Spend
                 </div>
                 <div className="text-[10px] text-gray-400">via Architecture Review</div>
              </div>
           </div>

        </div>
      </motion.div>

      {/* Floating Badge */}
      <motion.div 
         initial={{ x: 20, opacity: 0 }}
         whileInView={{ x: 0, opacity: 1 }}
         transition={{ delay: 0.5 }}
         className="absolute -right-4 top-10 bg-white border border-gray-100 shadow-lg px-4 py-2 rounded-xl flex items-center gap-2 z-10"
      >
         <div className="w-2 h-2 rounded-full bg-green-500"></div>
         <span className="text-xs font-bold text-gray-600">Paid • Single Currency</span>
      </motion.div>

    </div>
  );
};
