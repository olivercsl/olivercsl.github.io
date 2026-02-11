import React from 'react';
import { motion } from 'framer-motion';

export const ChinaMap = () => {
  return (
    <div className="relative w-full aspect-video md:h-[500px] md:aspect-auto flex flex-col md:block items-center justify-center overflow-visible">
      
      {/* 1. Dotted Map Container - NEW DESIGN */}
      <div className="relative w-full h-full min-h-[300px]">
          {/* Map SVG (Dots) - Simplified */}
          <svg className="w-full h-full text-slate-200" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid slice" fill="currentColor">
             {/* North America */}
             <circle cx="200" cy="150" r="4" /> <circle cx="240" cy="160" r="4" /> 
             <circle cx="180" cy="200" r="4" /> <circle cx="230" cy="220" r="4" />
             <circle cx="250" cy="280" r="4" /> <circle cx="290" cy="380" r="4" />
             
             {/* Europe */}
             <circle cx="480" cy="140" r="4" /> <circle cx="520" cy="160" r="4" />
             <circle cx="500" cy="190" r="4" /> <circle cx="540" cy="180" r="4" />
             
             {/* Asia */}
             <circle cx="680" cy="160" r="4" /> <circle cx="740" cy="190" r="4" /> <circle cx="790" cy="150" r="4" />
             <circle cx="830" cy="180" r="4" /> <circle cx="860" cy="220" r="4" /> 
             
             {/* Australia */}
             <circle cx="850" cy="360" r="4" /> <circle cx="900" cy="370" r="4" /> <circle cx="870" cy="400" r="4" />
             
             {/* Africa */}
             <circle cx="500" cy="260" r="4" /> <circle cx="560" cy="320" r="4" /> <circle cx="530" cy="380" r="4" />
          </svg>

          {/* Connection Lines (Overlay SVG) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.1" />
                <stop offset="50%" stopColor="#3b82f6" stopOpacity="1" />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity="1" />
              </linearGradient>
            </defs>
            <RoutePath start={{x: 230, y: 160}} end={{x: 740, y: 190}} delay={0} /> {/* US -> China */}
            <RoutePath start={{x: 520, y: 160}} end={{x: 740, y: 190}} delay={1} /> {/* UK -> China */}
            <RoutePath start={{x: 850, y: 360}} end={{x: 740, y: 190}} delay={2} /> {/* AUS -> China */}
            <RoutePath start={{x: 830, y: 180}} end={{x: 740, y: 190}} delay={0.5} /> {/* JP -> China */}
          </svg>

          {/* Floating Nodes */}
          {/* China Hub */}
          <div className="absolute top-[38%] right-[26%] z-10 flex flex-col items-center">
             <div className="relative">
                <div className="w-4 h-4 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50 z-10 relative"></div>
                <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-75"></div>
             </div>
             <div className="mt-2 px-3 py-1 bg-white/90 backdrop-blur border border-blue-100 rounded-full shadow-sm">
                <span className="text-xs font-bold text-blue-700">China Backbone</span>
             </div>
          </div>

          <SourceNode label="US" x="23%" y="32%" />
          <SourceNode label="UK" x="52%" y="32%" />
          <SourceNode label="AUS" x="85%" y="72%" />
          <SourceNode label="JP" x="83%" y="36%" />
      </div>

      {/* 5. Metrics Card (Floating, responsive) */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="relative md:absolute md:bottom-4 md:left-4 mt-4 md:mt-0 w-full md:w-auto bg-white/90 backdrop-blur-md border border-white/60 shadow-lg rounded-xl p-4 flex justify-between md:justify-start gap-4 md:gap-6"
      >
         <div className="text-center md:text-left">
            <div className="text-[10px] uppercase font-bold text-gray-400">Packet Loss</div>
            <div className="text-sm font-bold text-gray-900">Very Low</div>
         </div>
         <div className="w-[1px] h-8 bg-gray-200"></div>
         <div className="text-center md:text-left">
            <div className="text-[10px] uppercase font-bold text-gray-400">Connection</div>
            <div className="text-sm font-bold text-emerald-600">Stable</div>
         </div>
      </motion.div>

    </div>
  );
};

const RoutePath = ({ start, end, delay }: { start: {x: number, y: number}, end: {x: number, y: number}, delay: number }) => {
  const midX = (start.x + end.x) / 2;
  const midY = Math.min(start.y, end.y) - 60; 
  const path = `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;

  return (
    <>
      <path d={path} stroke="#e2e8f0" strokeWidth="2" fill="none" strokeDasharray="4 4" />
      <circle r="3" fill="#3b82f6">
        <animateMotion dur="3s" repeatCount="indefinite" path={path} begin={delay} keyPoints="0;1" keyTimes="0;1" calcMode="linear" />
      </circle>
    </>
  );
};

const SourceNode = ({ label, x, y }: { label: string, x: string, y: string }) => (
  <div className="absolute w-2 h-2 bg-gray-300 rounded-full" style={{ left: x, top: y }}>
     <span className="absolute top-3 left-1/2 -translate-x-1/2 text-[10px] font-medium text-gray-400">{label}</span>
  </div>
);
