"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";

const EMERALD = "#00d97e";
const EMERALD_DIM = "#00a862";
const TEAL = "#00c4b8";
const VOID = "#04050a";
const WAITLIST_STORAGE_KEY = "vaidy_waitlist_submissions";
const WAITLIST_SUCCESS_MESSAGE = "You're on the list 🎉 We'll notify you when Vaidy launches.";

const NAV_LINKS = [
  { label: "Assistant", href: "/chat" },
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Demo", href: "#demo" },
];
const FOOTER_LINKS = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Contact", href: "/contact" },
];

function handleSmoothAnchorClick(event, href) {
  if (!href.startsWith("#")) return;

  const target = document.getElementById(href.slice(1));
  if (!target) return;

  event.preventDefault();
  window.history.pushState(null, "", href);
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function useMouseGlow() {
  const [pos, setPos] = useState({ x: -999, y: -999 });
  useEffect(() => {
    const h = (e) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, []);
  return pos;
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const sync = () => setMobile(media.matches);

    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return mobile;
}

function Orb({ cx, cy, size, color, blur, delay }) {
  return (
    <motion.div
      style={{
        position: "absolute",
        left: cx,
        top: cy,
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        filter: `blur(${blur}px)`,
        pointerEvents: "none",
        zIndex: 0,
      }}
      animate={{ scale: [1, 1.12, 1], opacity: [0.35, 0.55, 0.35] }}
      transition={{ duration: 8 + delay, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}

function WaitlistModal({ open, onClose }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    setEmail("");
    setSubmitted(false);

    const previousOverflow = document.body.style.overflow;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 160);
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const handleSubmit = (event) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;

    try {
      const stored = window.localStorage.getItem(WAITLIST_STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      const submissions = Array.isArray(parsed) ? parsed : [];
      const nextSubmissions = [
        ...submissions.filter((submission) => submission?.email !== normalizedEmail),
        { email: normalizedEmail, submittedAt: new Date().toISOString() },
      ];

      window.localStorage.setItem(WAITLIST_STORAGE_KEY, JSON.stringify(nextSubmissions));
    } catch {
      window.localStorage.setItem(
        WAITLIST_STORAGE_KEY,
        JSON.stringify([{ email: normalizedEmail, submittedAt: new Date().toISOString() }])
      );
    }

    setSubmitted(true);
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          aria-labelledby="waitlist-title"
          aria-modal="true"
          role="dialog"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={onClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            background: "rgba(1,3,8,0.72)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 22, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onMouseDown={(event) => event.stopPropagation()}
            style={{
              position: "relative",
              width: "min(100%, 448px)",
              overflow: "hidden",
              borderRadius: 28,
              border: "1px solid rgba(0,217,126,0.24)",
              background:
                "linear-gradient(145deg, rgba(10,15,24,0.86), rgba(4,5,10,0.76))",
              boxShadow:
                "0 30px 90px rgba(0,0,0,0.58), 0 0 70px rgba(0,217,126,0.16), inset 0 1px 0 rgba(255,255,255,0.08)",
              padding: 26,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(circle at 50% 0%, rgba(0,217,126,0.18), transparent 42%), radial-gradient(circle at 100% 100%, rgba(0,196,184,0.1), transparent 36%)",
                pointerEvents: "none",
              }}
            />

            <button
              type="button"
              aria-label="Close waitlist modal"
              onClick={onClose}
              style={{
                position: "absolute",
                right: 16,
                top: 16,
                zIndex: 2,
                width: 34,
                height: 34,
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.7)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>

            <div style={{ position: "relative", zIndex: 1 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: `linear-gradient(135deg, ${EMERALD}, ${TEAL})`,
                  boxShadow: "0 0 34px rgba(0,217,126,0.32)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 20,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3v3M21 12h-3M12 21v-3M3 12h3" stroke="#04050a" strokeWidth="2.5" strokeLinecap="round"/>
                  <circle cx="12" cy="12" r="4" fill="#04050a"/>
                </svg>
              </div>

              <p
                style={{
                  margin: "0 0 8px",
                  color: EMERALD,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Early access
              </p>

              <h2
                id="waitlist-title"
                style={{
                  margin: 0,
                  maxWidth: 340,
                  color: "#fff",
                  fontSize: "clamp(1.75rem, 6vw, 2.4rem)",
                  lineHeight: 1.08,
                  letterSpacing: "-0.04em",
                  fontWeight: 800,
                }}
              >
                Join the Vaidy waitlist.
              </h2>

              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22 }}
                    style={{
                      marginTop: 26,
                      border: "1px solid rgba(0,217,126,0.22)",
                      borderRadius: 20,
                      background: "rgba(0,217,126,0.08)",
                      padding: "22px 18px",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color: "rgba(255,255,255,0.9)",
                        fontSize: 16,
                        lineHeight: 1.6,
                        fontWeight: 600,
                      }}
                    >
                      {WAITLIST_SUCCESS_MESSAGE}
                    </p>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    onSubmit={handleSubmit}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22 }}
                    style={{ marginTop: 26 }}
                  >
                    <label
                      htmlFor="waitlist-email"
                      style={{
                        display: "block",
                        marginBottom: 10,
                        color: "rgba(255,255,255,0.62)",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      Email address
                    </label>
                    <input
                      ref={inputRef}
                      id="waitlist-email"
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 16,
                        background: "rgba(255,255,255,0.055)",
                        color: "#fff",
                        outline: "none",
                        padding: "15px 16px",
                        fontSize: 15,
                        fontFamily: "'DM Sans', sans-serif",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                      }}
                    />
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02, boxShadow: "0 0 46px rgba(0,217,126,0.42)" }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        width: "100%",
                        marginTop: 14,
                        border: "none",
                        borderRadius: 16,
                        background: `linear-gradient(135deg, ${EMERALD}, ${TEAL})`,
                        color: "#03120a",
                        cursor: "pointer",
                        padding: "15px 18px",
                        fontSize: 15,
                        fontWeight: 800,
                        fontFamily: "'DM Sans', sans-serif",
                        boxShadow: "0 0 34px rgba(0,217,126,0.3)",
                      }}
                    >
                      Join waitlist
                    </motion.button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function Navbar({ scrollY, onOpenWaitlist }) {
  const [open, setOpen] = useState(false);
  const mobile = useIsMobile();
  const bg = useTransform(scrollY, [0, 80], ["rgba(4,5,10,0)", "rgba(4,5,10,0.92)"]);
  const bdr = useTransform(scrollY, [0, 80], ["rgba(255,255,255,0)", "rgba(255,255,255,0.06)"]);

  // Close menu when switching back to desktop
  useEffect(() => {
    if (!mobile && open) setOpen(false);
  }, [mobile, open]);

  // Lock body scroll while menu is open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const handleNavClick = (event, href) => {
    setOpen(false);
    handleSmoothAnchorClick(event, href);
  };

  return (
    <motion.header
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: bg, backdropFilter: "blur(24px)",
        borderBottom: "1px solid", borderColor: bdr,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: mobile ? "0 16px" : "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="#hero" onClick={(event) => handleNavClick(event, "#hero")} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${EMERALD}, ${TEAL})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3v3M21 12h-3M12 21v-3M3 12h3" stroke="#04050a" strokeWidth="2.5" strokeLinecap="round"/><circle cx="12" cy="12" r="4" fill="#04050a"/></svg>
          </div>
          <span style={{ fontSize: 17, fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", fontFamily: "'DM Sans', sans-serif" }}>vaidy</span>
        </a>

        <nav style={{ display: mobile ? "none" : "flex", gap: 4, alignItems: "center" }}>
          {NAV_LINKS.map(({ label, href }) => (
            <a key={label} href={href} onClick={(event) => handleSmoothAnchorClick(event, href)} style={{ padding: "6px 14px", fontSize: 13.5, color: "rgba(255,255,255,0.6)", textDecoration: "none", borderRadius: 20, transition: "all 0.15s", fontFamily: "'DM Sans', sans-serif" }}
              onMouseEnter={e => e.target.style.color = "#fff"}
              onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.6)"}
            >{label}</a>
          ))}
          <motion.button type="button" onClick={onOpenWaitlist} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            style={{ marginLeft: 8, padding: "7px 20px", background: EMERALD, color: "#03120a", border: "none", borderRadius: 24, fontSize: 13.5, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", boxShadow: `0 0 24px rgba(0,217,126,0.3)`, cursor: "pointer" }}>
            Try free
          </motion.button>
        </nav>

        {/* Mobile hamburger */}
        {mobile && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={open}
            aria-controls="mobile-nav-panel"
            style={{
              width: 40, height: 40, display: "inline-flex", alignItems: "center", justifyContent: "center",
              borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)", color: "#fff", cursor: "pointer",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              {open ? (
                <>
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </>
              ) : (
                <>
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </>
              )}
            </svg>
          </button>
        )}
      </div>

      {/* Mobile nav panel */}
      <AnimatePresence initial={false}>
        {mobile && open && (
          <motion.div
            id="mobile-nav-panel"
            key="mobile-nav-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: "easeInOut" }}
            style={{
              overflow: "hidden",
              background: "rgba(4,5,10,0.96)",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              backdropFilter: "blur(24px)",
            }}
          >
            <nav aria-label="Mobile" style={{ padding: "12px 16px 18px" }}>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                {NAV_LINKS.map(({ label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      onClick={(event) => handleNavClick(event, href)}
                      style={{
                        display: "block",
                        padding: "12px 14px",
                        fontSize: 15,
                        color: "rgba(255,255,255,0.78)",
                        textDecoration: "none",
                        borderRadius: 12,
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onOpenWaitlist();
                }}
                style={{
                  width: "100%",
                  marginTop: 10,
                  padding: "13px 20px",
                  background: EMERALD,
                  color: "#03120a",
                  border: "none",
                  borderRadius: 14,
                  fontSize: 15,
                  fontWeight: 700,
                  fontFamily: "'DM Sans', sans-serif",
                  boxShadow: `0 0 24px rgba(0,217,126,0.3)`,
                  cursor: "pointer",
                }}
              >
                Try free
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

function Hero({ onOpenWaitlist }) {
  const mobile = useIsMobile();
  return (
    <section id="hero" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", background: VOID }}>
      <Orb cx="-10%" cy="10%" size={520} color="rgba(0,217,126,0.12)" blur={120} delay={0} />
      <Orb cx="55%" cy="-5%" size={460} color="rgba(0,196,184,0.09)" blur={130} delay={2} />
      <Orb cx="30%" cy="60%" size={380} color="rgba(100,80,255,0.07)" blur={140} delay={4} />

      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 900, padding: mobile ? "0 16px" : "0 24px", width: "100%" }}>
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(0,217,126,0.08)", border: "1px solid rgba(0,217,126,0.2)", borderRadius: 24, padding: "6px 14px 6px 10px", marginBottom: 32 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: EMERALD, boxShadow: `0 0 8px ${EMERALD}` }} />
          <span style={{ fontSize: 12.5, color: "rgba(0,217,126,0.85)", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 600 }}>AI Health Copilot for India</span>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
          style={{ fontSize: "clamp(2.25rem, 9vw, 6.5rem)", fontWeight: 800, lineHeight: 0.98, letterSpacing: "-0.04em", color: "#fff", fontFamily: "'DM Sans', sans-serif", marginBottom: 8, wordBreak: "break-word", overflowWrap: "anywhere" }}>
          Your health,<br />
          <span style={{ background: `linear-gradient(135deg, ${EMERALD} 0%, ${TEAL} 60%, #a78bfa 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>finally decoded.</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }}
          style={{ fontSize: "clamp(0.95rem, 2.5vw, 1.25rem)", color: "rgba(255,255,255,0.55)", maxWidth: 640, margin: "28px auto 0", lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif" }}>
          Not a chatbot. A health brain that reads your reports, remembers your history, and explains everything — in plain language you'll actually understand.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.4 }}
          style={{
            display: "flex",
            flexDirection: mobile ? "column" : "row",
            gap: 12,
            justifyContent: "center",
            alignItems: "stretch",
            marginTop: 40,
            flexWrap: "wrap",
            width: "100%",
            maxWidth: mobile ? 360 : "none",
            marginLeft: "auto",
            marginRight: "auto",
          }}>
          <motion.a href="/chat" whileHover={{ scale: 1.04, boxShadow: `0 0 48px rgba(0,217,126,0.5)` }} whileTap={{ scale: 0.97 }}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 28px", background: EMERALD, color: "#03120a", border: "none", borderRadius: 32, fontSize: 15, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", boxShadow: `0 0 32px rgba(0,217,126,0.35)`, transition: "box-shadow 0.2s", cursor: "pointer", width: mobile ? "100%" : "auto", textDecoration: "none" }}>
            Open Assistant
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#03120a" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </motion.a>
          <motion.a href="#demo" onClick={(event) => handleSmoothAnchorClick(event, "#demo")} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 28px", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 32, fontSize: 15, fontWeight: 600, textDecoration: "none", fontFamily: "'DM Sans', sans-serif", width: mobile ? "100%" : "auto" }}>
            Watch demo
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="5,3 19,12 5,21" fill="currentColor" opacity="0.7"/></svg>
          </motion.a>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          style={{ marginTop: 56, display: "flex", alignItems: "center", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
          {["Apollo", "Thyrocare", "Lal Path Labs", "Dr. Lal"].map(lab => (
            <span key={lab} style={{ fontSize: 12.5, color: "rgba(255,255,255,0.28)", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.02em" }}>{lab}</span>
          ))}
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.18)", fontFamily: "'DM Sans', sans-serif" }}>+50 more labs</span>
        </motion.div>
      </div>

      <motion.div style={{ position: "absolute", bottom: 28, left: "50%", x: "-50%" }} animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round"><path d="m6 9 6 6 6-6"/></svg>
      </motion.div>
    </section>
  );
}

function AnimatedCounter({ active, value, decimals = 0, suffix = "" }) {
  // Non-zero fallback for SSR/no-JS: render the final number by default.
  const [displayValue, setDisplayValue] = useState(value);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    if (!active || hasAnimatedRef.current) return;
    hasAnimatedRef.current = true;

    let frameId;
    const duration = 2000;
    const start = performance.now();

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = easeOutCubic(progress);
      setDisplayValue(value * eased);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      } else {
        setDisplayValue(value);
      }
    };

    // Start from 0 on the first animation frame (only when active).
    setDisplayValue(0);
    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [active, value]);

  const formattedValue =
    decimals > 0 ? Number(displayValue).toFixed(decimals) : Math.round(displayValue).toLocaleString("en-IN");

  return (
    <>
      {formattedValue}
      {suffix}
    </>
  );
}

function SocialProofSection() {
  const mobile = useIsMobile();
  const statsRef = useRef(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const stats = [
    { value: 12400, suffix: "+", label: "Reports Analyzed" },
    { value: 4.9, decimals: 1, suffix: "★", label: "Average Rating" },
    { value: 8, label: "Cities across India" },
  ];
  const testimonials = [
    {
      initials: "AR",
      name: "Ananya Rao",
      city: "Bengaluru",
      role: "Working professional",
      rating: "5.0",
      quote:
        "My thyroid report always felt like a wall of numbers. Vaidy explained TSH and T3 in plain English, so I walked into my doctor visit calmer and prepared.",
    },
    {
      initials: "RM",
      name: "Rohit Mehra",
      city: "Delhi",
      role: "Caregiver",
      rating: "4.9",
      quote:
        "I manage my father's diabetes reports every month, and I used to miss small changes. Vaidy helped me compare HbA1c and fasting glucose trends without digging through old PDFs.",
    },
    {
      initials: "SK",
      name: "Sara Khan",
      city: "Mumbai",
      role: "College student",
      rating: "5.0",
      quote:
        "I uploaded a routine blood test and finally noticed my Vitamin D was low. Vaidy made the result easy to understand early, before it became a bigger problem.",
    },
  ];

  useEffect(() => {
    if (!statsRef.current || statsVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, [statsVisible]);

  return (
    <section style={{ background: "#05070d", padding: "92px 24px 118px", position: "relative", overflow: "hidden" }}>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 0%, rgba(0,217,126,0.08), transparent 34%), radial-gradient(circle at 18% 75%, rgba(0,196,184,0.045), transparent 28%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div ref={statsRef}>
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.62, ease: "easeOut" }}
            style={{
              display: "grid",
              gridTemplateColumns: mobile ? "1fr" : "repeat(3, 1fr)",
              gap: mobile ? 10 : 0,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.075)",
              borderRadius: 22,
              background: "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.022))",
              boxShadow: "0 24px 70px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.05)",
              backdropFilter: "blur(18px)",
            }}
          >
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                style={{
                  padding: mobile ? "22px 20px" : "28px 26px",
                  textAlign: "center",
                  borderLeft: !mobile && index > 0 ? "1px solid rgba(255,255,255,0.07)" : "none",
                  borderTop: mobile && index > 0 ? "1px solid rgba(255,255,255,0.07)" : "none",
                }}
              >
                <p style={{ margin: 0, color: "rgba(255,255,255,0.94)", fontSize: mobile ? 32 : 38, lineHeight: 1, fontWeight: 800, letterSpacing: "-0.04em", fontFamily: "'DM Sans', sans-serif" }}>
                  <AnimatedCounter active={statsVisible} value={stat.value} decimals={stat.decimals || 0} suffix={stat.suffix || ""} />
                </p>
                <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.45)", fontSize: 13.5, fontFamily: "'DM Sans', sans-serif" }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </motion.div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3, 1fr)", gap: 16, marginTop: 24 }}>
          {testimonials.map((item, index) => (
            <motion.article
              key={item.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.28 }}
              transition={{ duration: 0.52, delay: index * 0.08, ease: "easeOut" }}
              whileHover={{ y: -4, boxShadow: "0 18px 54px rgba(0,0,0,0.32)" }}
              style={{
                minHeight: 260,
                border: "1px solid rgba(255,255,255,0.075)",
                borderRadius: 20,
                background: "linear-gradient(180deg, rgba(255,255,255,0.036), rgba(255,255,255,0.02))",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 16px 42px rgba(0,0,0,0.22)",
                padding: 22,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, rgba(0,217,126,0.22), rgba(0,196,184,0.12))",
                      border: "1px solid rgba(0,217,126,0.2)",
                      color: "rgba(191,255,226,0.92)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 800,
                      boxShadow: "0 0 24px rgba(0,217,126,0.08)",
                      flexShrink: 0,
                    }}
                  >
                    {item.initials}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ margin: 0, color: "rgba(255,255,255,0.92)", fontSize: 15.5, fontWeight: 700 }}>
                      {item.name}
                    </h3>
                    <p style={{ margin: "3px 0 0", color: "rgba(255,255,255,0.38)", fontSize: 12.5 }}>
                      {item.role} · {item.city}
                    </p>
                  </div>
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "rgba(0,217,126,0.76)", fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>
                  <span aria-hidden="true">★★★★★</span>
                  <span>{item.rating}</span>
                </div>
              </div>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.58)", fontSize: 14, lineHeight: 1.75 }}>
                "{item.quote}"
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

function UploadSection() {
  const [dragging, setDragging] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const mobile = useIsMobile();

  return (
    <section id="how-it-works" style={{ background: VOID, padding: "120px 24px", position: "relative", overflow: "hidden" }}>
      <Orb cx="70%" cy="20%" size={400} color="rgba(0,196,184,0.07)" blur={120} delay={1} />

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          style={{ textAlign: "center", marginBottom: 60 }}>
          <p style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: EMERALD, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, marginBottom: 16 }}>Step 01</p>
          <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.1 }}>
            Drop your report.<br />
            <span style={{ color: "rgba(255,255,255,0.4)" }}>Vaidy reads it in seconds.</span>
          </h2>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 24, alignItems: "center" }}>
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <motion.div
              onHoverStart={() => setDragging(true)}
              onHoverEnd={() => setDragging(false)}
              onClick={() => setUploaded(!uploaded)}
              whileHover={{ scale: 1.01 }}
              style={{
                border: `1.5px dashed ${dragging ? EMERALD : "rgba(255,255,255,0.12)"}`,
                borderRadius: 20,
                padding: 40,
                textAlign: "center",
                cursor: "pointer",
                background: dragging ? "rgba(0,217,126,0.04)" : "rgba(255,255,255,0.025)",
                transition: "all 0.2s",
                backdropFilter: "blur(12px)",
              }}>
              <AnimatePresence mode="wait">
                {!uploaded ? (
                  <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div style={{ width: 64, height: 64, borderRadius: 16, background: `rgba(0,217,126,0.1)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={EMERALD} strokeWidth="1.8" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                    </div>
                    <p style={{ fontSize: 16, fontWeight: 600, color: "#fff", fontFamily: "'DM Sans', sans-serif", marginBottom: 8 }}>Drag & drop your blood test, MRI, or prescription</p>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>PDF, JPG, PNG · Apollo, Thyrocare, Lal Path Labs & more</p>
                    <div style={{ marginTop: 20, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                      {["CBC Report ✓", "Lipid Panel ✓", "Thyroid ✓"].map(b => (
                        <span key={b} style={{ padding: "4px 12px", background: "rgba(0,217,126,0.1)", border: "1px solid rgba(0,217,126,0.2)", borderRadius: 20, fontSize: 12, color: EMERALD, fontFamily: "'DM Sans', sans-serif" }}>{b}</span>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                    <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(0,217,126,0.12)", border: `2px solid ${EMERALD}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={EMERALD} strokeWidth="2.5" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>
                    </div>
                    <p style={{ fontSize: 16, fontWeight: 600, color: "#fff", fontFamily: "'DM Sans', sans-serif" }}>CBC_Report_Apollo_Jan2024.pdf</p>
                    <p style={{ fontSize: 13, color: EMERALD, fontFamily: "'DM Sans', sans-serif", marginTop: 6 }}>Analyzing 24 biomarkers...</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", fontFamily: "'DM Sans', sans-serif" }}>Apollo Diagnostics</p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>Complete Blood Count · Jan 2024</p>
                </div>
                <span style={{ padding: "4px 10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, fontSize: 11, color: "#fca5a5", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>PDF</span>
              </div>
              <div style={{ padding: 20 }}>
                {[
                  { label: "Hemoglobin", value: "10.2 g/dL", status: "low", flag: "↓" },
                  { label: "WBC Count", value: "7,800 /μL", status: "normal" },
                  { label: "Platelets", value: "2.4 L/μL", status: "normal" },
                  { label: "Ferritin", value: "9 ng/mL", status: "low", flag: "↓" },
                ].map((row, i) => (
                  <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent", borderRadius: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontFamily: "'DM Sans', sans-serif" }}>{row.label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: row.status === "low" ? "#fca5a5" : "#fff", fontFamily: "'DM Sans', sans-serif" }}>{row.value}</span>
                      {row.flag && <span style={{ fontSize: 11, color: "#fca5a5" }}>{row.flag}</span>}
                      {!row.flag && <span style={{ fontSize: 11, color: EMERALD }}>✓</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

const SAMPLE = "Your Hemoglobin is 10.2 g/dL — slightly below the normal range of 12–16 g/dL for women. This likely indicates mild iron-deficiency anemia. Your Ferritin (9 ng/mL) confirms this. The good news: this is very treatable. Consider iron-rich foods like spinach, lentils, and jaggery, along with a short course of iron supplements. I'd suggest a follow-up CBC in 6–8 weeks.";

function ExplainSection() {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const mobile = useIsMobile();

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (count >= SAMPLE.length) return;
    const t = setTimeout(() => setCount(c => c + 1), 18);
    return () => clearTimeout(t);
  }, [visible, count]);

  const text = SAMPLE.slice(0, count);

  return (
    <section id="demo" ref={ref} style={{ background: "#060810", padding: "120px 24px", position: "relative", overflow: "hidden" }}>
      <Orb cx="-5%" cy="50%" size={500} color="rgba(0,217,126,0.07)" blur={130} delay={0} />

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          style={{ textAlign: "center", marginBottom: 60 }}>
          <p style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: EMERALD, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, marginBottom: 16 }}>Step 02</p>
          <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.1 }}>
            Ask anything.<br />
            <span style={{ color: "rgba(255,255,255,0.4)" }}>Get answers you'll understand.</span>
          </h2>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1.2fr", gap: 24, alignItems: "start" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 6 }}>
                {[EMERALD, "#fbbf24", "#f87171"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.6 }} />)}
                <span style={{ marginLeft: 8, fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif" }}>vaidy.ai — Report Analysis</span>
              </div>
              <div style={{ padding: "20px 18px" }}>
                {[
                  { role: "user", text: "What does my CBC report say? Is anything abnormal?" },
                  { role: "user", text: "Should I be worried about my hemoglobin?" },
                ].map((m, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}>
                    <div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: m.role === "user" ? "rgba(0,217,126,0.12)" : "rgba(255,255,255,0.05)", border: `1px solid ${m.role === "user" ? "rgba(0,217,126,0.2)" : "rgba(255,255,255,0.06)"}` }}>
                      <p style={{ fontSize: 13, color: m.role === "user" ? "rgba(0,217,126,0.9)" : "rgba(255,255,255,0.7)", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5, margin: 0 }}>{m.text}</p>
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 16, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Sans', sans-serif", flex: 1 }}>Ask Vaidy anything about your health...</span>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: EMERALD, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#03120a" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.15 }}>
            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg, ${EMERALD}22, ${TEAL}22)`, border: `1px solid ${EMERALD}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3v3M21 12h-3M12 21v-3M3 12h3" stroke={EMERALD} strokeWidth="2.5" strokeLinecap="round"/><circle cx="12" cy="12" r="3" fill={EMERALD}/></svg>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", fontFamily: "'DM Sans', sans-serif", margin: 0 }}>Vaidy's Analysis</p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans', sans-serif", margin: 0 }}>Based on your Apollo CBC · Jan 2024</p>
                </div>
                <span style={{ marginLeft: "auto", padding: "3px 10px", background: "rgba(0,217,126,0.1)", border: "1px solid rgba(0,217,126,0.2)", borderRadius: 20, fontSize: 11, color: EMERALD, fontFamily: "'DM Sans', sans-serif" }}>Live</span>
              </div>

              <div style={{ minHeight: 200, fontSize: 15, lineHeight: 1.8, color: "rgba(255,255,255,0.72)", fontFamily: "'DM Sans', sans-serif" }}>
                {text.split(/(Hemoglobin|anemia|Ferritin)/g).map((part, i) =>
                  /Hemoglobin|anemia|Ferritin/.test(part)
                    ? <mark key={i} style={{ background: "rgba(0,217,126,0.12)", color: EMERALD, borderRadius: 4, padding: "1px 4px" }}>{part}</mark>
                    : <span key={i}>{part}</span>
                )}
                {count < SAMPLE.length && (
                  <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.8, repeat: Infinity }} style={{ display: "inline-block", width: 2, height: 16, background: TEAL, marginLeft: 2, verticalAlign: "middle" }} />
                )}
              </div>

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["What foods help?", "How serious is this?", "Follow-up tests?"].map(q => (
                  <button key={q} style={{ padding: "6px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, fontSize: 12, color: "rgba(255,255,255,0.5)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{q} →</button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function TimelineSection() {
  const mobile = useIsMobile();
  const entries = [
    { date: "Jan 2024", label: "CBC Report", summary: "Hemoglobin low · Ferritin low", color: "#f87171", status: "needs attention" },
    { date: "Mar 2024", label: "Lipid Panel", summary: "LDL borderline · HDL good", color: "#fbbf24", status: "monitor" },
    { date: "May 2024", label: "Thyroid TSH", summary: "Within normal range", color: EMERALD, status: "normal" },
    { date: "Jul 2024", label: "Follow-up CBC", summary: "Hemoglobin improving ↑", color: EMERALD, status: "improving" },
  ];

  return (
    <section style={{ background: VOID, padding: "120px 24px", position: "relative", overflow: "hidden" }}>
      <Orb cx="60%" cy="40%" size={450} color="rgba(100,80,255,0.07)" blur={120} delay={3} />

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          style={{ marginBottom: 60 }}>
          <p style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: EMERALD, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, marginBottom: 16 }}>Step 03</p>
          <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.1, maxWidth: 600 }}>
            Your health,<br />
            <span style={{ color: "rgba(255,255,255,0.4)" }}>always remembered.</span>
          </h2>
        </motion.div>

        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", top: 30, left: 24, right: 24, height: 1, background: "rgba(255,255,255,0.06)" }} />

          {mobile && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 6,
                marginBottom: 10,
                fontSize: 11,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.4)",
                fontFamily: "'DM Sans', sans-serif",
              }}
              aria-hidden="true"
            >
              <span>Swipe</span>
              <motion.svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              >
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </motion.svg>
            </div>
          )}

          <div style={{ position: "relative" }}>
            <div
              className="vaidy-timeline-scroll"
              style={{
                display: "grid",
                gridTemplateColumns: mobile ? "repeat(4, minmax(220px, 1fr))" : "repeat(4, 1fr)",
                gap: 20,
                overflowX: mobile ? "auto" : "visible",
                paddingBottom: mobile ? 14 : 0,
                WebkitOverflowScrolling: "touch",
                scrollSnapType: mobile ? "x proximity" : "none",
                scrollbarWidth: "thin",
                scrollbarColor: "rgba(0,217,126,0.35) transparent",
              }}
            >
              {entries.map((e, i) => (
                <motion.div key={e.date} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55, delay: i * 0.1 }}
                  style={{ paddingTop: 60, position: "relative", scrollSnapAlign: mobile ? "start" : "none" }}>
                  <div style={{ position: "absolute", top: 22, left: 20, width: 16, height: 16, borderRadius: "50%", background: e.color, boxShadow: `0 0 16px ${e.color}80`, border: `2px solid ${VOID}` }} />

                  <motion.div whileHover={{ y: -4, boxShadow: `0 8px 32px rgba(0,0,0,0.4)` }}
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "18px 16px", cursor: "default", transition: "box-shadow 0.2s" }}>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif", marginBottom: 8, letterSpacing: "0.05em" }}>{e.date}</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", fontFamily: "'DM Sans', sans-serif", marginBottom: 8 }}>{e.label}</p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>{e.summary}</p>
                    <div style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", background: `${e.color}15`, border: `1px solid ${e.color}30`, borderRadius: 20 }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: e.color }} />
                      <span style={{ fontSize: 11, color: e.color, fontFamily: "'DM Sans', sans-serif" }}>{e.status}</span>
                    </div>
                  </motion.div>
                </motion.div>
            ))}
          </div>

          {mobile && (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 0,
                bottom: 14,
                right: 0,
                width: 56,
                pointerEvents: "none",
                background: `linear-gradient(to left, ${VOID} 0%, rgba(4,5,10,0) 100%)`,
              }}
            />
          )}
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.3 }}
          style={{ marginTop: 40, padding: "20px 24px", background: "rgba(0,217,126,0.04)", border: "1px solid rgba(0,217,126,0.12)", borderRadius: 16, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(0,217,126,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={EMERALD} strokeWidth="2" strokeLinecap="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", fontFamily: "'DM Sans', sans-serif", margin: 0 }}>Vaidy spotted a trend</p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "'DM Sans', sans-serif", margin: "4px 0 0" }}>Your hemoglobin improved by 18% after iron supplementation. Your body is responding well — great progress over 6 months.</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FeatureCards() {
  const mobile = useIsMobile();
  const features = [
    { icon: "📄", title: "Reads Any Format", desc: "Blood tests, MRIs, prescriptions, echoes — PDF or image, English or Hindi.", accent: EMERALD },
    { icon: "🧠", title: "Health Memory", desc: "Builds a complete, searchable record of your health across all time.", accent: TEAL },
    { icon: "💬", title: "Plain Language", desc: "No jargon. Explanations even a 12-year-old can follow.", accent: "#a78bfa" },
    { icon: "📈", title: "Trend Detection", desc: "Identifies patterns across reports over months and years.", accent: "#fbbf24" },
    { icon: "🔍", title: "Ask Anything", desc: "Chat naturally with your entire health history.", accent: "#f87171" },
    { icon: "🇮🇳", title: "India-First", desc: "Built for Indian lab formats, ranges, diets, and context.", accent: "#fb923c" },
  ];

  return (
    <section id="features" style={{ background: "#060810", padding: "120px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          style={{ textAlign: "center", marginBottom: 60 }}>
          <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.1 }}>
            Everything your doctor<br />
            <span style={{ color: "rgba(255,255,255,0.4)" }}>wishes you had.</span>
          </h2>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3, 1fr)", gap: 16 }}>
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.07 }}
              whileHover={{ y: -5, boxShadow: `0 12px 40px rgba(0,0,0,0.3)` }}
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "28px 24px", cursor: "default", transition: "box-shadow 0.2s" }}>
              <div style={{ fontSize: 28, marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: "'DM Sans', sans-serif", marginBottom: 10 }}>{f.title}</h3>
              <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.48)", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>{f.desc}</p>
              <div style={{ marginTop: 20, height: 2, width: 32, borderRadius: 2, background: f.accent, opacity: 0.7 }} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustIcon({ variant }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.5 19 6v5.2c0 4.4-2.8 7.8-7 9.3-4.2-1.5-7-4.9-7-9.3V6l7-2.5Z"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinejoin="round"
        opacity="0.88"
      />
      {variant === "lock" ? (
        <>
          <path d="M8.7 11.2h6.6v4.4H8.7v-4.4Z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
          <path d="M10 11.2V9.6a2 2 0 0 1 4 0v1.6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
        </>
      ) : variant === "delete" ? (
        <>
          <path d="M9 10h6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
          <path d="M10 10.2v4.5m4-4.5v4.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
          <path d="M9.5 15.8h5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
        </>
      ) : variant === "compliance" ? (
        <>
          <path d="m8.6 12 2.2 2.2 4.8-5" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8.5 16.2h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
        </>
      ) : variant === "control" ? (
        <>
          <path d="M12 14.6V9.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <path d="m9.6 11.6 2.4-2.2 2.4 2.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 16.4h6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M8.5 11.8h7" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
          <path d="M9.8 9.2h4.4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
          <path d="M10 14.4h4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

function PrivacyTrustSection() {
  const mobile = useIsMobile();
  const trustCards = [
    {
      icon: "lock",
      title: "End-to-end encryption",
      desc: "Your reports and health history are protected in transit and at rest with modern encryption standards.",
    },
    {
      icon: "shield",
      title: "Never sold to insurers or pharma",
      desc: "Your health signals are not a marketplace. We do not sell personal data to insurers, pharma companies, or ad networks.",
    },
    {
      icon: "delete",
      title: "Delete your data anytime",
      desc: "You stay in control. Remove reports, conversations, and account data whenever you choose.",
    },
    {
      icon: "control",
      title: "You control your data",
      desc: "Export or permanently delete your reports and health history at any time, no questions asked.",
    },
  ];

  return (
    <section id="privacy-trust" style={{ background: VOID, padding: "120px 24px", position: "relative", overflow: "hidden" }}>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          width: 720,
          height: 320,
          transform: "translateX(-50%)",
          background: "radial-gradient(ellipse at 50% 0%, rgba(0,217,126,0.065) 0%, transparent 68%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ textAlign: "center", marginBottom: 48 }}
        >
          <p style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(0,217,126,0.62)", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, marginBottom: 16 }}>
            Privacy by design
          </p>
          <h2 style={{ fontSize: "clamp(2.1rem, 5vw, 3.9rem)", fontWeight: 800, color: "#f7fffbed", letterSpacing: "-0.04em", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.05, maxWidth: 760, margin: "0 auto" }}>
            Your health data belongs to you. Full stop.
          </h2>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(4, 1fr)", gap: 14 }}>
          {trustCards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.48, delay: i * 0.06, ease: "easeOut" }}
              style={{
                minHeight: 232,
                background: "linear-gradient(180deg, rgba(255,255,255,0.032), rgba(255,255,255,0.018))",
                border: "1px solid rgba(143,255,205,0.105)",
                borderRadius: 18,
                padding: "22px 20px",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.035), 0 18px 44px rgba(0,0,0,0.22)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  border: "1px solid rgba(0,217,126,0.16)",
                  background: "rgba(0,217,126,0.055)",
                  color: "rgba(143,255,205,0.78)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 18,
                }}
              >
                <TrustIcon variant={card.icon} />
              </div>
              <h3 style={{ margin: 0, color: "rgba(255,255,255,0.9)", fontSize: 15.5, lineHeight: 1.35, fontWeight: 700 }}>
                {card.title}
              </h3>
              <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.43)", fontSize: 13, lineHeight: 1.65 }}>
                {card.desc}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.18, ease: "easeOut" }}
          style={{
            margin: "34px auto 0",
            maxWidth: 720,
            textAlign: "center",
            color: "rgba(255,255,255,0.52)",
            fontSize: 14.5,
            lineHeight: 1.7,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Built by engineers who believe health data is sacred.
        </motion.p>
      </div>
    </section>
  );
}

function FinalCTA({ onOpenWaitlist }) {
  const [hover, setHover] = useState(false);
  const mobile = useIsMobile();
  return (
    <section style={{ background: VOID, padding: "140px 24px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle, rgba(0,217,126,0.1) 0%, transparent 70%)`, filter: "blur(40px)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 700, margin: "0 auto" }}>
        <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
          style={{ fontSize: "clamp(2rem, 8vw, 5rem)", fontWeight: 800, color: "#fff", letterSpacing: "-0.04em", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.05, wordBreak: "break-word" }}>
          Start understanding<br />your health today.
        </motion.h2>

        <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.1 }}
          style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", maxWidth: 500, margin: "20px auto 0", lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif" }}>
          Free to try. No doctor required. Your data stays private.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.2 }}
          style={{ marginTop: 40 }}>
          <motion.button type="button" onClick={onOpenWaitlist}
            onHoverStart={() => setHover(true)} onHoverEnd={() => setHover(false)}
            whileHover={{ scale: 1.04, boxShadow: `0 0 64px rgba(0,217,126,0.5)` }} whileTap={{ scale: 0.97 }}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "16px 36px", background: `linear-gradient(135deg, ${EMERALD}, ${TEAL})`, color: "#03120a", border: "none", borderRadius: 36, fontSize: 16, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", boxShadow: `0 0 40px rgba(0,217,126,0.35)`, cursor: "pointer", width: mobile ? "100%" : "auto", maxWidth: mobile ? 360 : "none" }}>
            <AnimatePresence mode="wait">
              <motion.span key={hover ? "go" : "upload"} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: 0.15 }}>
                {hover ? "Let's go →" : "Upload Your First Report →"}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 }}
          style={{ marginTop: 32, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          {["🔒 Private & Secure", "🇮🇳 Made for India", "⚡ Instant Results"].map(b => (
            <span key={b} style={{ padding: "8px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "'DM Sans', sans-serif" }}>{b}</span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  const mobile = useIsMobile();

  return (
    <footer style={{ background: "#030408", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "32px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: mobile ? "center" : "space-between", flexWrap: "wrap", gap: 16, textAlign: mobile ? "center" : "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 20, height: 20, borderRadius: 6, background: `linear-gradient(135deg, ${EMERALD}, ${TEAL})` }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: "#fff", fontFamily: "'DM Sans', sans-serif" }}>vaidy</span>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          {FOOTER_LINKS.map(({ label, href }) => (
            <Link key={label} href={href} style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", textDecoration: "none", fontFamily: "'DM Sans', sans-serif", transition: "color 0.15s" }}
              onMouseEnter={e => e.target.style.color = "#fff"} onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.35)"}>{label}</Link>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", fontFamily: "'DM Sans', sans-serif" }}>© 2026 Vaidy. Built for India.</p>
      </div>
    </footer>
  );
}

export default function VaidyLanding() {
  const { scrollY } = useScroll();
  const mouse = useMouseGlow();
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const openWaitlist = useCallback(() => setWaitlistOpen(true), []);
  const closeWaitlist = useCallback(() => setWaitlistOpen(false), []);

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,600;0,9..40,700;0,9..40,800&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  return (
    <div style={{ background: VOID, minHeight: "100vh", position: "relative" }}>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 999,
        background: `radial-gradient(600px circle at ${mouse.x}px ${mouse.y}px, rgba(0,217,126,0.04), transparent 60%)`,
        transition: "background 0.1s"
      }} />
      <Navbar scrollY={scrollY} onOpenWaitlist={openWaitlist} />
      <Hero onOpenWaitlist={openWaitlist} />
      <SocialProofSection />
      <UploadSection />
      <ExplainSection />
      <TimelineSection />
      <FeatureCards />
      <PrivacyTrustSection />
      <FinalCTA onOpenWaitlist={openWaitlist} />
      <Footer />
      <WaitlistModal open={waitlistOpen} onClose={closeWaitlist} />
    </div>
  );
}
