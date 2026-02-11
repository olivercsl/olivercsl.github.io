import React from 'react';
import { motion } from 'framer-motion';

export const FinanceSecurityVisual = () => {
  return (
    <div className="relative w-full aspect-[4/3] flex items-center justify-center">
      
      {/* Background Pulse */}
      <div className="absolute inset-0 flex items-center justify-center">
         <div className="w-[70%] h-[70%] bg-emerald-50/50 rounded-full blur-3xl opacity-60"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative w-full h-full p-4 md:p-8"
      >
        
        {/* 1. Main Card: Access Control (Center) */}
        <motion.div 
           initial={{ y: 20, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           transition={{ delay: 0.2, duration: 0.8 }}
           className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-xl border border-white/60 shadow-xl shadow-emerald-100/50 rounded-2xl p-6 w-64 z-20"
        >
           <div className="flex items-center gap-3 mb-4 border-b border-gray-100 pb-3">
              <div className="p-2 bg-slate-900 rounded-lg text-white">
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                 </svg>
              </div>
              <div>
                 <div className="text-[10px] font-bold text-gray-400 uppercase">Access Control</div>
                 <div className="text-sm font-bold text-gray-900">Consolidated</div>
              </div>
           </div>
           
           <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                 <span className="text-gray-600">SSO / MFA</span>
                 <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">Enforced</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                 <span className="text-gray-600">IAM Roles</span>
                 <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">Least Priv</span>
              </div>
           </div>
        </motion.div>

        {/* 2. Top Right: SOC Architecture Card */}
        <motion.div 
           initial={{ x: 20, opacity: 0 }}
           animate={{ x: 0, opacity: 1 }}
           transition={{ delay: 0.4, duration: 0.8 }}
           className="absolute top-[10%] right-[5%] bg-white/80 backdrop-blur border border-white/60 shadow-lg rounded-xl p-4 w-48 z-10"
        >
           <div className="flex justify-between items-center mb-2">
              <div className="text-[10px] font-bold text-gray-400 uppercase">SOC Architecture</div>
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
           </div>
           {/* Schematic Lines */}
           <div className="h-12 w-full flex items-center justify-center relative">
              <div className="absolute inset-0 border border-dashed border-emerald-200 rounded-lg"></div>
              <div className="w-8 h-8 bg-emerald-100 rounded-md flex items-center justify-center">
                 <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
           </div>
           <div className="mt-2 text-[10px] text-gray-500 text-center bg-gray-50 rounded py-1">
              Ready for Handover
           </div>
        </motion.div>

        {/* 3. Bottom Left: Pentest Badge */}
        <motion.div 
           initial={{ x: -20, opacity: 0 }}
           animate={{ x: 0, opacity: 1 }}
           transition={{ delay: 0.6, duration: 0.8 }}
           className="absolute bottom-[10%] left-[5%] bg-white/90 backdrop-blur border border-white/60 shadow-lg rounded-xl p-4 flex items-center gap-3 z-30"
        >
           <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
           </div>
           <div>
              <div className="text-xs font-bold text-gray-900">Partner Pentest</div>
              <div className="text-[10px] text-gray-500">Verified & Secure</div>
           </div>
        </motion.div>

        {/* 4. Decorative Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none -z-10">
           <motion.path 
             d="M 100 350 Q 200 250 300 250" 
             stroke="#e2e8f0" strokeWidth="1" fill="none" strokeDasharray="4 4"
             initial={{ pathLength: 0 }}
             animate={{ pathLength: 1 }}
             transition={{ duration: 1.5, delay: 0.5 }}
           />
           <motion.path 
             d="M 500 100 Q 400 200 350 200" 
             stroke="#e2e8f0" strokeWidth="1" fill="none" strokeDasharray="4 4"
             initial={{ pathLength: 0 }}
             animate={{ pathLength: 1 }}
             transition={{ duration: 1.5, delay: 0.7 }}
           />
        </svg>

      </motion.div>
    </div>
  );
};
