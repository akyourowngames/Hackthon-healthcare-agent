"use client";

import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { useState, type MouseEvent } from "react";
import Link from "next/link";
import { useWaitlist } from "@/components/WaitlistProvider";

const navLinks = [
  { label: "Assistant", href: "/chat" },
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Demo", href: "#demo" },
];

function scrollToAnchor(event: MouseEvent<HTMLAnchorElement>, href: string) {
  if (!href.startsWith("#")) return; // let normal navigation happen for page links
  const target = document.getElementById(href.slice(1));
  if (!target) return;
  event.preventDefault();
  window.history.pushState(null, "", href);
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { openWaitlist } = useWaitlist();
  const { scrollY } = useScroll();
  const bg = useTransform(scrollY, [0, 80], ["rgba(4,5,10,0)", "rgba(4,5,10,0.92)"]);
  const borderColor = useTransform(scrollY, [0, 80], ["rgba(255,255,255,0)", "rgba(255,255,255,0.06)"]);

  return (
    <motion.header
      className="fixed inset-x-0 top-0 z-[100] border-b backdrop-blur-[24px]"
      style={{ background: bg, borderColor }}
    >
      <div className="mx-auto flex h-[60px] max-w-[1200px] items-center justify-between px-4 md:px-6">
        <a
          href="#hero"
          onClick={(event) => scrollToAnchor(event, "#hero")}
          className="flex items-center gap-2.5 no-underline"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-300">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 3v3M21 12h-3M12 21v-3M3 12h3" stroke="#04050a" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="12" cy="12" r="4" fill="#04050a" />
            </svg>
          </span>
          <span className="text-[17px] font-bold tracking-[-0.03em] text-white">vaidy</span>
        </a>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(event) => scrollToAnchor(event, link.href)}
              className="rounded-full px-3.5 py-1.5 text-[13.5px] text-white/60 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
          <motion.button
            type="button"
            onClick={() => window.location.href = "/dashboard"}
            className="ml-2 rounded-3xl bg-emerald-400 px-5 py-[7px] text-[13.5px] font-semibold text-[#03120a] shadow-[0_0_24px_rgba(0,217,126,0.3)]"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            Try free
          </motion.button>
        </nav>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white md:hidden"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
          aria-controls="mobile-nav"
          onClick={() => setIsOpen((value) => !value)}
        >
          <motion.span className="relative h-4 w-4" animate={isOpen ? "open" : "closed"} initial={false}>
            <motion.span className="absolute left-0 top-1/2 h-px w-4 bg-current" variants={{ closed: { rotate: 0, y: -5 }, open: { rotate: 45, y: 0 } }} />
            <motion.span className="absolute left-0 top-1/2 h-px w-4 bg-current" variants={{ closed: { opacity: 1 }, open: { opacity: 0 } }} />
            <motion.span className="absolute left-0 top-1/2 h-px w-4 bg-current" variants={{ closed: { rotate: 0, y: 5 }, open: { rotate: -45, y: 0 } }} />
          </motion.span>
        </button>
      </div>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            id="mobile-nav"
            className="mx-4 mb-3 overflow-hidden rounded-2xl border border-white/10 bg-bg-void/95 md:hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
          >
            <div className="flex flex-col p-2">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-xl px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white"
                  onClick={(event) => {
                    scrollToAnchor(event, link.href);
                    setIsOpen(false);
                  }}
                >
                  {link.label}
                </a>
              ))}
              <button
                type="button"
                className="mt-1 rounded-xl bg-emerald-400 px-4 py-3 text-center text-sm font-semibold text-[#03120a]"
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = "/dashboard";
                }}
              >
                Try free
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}
