import React from 'react';

export const ContactSection = () => {
  return (
    <section id="contact" className="py-24 bg-surface-hover border-t border-glass-border">
      <div className="max-w-4xl mx-auto px-6 text-center">
        
        <h2 className="text-3xl md:text-4xl font-semibold text-tx-primary mb-6">
          Secure. Intelligent. Optimized.
        </h2>
        <p className="text-xl text-tx-secondary mb-10 max-w-2xl mx-auto">
          Whether you need to drive down cloud costs or deploy finance-grade infrastructure, our team is ready to engineer the right solution.
        </p>

        <div className="flex flex-col md:flex-row justify-center gap-6 mb-16">
           {/* Email Card */}
           <a href="mailto:info@cloudzeta.solutions" className="group bg-white p-8 rounded-2xl border border-glass-border shadow-sm hover:shadow-md transition-all flex flex-col items-center w-full md:w-80">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                 <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-tx-primary mb-1">Email Us</h3>
              <p className="text-tx-secondary text-sm">info@cloudzeta.solutions</p>
           </a>

           {/* Office Card */}
           <div className="bg-white p-8 rounded-2xl border border-glass-border shadow-sm flex flex-col items-center w-full md:w-80">
              <div className="w-12 h-12 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center mb-4">
                 <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-tx-primary mb-1">Offices</h3>
              <p className="text-tx-secondary text-sm">Sydney & Hong Kong</p>
           </div>
        </div>

        {/* Simple Footer Links */}
        <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-tx-secondary">
           <p>© {new Date().getFullYear()} Cloudzeta Solutions. All rights reserved.</p>
           <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-tx-primary">Privacy Policy</a>
              <a href="#" className="hover:text-tx-primary">Terms of Service</a>
           </div>
        </div>

      </div>
    </section>
  );
};