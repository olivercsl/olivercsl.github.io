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

           {/* Pricing Table */}
           <div className="space-y-6">
             
             {/* Header Row */}
             <div className="grid grid-cols-3 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">
               <span>Model</span>
               <span className="text-right">Input</span>
               <span className="text-right">Output</span>
             </div>

             {/* Row 1: Claude Sonnet 4.5 */}
             <div className="grid grid-cols-3 items-center text-sm">
               <span className="font-medium text-gray-500">Claude Sonnet 4.5</span>
               <span className="text-right text-gray-500">$3.00</span>
               <span className="text-right text-gray-500">$15.00</span>
             </div>

             {/* Row 2: GPT-5 / Gemini 2.5 */}
             <div className="grid grid-cols-3 items-center text-sm">
               <span className="font-medium text-gray-500">GPT-5 / Gemini 2.5</span>
               <span className="text-right text-gray-500">$1.25</span>
               <span className="text-right text-gray-500">$10.00</span>
             </div>

             {/* Row 3: Qwen3 Max (Highlighted) */}
             <div className="relative grid grid-cols-3 items-center text-sm bg-purple-50 p-3 -mx-3 rounded-lg border border-purple-100">
               <span className="font-bold text-purple-700">Qwen3 Max</span>
               <span className="text-right font-bold text-purple-700">$1.20</span>
               <span className="text-right font-bold text-purple-700">$6.00</span>
               
               {/* Savings Badge */}
               <div className="absolute -right-2 -top-3 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                 Best Value
               </div>
             </div>

           </div>

           <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">Savings vs GPT-5</span>
              <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">40% Lower Output Cost</span>
           </div>
        </motion.div>
      </motion.div>
    </div>
  );
};