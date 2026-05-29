"use client";

import { motion } from "framer-motion";
import type { MouseEvent } from "react";
import { useWaitlist } from "@/components/WaitlistProvider";

const orbs = [
  { left: "-10%", top: "10%", size: 520, color: "rgba(0,217,126,0.12)", blur: 120, delay: 0 },
  { left: "55%", top: "-5%", size: 460, color: "rgba(0,196,184,0.09)", blur: 130, delay: 2 },
  { left: "30%", top: "60%", size: 380, color: "rgba(167,139,250,0.07)", blur: 140, delay: 4 },
];

function scrollToAnchor(event: MouseEvent<HTMLAnchorElement>, href: string) {
  const target = document.getElementById(href.slice(1));
  if (!target) return;
  event.preventDefault();
  window.history.pushState(null, "", href);
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Hero() {
  const { openWaitlist } = useWaitlist();

  return (
    <section id="hero" className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg-void px-6 py-24 text-center">
      {orbs.map((orb) => (
        <motion.div
          key={`${orb.left}-${orb.top}`}
          className="pointer-events-none absolute rounded-full"
          style={{
            left: orb.left,
            top: orb.top,
            width: orb.size,
            height: orb.size,
            background: orb.color,
            filter: `blur(${orb.blur}px)`,
          }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 8 + orb.delay, repeat: Infinity, ease: "easeInOut", delay: orb.delay }}
        />
      ))}

      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:40px_40px]"
        aria-hidden="true"
      />

      <motion.div
        className="relative z-10 mx-auto max-w-[900px]"
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
      >
        <motion.div
          className="mb-8 inline-flex items-center gap-2 rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.08] py-1.5 pl-2.5 pr-3.5"
          variants={{ hidden: { opacity: 0, y: -12 }, visible: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.5 }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#00d97e]" />
          <span className="text-[12.5px] font-semibold uppercase tracking-[0.04em] text-emerald-400/85">
            AI Health Copilot for India
          </span>
        </motion.div>

        <motion.h1
          className="text-[clamp(3rem,8vw,6.5rem)] font-extrabold leading-[0.95] tracking-[-0.04em] text-white"
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          Your health,
          <br />
          <span className="bg-gradient-to-br from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
            finally decoded.
          </span>
        </motion.h1>

        <motion.p
          className="mx-auto mt-7 max-w-[640px] text-[clamp(1rem,2.5vw,1.25rem)] leading-[1.7] text-white/55"
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.7, delay: 0.25 }}
        >
          Not a chatbot. A health brain that reads your reports, remembers your history,
          and explains everything in plain language you'll actually understand.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-wrap justify-center gap-3"
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.7, delay: 0.4 }}
        >
          <motion.button
            type="button"
            onClick={() => window.location.href = "/chat"}
            className="inline-flex items-center gap-2 rounded-[32px] bg-emerald-400 px-7 py-3.5 text-[15px] font-bold text-[#03120a] shadow-[0_0_32px_rgba(0,217,126,0.35)]"
            whileHover={{ scale: 1.04, boxShadow: "0 0 48px rgba(0,217,126,0.5)" }}
            whileTap={{ scale: 0.97 }}
          >
            Open Assistant
            <span aria-hidden="true">→</span>
          </motion.button>
          <motion.a
            href="#demo"
            onClick={(event) => scrollToAnchor(event, "#demo")}
            className="inline-flex items-center gap-2 rounded-[32px] border border-white/10 bg-white/[0.06] px-7 py-3.5 text-[15px] font-semibold text-white/80 no-underline"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            Watch demo
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <polygon points="5,3 19,12 5,21" opacity="0.7" />
            </svg>
          </motion.a>
        </motion.div>

        <motion.div
          className="mt-14 flex flex-wrap items-center justify-center gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          {["Apollo", "Thyrocare", "Lal Path Labs", "Dr. Lal"].map((lab) => (
            <span key={lab} className="text-[12.5px] tracking-[0.02em] text-white/30">
              {lab}
            </span>
          ))}
          <span className="text-xs text-white/20">+50 more labs</span>
        </motion.div>
      </motion.div>

      <motion.a
        href="#features"
        onClick={(event) => scrollToAnchor(event, "#features")}
        className="absolute bottom-7 left-1/2 z-10 -translate-x-1/2 text-white/30"
        aria-label="Scroll to features"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </motion.a>
    </section>
  );
}
