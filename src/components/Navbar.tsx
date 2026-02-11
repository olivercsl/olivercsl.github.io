import React, { useState, useEffect } from 'react';

export const Navbar = () => {
  // Initialize to false for SSR consistency.
  // The transition to 'nav-glass' will happen after mount if scrolled.
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    // This code only runs on the client after mount
    const handleScroll = () => {
      // Only access window on the client
      setIsScrolled(window.scrollY > 10);
    };

    // Set initial state correctly on client mount based on current scroll position
    handleScroll(); 
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []); // Empty dependency array means run once on mount and once on unmount

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'nav-glass h-12' : 'bg-transparent h-16'}`}>
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <img src="/logo-circuit.svg" alt="Cloudzeta" className="h-9 w-auto" />
          <span className="text-xl font-bold tracking-tight text-tx-primary">Cloudzeta</span>
        </a>
        
        <div className="hidden md:flex items-center gap-8 text-xs font-medium text-tx-primary/80">
          <a href="#services" className="hover:text-accent transition-colors">Services</a>
          <a href="#china" className="hover:text-accent transition-colors">China Access</a>
          <a href="#contact" className="px-3 py-1.5 bg-tx-primary text-white rounded-full hover:bg-tx-primary/90 transition-colors">
            Contact
          </a>
        </div>
      </div>
    </nav>
  );
};
