import React from 'react';
import { motion } from 'framer-motion';

export const BillingTrends = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-visible p-6 md:p-8">
      
      {/* Abstract Background - Subtle & Premium */}
      <div className="absolute inset-0 overflow-visible">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-50/50 rounded-full blur-3xl opacity-60 mix-blend-multiply"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-50/50 rounded-full blur-3xl opacity-60 mix-blend-multiply"></div>
      </div>

      <div className="relative w-full max-w-[340px] flex flex-col gap-4 z-10">
        
        {/* TOP: Cost Optimization Trend */}
        <motion.div 
           initial={{ y: 20, opacity: 0 }}
           whileInView={{ y: 0, opacity: 1 }}
           transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
           className="bg-white/90 backdrop-blur-xl border border-white/60 shadow-[0_4px_24px_rgba(0,0,0,0.04)] rounded-[20px] p-5 relative overflow-hidden"
        >
           <div className="flex justify-between items-end mb-6">
              <div>
                 <h3 className="text-[13px] font-semibold text-gray-900 tracking-tight">Monthly Spend</h3>
                 <p className="text-[11px] text-gray-500 font-medium mt-0.5">Post-Optimization</p>
              </div>
              <div className="flex items-baseline gap-1">
                 <span className="text-lg font-bold text-gray-900 tracking-tight">$12.4k</span>
                 <span className="text-[11px] font-semibold text-emerald-600">↓ 35%</span>
              </div>
           </div>
           
           {/* Chart */}
           <div className="relative h-20 w-full">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none">
                 <defs>
                    <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.1" />
                       <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                 </defs>
                 
                 {/* Area */}
                 <path 
                    d="M0 40 L0 10 C 20 10, 40 15, 50 25 C 60 35, 80 30, 100 32 L 100 40 Z" 
                    fill="url(#trendFill)" 
                 />
                 
                 {/* Line */}
                 <path 
                    d="M0 10 C 20 10, 40 15, 50 25 C 60 35, 80 30, 100 32" 
                    fill="none" 
                    stroke="#3b82f6" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                 />
                 
                 {/* Event Marker */}
                 <g transform="translate(50, 25)">
                    <circle r="3" fill="#3b82f6" className="animate-pulse opacity-40"/>
                    <circle r="2" fill="#3b82f6" stroke="white" strokeWidth="1"/>
                 </g>
              </svg>

              {/* Tag */}
              <div className="absolute top-[40%] left-[50%] transform -translate-x-1/2 -translate-y-[140%]">
                 <div className="bg-gray-900 text-white text-[9px] font-medium px-2 py-0.5 rounded shadow-sm whitespace-nowrap">
                    Review
                 </div>
                 <div className="w-[1px] h-3 bg-gray-900/10 mx-auto"></div>
              </div>
           </div>
        </motion.div>

        {/* BOTTOM: Consolidated Billing Card */}
        <motion.div 
           initial={{ y: 20, opacity: 0 }}
           whileInView={{ y: 0, opacity: 1 }}
           transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
           className="bg-white/90 backdrop-blur-xl border border-white/60 shadow-[0_4px_24px_rgba(0,0,0,0.04)] rounded-[20px] p-5 hover:scale-[1.01] transition-transform duration-300"
        >
           <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] font-semibold text-gray-900">Unified Invoice</span>
              <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">Net 30</span>
           </div>

           <div className="space-y-3">
              {/* Line Items */}
              <div className="flex items-center justify-between text-[11px]">
                 <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FF9900]"></div>
                    <span className="text-gray-600 font-medium">AWS Computing</span>
                 </div>
                 <span className="text-gray-900 font-mono">$4,120</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                 <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0078D4]"></div>
                    <span className="text-gray-600 font-medium">Azure Services</span>
                 </div>
                 <span className="text-gray-900 font-mono">$2,850</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                 <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FF6A00]"></div>
                    <span className="text-gray-600 font-medium">Alibaba Cloud</span>
                 </div>
                 <span className="text-gray-900 font-mono">$1,230</span>
              </div>

              {/* Total Divider */}
              <div className="h-[1px] w-full bg-gray-100 mt-2 mb-2"></div>

              <div className="flex items-center justify-between">
                 <span className="text-[11px] font-semibold text-gray-500">Total Due</span>
                 <span className="text-[14px] font-bold text-gray-900 tracking-tight">$8,200.00</span>
              </div>
           </div>
        </motion.div>

      </div>
    </div>
  );
};