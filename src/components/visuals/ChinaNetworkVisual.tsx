import React from 'react';
import { motion } from 'framer-motion';

export const ChinaNetworkVisual = () => {
  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-50 to-white flex items-center justify-center p-8">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

      {/* Main Dashboard Card */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-black/5 overflow-hidden">
        {/* Header */}
        <div className="h-10 border-b border-gray-100 bg-gray-50/50 flex items-center px-4 gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
          <div className="ml-auto text-[10px] font-semibold text-gray-400 tracking-wider">NETWORK STATUS</div>
        </div>

        {/* Map Area */}
        <div className="relative h-64 p-6 bg-slate-900 overflow-hidden">
           {/* Abstract Map Dots */}
           <div className="absolute inset-0 opacity-20">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 border border-dashed border-white/30 rounded-full"></div>
           </div>

           {/* Route: Public Internet (Red/Slow) */}
           <div className="absolute top-1/2 left-10 flex flex-col items-center z-10">
              <div className="w-3 h-3 bg-gray-400 rounded-full mb-2"></div>
              <span className="text-[10px] text-gray-400 font-medium">Global</span>
           </div>

           {/* Route: Alibaba CEN (Green/Fast) */}
           <svg className="absolute inset-0 w-full h-full pointer-events-none">
             {/* Path Line */}
             <motion.path 
               d="M 60 128 Q 160 60 340 128" 
               stroke="#3b82f6" 
               strokeWidth="2" 
               fill="none"
               strokeDasharray="4 4"
               initial={{ strokeDashoffset: 0 }}
               animate={{ strokeDashoffset: -20 }}
               transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
             />
             {/* Moving Packet */}
             <circle r="4" fill="#60a5fa">
               <animateMotion 
                 dur="2s" 
                 repeatCount="indefinite"
                 path="M 60 128 Q 160 60 340 128"
               />
             </circle>
           </svg>

           <div className="absolute top-1/2 right-10 flex flex-col items-center z-10">
              <div className="w-3 h-3 bg-blue-500 rounded-full mb-2 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
              <span className="text-[10px] text-blue-400 font-medium">China (Shanghai)</span>
           </div>

           {/* Status Badge */}
           <div className="absolute bottom-4 left-4 bg-white/10 backdrop-blur-md border border-white/10 rounded px-3 py-1.5 flex items-center gap-2">
             <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
             <div className="text-[10px] text-white font-medium">CEN Optimized: 120ms</div>
           </div>
        </div>

        {/* Analytics Footer */}
        <div className="h-14 bg-white flex items-center justify-between px-6">
           <div className="flex flex-col">
             <span className="text-[10px] text-gray-400 font-semibold uppercase">Packet Loss</span>
             <span className="text-sm font-bold text-gray-800">Low</span>
           </div>
           <div className="h-8 w-[1px] bg-gray-100"></div>
           <div className="flex flex-col">
             <span className="text-[10px] text-gray-400 font-semibold uppercase">Jitter</span>
             <span className="text-sm font-bold text-gray-800">&lt; 5ms</span>
           </div>
           <div className="h-8 w-[1px] bg-gray-100"></div>
           <div className="flex flex-col">
             <span className="text-[10px] text-gray-400 font-semibold uppercase">Connection</span>
             <span className="text-sm font-bold text-emerald-600">Stable</span>
           </div>
        </div>
      </div>
    </div>
  );
};
