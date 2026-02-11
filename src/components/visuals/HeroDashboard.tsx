import React from 'react';
import { motion } from 'framer-motion';

export const HeroDashboard = () => {
  return (
    <div className="relative w-full aspect-[4/3] flex items-center justify-center">
      
      {/* Background Glow */}
      <div className="absolute inset-0 flex items-center justify-center">
         <div className="w-[80%] h-[80%] bg-gradient-to-tr from-purple-100/40 to-blue-100/40 rounded-full blur-3xl opacity-50"></div>
      </div>

      {/* Main Container - Floating Elements */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative w-full h-full p-4 md:p-8 flex items-center justify-center"
      >
        
        {/* Main "Cost vs Performance" Card */}
        <motion.div 
           initial={{ y: 20, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           transition={{ delay: 0.2, duration: 0.8 }}
           className="relative bg-white/80 backdrop-blur-xl border border-white/60 shadow-2xl rounded-2xl p-6 w-full max-w-md z-20"
        >
           <div className="flex justify-between items-center mb-6">
              <div>
                 <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">AI Model Comparison</div>
                 <div className="text-lg font-bold text-gray-900">Powerful AI, Unbeatable Price</div>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
           </div>

           {/* Dual Pricing Grid */}
           <div className="grid grid-cols-2 gap-6">
             {/* Input Column */}
             <div>
               <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 text-center">Input</div>
               <div className="space-y-3">
                 <div>
                   <div className="flex justify-between text-xs font-medium text-gray-500 mb-1">
                     <span>Claude Sonnet 4.5</span>
                     <span>$3.00</span>
                   </div>
                   <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                     <motion.div 
                       initial={{ width: 0 }}
                       whileInView={{ width: "100%" }}
                       transition={{ duration: 1, delay: 0.5 }}
                       className="h-full bg-gray-300"
                     />
                   </div>
                 </div>
                 <div>
                   <div className="flex justify-between text-xs font-medium text-gray-900 mb-1">
                     <span className="text-purple-700 font-bold">Cloudzeta Qwen3 Max</span>
                     <span className="text-purple-700 font-bold">$1.20</span>
                   </div>
                   <div className="h-2 w-full bg-purple-50 rounded-full overflow-hidden">
                     <motion.div 
                       initial={{ width: 0 }}
                       whileInView={{ width: "40%" }}
                       transition={{ duration: 1, delay: 0.5 }}
                       className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                     />
                   </div>
                 </div>
               </div>
             </div>

             {/* Output Column */}
             <div>
               <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 text-center">Output</div>
               <div className="space-y-3">
                 <div>
                   <div className="flex justify-between text-xs font-medium text-gray-500 mb-1">
                     <span>Claude Sonnet 4.5</span>
                     <span>$15.00</span>
                   </div>
                   <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                     <motion.div 
                       initial={{ width: 0 }}
                       whileInView={{ width: "100%" }}
                       transition={{ duration: 1, delay: 0.5 }}
                       className="h-full bg-gray-300"
                     />
                   </div>
                 </div>
                 <div>
                   <div className="flex justify-between text-xs font-medium text-gray-900 mb-1">
                     <span className="text-purple-700 font-bold">Cloudzeta Qwen3 Max</span>
                     <span className="text-purple-700 font-bold">$6.00</span>
                   </div>
                   <div className="h-2 w-full bg-purple-50 rounded-full overflow-hidden">
                     <motion.div 
                       initial={{ width: 0 }}
                       whileInView={{ width: "40%" }}
                       transition={{ duration: 1, delay: 0.5 }}
                       className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                     />
                   </div>
                 </div>
               </div>
             </div>
           </div>

           <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">Your Savings</span>
              <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">60% Lower Cost</span>
           </div>

           {/* Integrated Info */}
           <div className="mt-6 pt-4 border-t border-gray-100 space-y-2">
             <div className="flex items-center gap-2 text-xs">
               <div className="w-3 h-3 rounded-full bg-purple-500"></div>
               <span><span className="font-bold">Qwen3 Max:</span> Powerful & Cost-Effective</span>
             </div>
             <div className="flex items-center gap-2 text-xs">
               <div className="w-3 h-3 rounded-full bg-gray-500"></div>
               <span><span className="font-bold">Sonnet 4.5:</span> Premium Pricing</span>
             </div>
           </div>
        </motion.div>
      </motion.div>
    </div>
  );
};