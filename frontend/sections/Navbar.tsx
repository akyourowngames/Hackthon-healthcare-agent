'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

const navItems = [
  { label: 'Features', href: '#features' },
  { label: 'Timeline', href: '#timeline' },
  { label: 'Demo', href: '#demo' },
  { label: 'About', href: '#about' },
];

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6">
      <nav
        className="pointer-events-auto mx-auto w-full max-w-7xl rounded-2xl border border-white/12 bg-white/[0.04] backdrop-blur-xl"
        aria-label="Primary"
      >
        <div className="flex h-16 items-center justify-between px-4 sm:px-5 lg:px-7">
          <a
            href="#"
            className="text-base font-semibold tracking-[-0.02em] text-zinc-100 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f14]"
          >
            Vaidy
          </a>

          <ul className="hidden items-center gap-1 md:flex" role="list">
            {navItems.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm text-zinc-300 transition-colors hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/35"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="hidden md:flex">
            <a
              href="#"
              className="vaidy-button-primary inline-flex items-center rounded-lg px-5 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f14]"
            >
              Try Vaidy
            </a>
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-zinc-200 transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/40 md:hidden"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav-panel"
          >
            <span className="sr-only">Toggle menu</span>
            <motion.span
              className="relative block h-4 w-4"
              animate={isMenuOpen ? 'open' : 'closed'}
              initial={false}
            >
              <motion.span
                className="absolute left-0 top-1/2 block h-px w-4 bg-current"
                variants={{
                  closed: { rotate: 0, y: -4 },
                  open: { rotate: 45, y: 0 },
                }}
                transition={{ duration: 0.2 }}
              />
              <motion.span
                className="absolute left-0 top-1/2 block h-px w-4 bg-current"
                variants={{
                  closed: { opacity: 1 },
                  open: { opacity: 0 },
                }}
                transition={{ duration: 0.15 }}
              />
              <motion.span
                className="absolute left-0 top-1/2 block h-px w-4 bg-current"
                variants={{
                  closed: { rotate: 0, y: 4 },
                  open: { rotate: -45, y: 0 },
                }}
                transition={{ duration: 0.2 }}
              />
            </motion.span>
          </button>
        </div>

        <AnimatePresence initial={false}>
          {isMenuOpen ? (
            <motion.div
              id="mobile-nav-panel"
              className="overflow-hidden border-t border-white/10 md:hidden"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.24, ease: 'easeInOut' }}
            >
              <ul className="flex flex-col px-4 py-3" role="list">
                {navItems.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className="block rounded-lg px-3 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-white/[0.04] hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/35"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
                <li className="pt-2">
                  <a
                    href="#"
                    className="vaidy-button-primary inline-flex w-full items-center justify-center rounded-lg px-5 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/40"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Try Vaidy
                  </a>
                </li>
              </ul>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </nav>
    </header>
  );
}
