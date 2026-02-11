import React from 'react';
import { motion } from 'framer-motion';

export const ChinaDashboard = () => {
  return (
    <div className="relative w-full aspect-video md:h-[500px] md:aspect-auto flex items-center justify-center">
      
      {/* Background Glow */}
      <div className="absolute inset-0 flex items-center justify-center">
         <div className="w-[80%] h-[80%] bg-gradient-to-tr from-blue-50/50 to-emerald-50/50 rounded-full blur-3xl opacity-60"></div>
      </div>

      {/* Main Dashboard - No Frame/Shadow Wrapper */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative w-full max-w-lg flex flex-col gap-4"
      >
        
        {/* Header - Floating */}
        <div className="h-14 flex items-center justify-between px-6 bg-white/80 backdrop-blur-xl border border-white/60 shadow-lg rounded-2xl">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-md shadow-blue-200">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider leading-none mb-0.5">CEN Status</div>
                <div className="text-sm font-bold text-gray-900 leading-none">Global Acceleration</div>
              </div>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
             <span className="text-xs font-semibold text-emerald-600">Operational</span>
           </div>
        </div>

        {/* Route Table - Floating Rows */}
        <div className="space-y-2">
           <RouteRow from="US East" to="Shanghai" status="Premium" />
           <RouteRow from="Tokyo" to="Shanghai" status="Premium" />
           <RouteRow from="Singapore" to="Shenzhen" status="Premium" />
           <RouteRow from="London" to="Beijing" status="Premium" />
           <RouteRow from="Sydney" to="Guangzhou" status="Premium" />
        </div>

        {/* Footer Stats - Floating */}
        <div className="px-6 py-4 bg-white/80 backdrop-blur-xl border border-white/60 shadow-lg rounded-2xl">
           {/* Bandwidth Usage Graph */}
           <div className="mb-3 flex justify-between items-center">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Network Utilization</span>
              <div className="flex gap-3">
                 <span className="text-[10px] text-gray-500 font-medium">Load: <span className="text-gray-900 font-bold">Balanced</span></span>
              </div>
           </div>
           
           <div className="relative h-12 w-full overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                 <defs>
                    <linearGradient id="usageGrad" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                       <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                 </defs>
                 {/* Area */}
                 <path d="M0 40 L0 30 C10 25 20 35 30 20 C40 5 50 15 60 25 C70 35 80 10 90 15 L100 20 L100 40 Z" fill="url(#usageGrad)" />
                 {/* Line */}
                 <path d="M0 30 C10 25 20 35 30 20 C40 5 50 15 60 25 C70 35 80 10 90 15 L100 20" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
           </div>
        </div>

      </motion.div>
    </div>
  );
};

const RouteRow = ({ from, to, status }: { from: string, to: string, status: string }) => (
  <div className="group flex items-center justify-between p-3 bg-white/60 backdrop-blur-md border border-white/40 shadow-sm rounded-xl hover:bg-white/80 transition-colors">
     <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 w-28">
           <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
           <span className="text-sm font-medium text-gray-700">{from}</span>
        </div>
        
        {/* Animated Arrow */}
        <div className="flex flex-col items-center w-8 opacity-30 group-hover:opacity-100 transition-opacity">
           <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
           </svg>
        </div>

        <div className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
           <span className="text-sm font-medium text-gray-700">{to}</span>
        </div>
     </div>

     <div className="flex items-center gap-3">
        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100 uppercase tracking-wider">{status}</span>
        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
           <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
           </svg>
        </div>
     </div>
  </div>
);
