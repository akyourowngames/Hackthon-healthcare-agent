'use client';

import { useRef } from 'react';
import { useScrollProgress } from '@/hooks';
import { Cpu } from 'lucide-react';

export function TechSection() {
    const sectionRef = useRef<HTMLElement>(null);
    const progress = useScrollProgress(sectionRef);

    return (
        <section id="tech" ref={sectionRef} className="py-24 md:py-40 px-6 relative overflow-hidden">
            <div
                className="absolute inset-0 opacity-[0.06] pointer-events-none transition-transform duration-300 ease-out"
                style={{
                    backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                    backgroundSize: '60px 60px',
                    transform: `translateY(${(progress - 0.5) * 100}px) rotate(${(progress - 0.5) * 5}deg) scale(${1 + Math.abs(progress - 0.5) * 0.1})`
                }}
            ></div>

            <div
                className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-100"
                style={{ transform: `scaleX(${0.4 + Math.abs(progress - 0.5) * 2.5})` }}
            ></div>

            <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 md:gap-20 items-center relative z-10">
                <div
                    className="space-y-6 md:space-y-8 transition-all duration-300 ease-out text-center md:text-left"
                    style={{ transform: `translateX(${(progress - 0.5) * -50}px) scale(${0.95 + (1 - Math.abs(progress - 0.5) * 2) * 0.05})` }}
                >
                    <span className="text-[10px] uppercase tracking-[0.4em] text-white font-bold">Architecture</span>
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tighter leading-none">Health AI: <br /><span className="text-zinc-400">NVIDIA NIM + LLMs.</span></h2>
                    <p className="text-zinc-400 text-base md:text-lg font-light leading-relaxed">
                        Vaidy runs a multimodal health analysis pipeline. Vision models extract biomarkers from reports. Language models answer your health questions with context.
                    </p>
                    <div className="grid grid-cols-2 gap-6 md:gap-8 pt-6 md:pt-10">
                        <div>
                            <div className="text-2xl md:text-3xl font-mono mb-2 text-white">25+</div>
                            <div className="text-[9px] md:text-[10px] uppercase tracking-widest text-zinc-600">Biomarkers Tracked</div>
                        </div>
                        <div>
                            <div className="text-2xl md:text-3xl font-mono mb-2 text-white">RAG</div>
                            <div className="text-[9px] md:text-[10px] uppercase tracking-widest text-zinc-600">Memory-Powered Chat</div>
                        </div>
                    </div>
                </div>

                <div
                    className="relative aspect-square flex items-center justify-center transition-transform duration-300 ease-out scale-75 md:scale-100"
                    style={{
                        transform: `perspective(1000px) rotateY(${(progress - 0.5) * -45}deg) scale(${0.8 + (1 - Math.abs(progress - 0.5) * 2) * 0.2})`,
                        filter: `blur(${Math.abs(progress - 0.5) * 10}px)`
                    }}
                >
                    <div className="absolute w-full h-full border border-white/5 rounded-full animate-[spin_25s_linear_infinite]"></div>
                    <div className="absolute w-[80%] h-[80%] border border-white/10 rounded-full animate-[spin_20s_linear_infinite_reverse]"></div>
                    <div className="w-1/3 h-1/3 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute z-10 flex flex-col items-center justify-center">
                        <div className="w-20 h-20 md:w-24 md:h-24 border-2 border-white/20 rounded-2xl flex items-center justify-center bg-white/5 backdrop-blur-sm">
                            <Cpu size={48} className="text-white" />
                        </div>
                        <div className="mt-6 text-[8px] md:text-[10px] font-mono tracking-[0.5em] text-white/50 uppercase text-center">Health Engine</div>
                    </div>
                </div>
            </div>
        </section>
    );
}
