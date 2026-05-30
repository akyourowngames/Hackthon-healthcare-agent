'use client';

import { useRef, useState, useEffect } from 'react';
import { Upload, Zap, MessageSquare, FileText, Brain, Shield, Activity, TrendingUp } from 'lucide-react';

export function BentoFeatures() {
    const ref = useRef<HTMLElement>(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) setInView(true);
        }, { threshold: 0.1 });
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return (
        <section id="features" className="py-24 md:py-40 px-6" ref={ref}>
            <div className="max-w-6xl mx-auto">
                <div className={`bento-grid ${inView ? 'stagger-in' : ''}`}>
                    <div className="bento-item bento-large flex flex-col justify-between">
                        <div>
                            <div className="text-white mb-4"><Upload size={32} /></div>
                            <h3 className="text-2xl font-bold mb-2">Smart Report Upload</h3>
                            <p className="text-zinc-500 text-sm">Upload PDFs, images, or text files. Vaidy extracts biomarkers and clinical findings automatically using AI vision.</p>
                        </div>
                        <div className="mt-6 p-4 bg-white/[0.02] rounded-xl border border-white/5">
                            <div className="grid grid-cols-3 gap-2">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className="aspect-video bg-white/5 rounded animate-pulse" style={{ animationDelay: `${i * 100}ms` }}></div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bento-item row-span-2 flex flex-col justify-between">
                        <div>
                            <div className="text-white mb-4"><Zap size={32} /></div>
                            <h3 className="text-2xl font-bold mb-2">Instant Processing</h3>
                            <p className="text-zinc-500 text-sm">Fast extraction pipeline. Your reports are processed in seconds.</p>
                        </div>
                        <div className="mt-6 space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="h-2 flex-1 bg-zinc-900 rounded-full overflow-hidden">
                                    <div className="h-full w-[85%] bg-white rounded-full animate-pulse"></div>
                                </div>
                                <span className="text-xs text-zinc-600">Upload</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-2 flex-1 bg-zinc-900 rounded-full overflow-hidden">
                                    <div className="h-full w-[60%] bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
                                </div>
                                <span className="text-xs text-zinc-600">Extract</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-2 flex-1 bg-zinc-900 rounded-full overflow-hidden">
                                    <div className="h-full w-[40%] bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
                                </div>
                                <span className="text-xs text-zinc-600">Analyze</span>
                            </div>
                        </div>
                        <div className="mt-6 p-4 bg-white/[0.02] rounded-xl border border-white/5 text-center">
                            <div className="text-3xl font-mono font-bold text-white">&lt;5s</div>
                            <div className="text-[10px] uppercase tracking-widest text-zinc-600 mt-1">processing time</div>
                        </div>
                    </div>

                    <div className="bento-item">
                        <div className="text-white mb-3"><FileText size={24} /></div>
                        <h3 className="font-bold mb-1">Biomarker Extraction</h3>
                        <p className="text-zinc-500 text-xs">25+ biomarkers with reference ranges and anomaly flags.</p>
                    </div>

                    <div className="bento-item">
                        <div className="text-white mb-3"><Activity size={24} /></div>
                        <h3 className="font-bold mb-1">Health Dashboard</h3>
                        <p className="text-zinc-500 text-xs">Visualize trends, scores, and anomalies at a glance.</p>
                    </div>

                    <div className="bento-item">
                        <div className="text-white mb-3"><TrendingUp size={24} /></div>
                        <h3 className="font-bold mb-1">Trend Tracking</h3>
                        <p className="text-zinc-500 text-xs">Track biomarker changes across multiple reports over time.</p>
                    </div>

                    <div className="bento-item bento-wide">
                        <div className="flex items-start gap-4">
                            <div className="text-white"><MessageSquare size={28} /></div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold mb-2">AI Chat</h3>
                                <p className="text-zinc-500 text-sm">Ask questions about your health data in natural language. Supports multiple languages.</p>
                                <div className="mt-3 p-3 bg-zinc-900 rounded-lg font-mono text-xs text-zinc-400">
                                    <span className="text-white">&quot;</span>What were my cholesterol levels last month?<span className="text-white">&quot;</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bento-item">
                        <div className="text-white mb-3"><Brain size={24} /></div>
                        <h3 className="font-bold mb-1">RAG Memory</h3>
                        <p className="text-zinc-500 text-xs">Context-aware responses using your full health history.</p>
                    </div>

                    <div className="bento-item">
                        <div className="text-white mb-3"><Shield size={24} /></div>
                        <h3 className="font-bold mb-1">Local First</h3>
                        <p className="text-zinc-500 text-xs">Data stays on your machine. No cloud dependency required.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
