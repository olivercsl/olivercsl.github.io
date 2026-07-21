import React, { useState, useEffect } from 'react';

interface NavbarProps {
  /**
   * Logo only, no navigation links. Used on the password generator, where any
   * commercial link would undercut the page's "we ask nothing of you" promise.
   */
  minimal?: boolean;
}

const LINKS = [
  { href: '/#services', label: 'Services' },
  { href: '/tools', label: 'Tools' },
  { href: '/#contact', label: 'Contact' },
];

export const Navbar = ({ minimal = false }: NavbarProps) => {
  // Initialize to false for SSR consistency.
  // The transition to 'nav-glass' will happen after mount if scrolled.
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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

  // Close the menu on Escape, for keyboard users.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled || menuOpen ? 'nav-glass' : 'bg-transparent'
      } ${isScrolled ? 'h-12' : 'h-16'}`}
    >
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        <a href="/" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
          <img src="/logo-circuit.svg" alt="Cloudzeta" className="h-9 w-auto" />
          <span className="text-xl font-bold tracking-tight text-tx-primary">Cloudzeta</span>
        </a>

        {!minimal && (
          <>
            {/* Desktop: inline links. Root-relative so they resolve from
                sub-pages (e.g. /tools/*) too. */}
            <div className="hidden md:flex items-center gap-8 text-xs font-medium text-tx-primary/80">
              <a href="/#services" className="hover:text-accent transition-colors">Services</a>
              <a href="/tools" className="hover:text-accent transition-colors">Tools</a>
              <a href="/#contact" className="px-3 py-1.5 bg-tx-primary text-white rounded-full hover:bg-tx-primary/90 transition-colors">
                Contact
              </a>
            </div>

            {/* Mobile: hamburger toggling a dropdown panel. */}
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              className="md:hidden p-2 -mr-2 text-tx-primary"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Mobile dropdown. Rendered outside the bar so it hangs below it. */}
      {!minimal && menuOpen && (
        <div id="mobile-menu" className="md:hidden nav-glass border-t border-glass-border">
          <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="py-3 text-base font-medium text-tx-primary hover:text-accent transition-colors border-b border-glass-border last:border-0"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};
