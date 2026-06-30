'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, FlaskConical } from 'lucide-react';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Library', href: '/peptides' },
  { label: 'Goals', href: '/goals' },
  { label: 'Stacking', href: '/stacking' },
  { label: 'Cycle Builder', href: '/cycle-builder' },
  { label: 'Reconstitution', href: '/reconstitution' },
];

export default function NavBar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 bg-gray-950 border-b border-gray-800/60 backdrop-blur-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 group"
            aria-label="Peptide Guide home"
          >
            <FlaskConical
              className="w-6 h-6 text-green-500 group-hover:text-green-400 transition-colors"
              aria-hidden="true"
            />
            <span className="text-green-500 group-hover:text-green-400 font-bold tracking-widest text-sm transition-colors">
              PEPTIDE GUIDE
            </span>
          </Link>

          {/* Desktop nav */}
          <ul className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={[
                    'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive(link.href)
                      ? 'text-green-400 bg-green-500/10'
                      : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800',
                  ].join(' ')}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            {mobileOpen ? (
              <X className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Menu className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-800/60 py-3">
            <ul className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={[
                      'block px-4 py-2.5 rounded-md text-sm font-medium transition-colors',
                      isActive(link.href)
                        ? 'text-green-400 bg-green-500/10'
                        : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800',
                    ].join(' ')}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>
    </header>
  );
}
