import React from 'react';
import { motion } from 'framer-motion';

const modelRows = [
  {
    model: 'Claude Sonnet 4.5',
    input: '$3.00',
    output: '$15.00',
    type: 'benchmark' as const,
  },
  {
    model: 'GPT-5 / Gemini 2.5',
    input: '$1.25',
    output: '$10.00',
    type: 'benchmark' as const,
  },
  {
    model: 'qwen3-max',
    input: '$1.20',
    output: '$6.00',
    type: 'primary' as const,
    badge: 'Flagship',
  },
  {
    model: 'qwen3.5-plus',
    input: '$0.40',
    output: '$2.40',
    type: 'reference' as const,
    badge: 'Execution',
  },
];

export const HeroDashboard = () => {
  return (
    <div className="relative w-full aspect-[4/3] flex items-center justify-center">
      {/* Background Glow */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[80%] h-[80%] bg-gradient-to-tr from-purple-100/40 to-blue-100/40 rounded-full blur-3xl opacity-50"></div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative w-full h-full p-4 md:p-8 flex items-center justify-center"
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="relative bg-white/80 backdrop-blur-xl border border-white/60 shadow-2xl rounded-2xl p-6 w-full max-w-xl z-20"
        >
          <div className="flex justify-between items-start mb-5 gap-3">
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">AI Model Comparison</div>
              <div className="text-lg font-bold text-gray-900">Powerful AI, Transparent Pricing</div>
            </div>
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-[1.8fr_1fr_1fr] bg-gray-50/80 px-3 py-2 text-[11px] font-bold tracking-wider uppercase text-gray-500">
              <span>Model</span>
              <span className="text-right">Input</span>
              <span className="text-right">Output</span>
            </div>

            {modelRows.map((row, index) => {
              const isPrimary = row.type === 'primary';
              const isReference = row.type === 'reference';

              return (
                <motion.div
                  key={row.model}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.2 + index * 0.06 }}
                  className={`grid grid-cols-[1.8fr_1fr_1fr] px-3 py-3 text-sm border-t border-gray-100 items-center ${
                    isPrimary
                      ? 'bg-gradient-to-r from-purple-50 to-indigo-50'
                      : isReference
                      ? 'bg-emerald-50/40'
                      : 'bg-white/90'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`truncate ${
                        isPrimary ? 'text-purple-700 font-bold' : isReference ? 'text-emerald-700 font-semibold' : 'text-gray-800 font-medium'
                      }`}
                    >
                      {row.model}
                    </span>
                    {row.badge && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${
                          isPrimary
                            ? 'bg-purple-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {row.badge}
                      </span>
                    )}
                  </div>

                  <span className={`text-right font-semibold ${isPrimary ? 'text-purple-700' : isReference ? 'text-emerald-700' : 'text-gray-700'}`}>
                    {row.input}
                  </span>
                  <span className={`text-right font-semibold ${isPrimary ? 'text-purple-700' : isReference ? 'text-emerald-700' : 'text-gray-700'}`}>
                    {row.output}
                  </span>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">qwen3-max vs GPT-5/Gemini</span>
              <span className="text-sm font-bold text-green-700 bg-green-50 px-2 py-1 rounded-lg">40% Lower Output Cost</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">qwen3.5-plus vs Claude Sonnet 4.5</span>
              <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">~84% Lower Cost</span>
            </div>
          </div>

          <div className="mt-3 text-[11px] text-gray-500 leading-relaxed">
            Pricing shown in USD per 1M tokens. Use Claude for architecture and qwen3.5-plus for execution-heavy labor.
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};
