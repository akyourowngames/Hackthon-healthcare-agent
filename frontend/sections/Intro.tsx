'use client';

import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { useRef } from 'react';

const particles = [
  { left: '12%', top: '20%', size: 5, delay: 0.1, duration: 8.5 },
  { left: '22%', top: '68%', size: 4, delay: 0.8, duration: 9.2 },
  { left: '34%', top: '42%', size: 3, delay: 0.3, duration: 8.9 },
  { left: '47%', top: '26%', size: 4, delay: 1.2, duration: 10.2 },
  { left: '58%', top: '64%', size: 5, delay: 0.5, duration: 9.6 },
  { left: '69%', top: '34%', size: 3, delay: 1.5, duration: 8.7 },
  { left: '78%', top: '72%', size: 4, delay: 0.2, duration: 9.9 },
  { left: '86%', top: '24%', size: 3, delay: 1.1, duration: 10.4 },
];

export default function Intro() {
  const introRef = useRef<HTMLElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: introRef,
    offset: ['start start', 'end start'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 24,
    mass: 0.35,
  });

  const opacity = useTransform(smoothProgress, [0, 0.55, 1], [1, 0.52, 0.04]);
  const scale = useTransform(smoothProgress, [0, 0.65, 1], [1, 0.96, 0.92]);
  const y = useTransform(smoothProgress, [0, 0.6, 1], ['0vh', '-18vh', '-34vh']);

  return (
    <section
      id="intro"
      ref={introRef}
      className="relative h-[150vh] overflow-hidden bg-transparent"
    >
      <div className="sticky top-0 flex h-screen items-center justify-center">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-[-10%] left-1/2 h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-cyan-300/8 blur-[130px]" />
          <div className="absolute bottom-[6%] left-[16%] h-[18rem] w-[18rem] rounded-full bg-emerald-300/7 blur-[120px]" />
          <div className="absolute right-[10%] bottom-[14%] h-[15rem] w-[15rem] rounded-full bg-teal-300/6 blur-[110px]" />
        </div>

        <div className="pointer-events-none absolute inset-0">
          {particles.map((particle, index) => (
            <motion.span
              key={`${particle.left}-${particle.top}-${index}`}
              className="absolute rounded-full bg-cyan-100/35"
              style={{
                left: particle.left,
                top: particle.top,
                width: particle.size,
                height: particle.size,
              }}
              animate={{
                y: [0, -16, 0],
                opacity: [0.12, 0.35, 0.12],
              }}
              transition={{
                duration: particle.duration,
                delay: particle.delay,
                ease: 'easeInOut',
                repeat: Number.POSITIVE_INFINITY,
              }}
            />
          ))}
        </div>

        <motion.div
          className="relative z-10 px-6 text-center will-change-transform"
          style={{ opacity, scale, y }}
        >
          <p className="mb-4 text-[0.72rem] tracking-[0.32em] text-zinc-400 uppercase sm:text-xs">
            FUTURE OF HEALTH INTELLIGENCE
          </p>
          <h1 className="bg-gradient-to-b from-white via-zinc-100 to-zinc-500 bg-clip-text text-6xl font-semibold tracking-[-0.04em] text-transparent sm:text-7xl md:text-8xl lg:text-[9.5rem]">
            VAIDY AI
          </h1>
        </motion.div>
      </div>
    </section>
  );
}
