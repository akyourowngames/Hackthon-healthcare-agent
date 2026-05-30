'use client';

import { useState, useEffect } from 'react';
import { Upload, FileText, BarChart3, MessageSquare, Check } from 'lucide-react';

const demos = [
    { title: 'Upload Report', desc: 'Drop your lab report PDF here', icon: <Upload size={20} /> },
    { title: 'Extract Biomarkers', desc: 'AI parsing health data...', icon: <FileText size={20} /> },
    { title: 'Track & Chat', desc: 'View trends, ask questions', icon: <MessageSquare size={20} /> },
];

export function DemoSection() {
    const [activeDemo, setActiveDemo] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setActiveDemo((prev) => (prev + 1) % demos.length);
        }, 3000);
        return () => clearInterval(timer);
    }, []);

    return (
        <section id="demo" className="py-24 md:py-40 px-6">
            <div className="max-w-6xl mx-auto">
                <div className="grid lg:grid-cols-2 gap-12 items-start">
                    <div className="demo-window">
                        <div className="demo-titlebar">
                            <div className="demo-dot demo-dot-red"></div>
                            <div className="demo-dot demo-dot-yellow"></div>
                            <div className="demo-dot demo-dot-green"></div>
                            <span className="ml-4 text-xs text-zinc-500 font-mono">vaidy-dashboard</span>
                        </div>
                        <div className="demo-content relative">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-zinc-400">
                                    <BarChart3 size={16} className="text-white" />
                                    <span className="text-sm font-mono">Vaidy v1.0</span>
                                </div>
                                <div className="h-px bg-zinc-800 my-4"></div>

                                {demos.map((demo, i) => (
                                    <div
                                        key={i}
                                        className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-500 ${activeDemo >= i ? 'bg-white/5 border border-white/10' : 'opacity-30'}`}
                                    >
                                        <div className={`${activeDemo >= i ? 'text-white' : 'text-zinc-600'}`}>
                                            {activeDemo > i ? <Check size={20} className="text-white" /> : demo.icon}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-white">{demo.title}</div>
                                            <div className="text-xs text-zinc-500 font-mono">{demo.desc}</div>
                                        </div>
                                        {activeDemo === i && (
                                            <div className="ml-auto">
                                                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                <div className="mt-6 p-4 bg-white/10 border border-white/20 rounded-lg">
                                    <div className="flex items-center gap-2 text-white">
                                        <Check size={16} />
                                        <span className="text-sm font-medium">Report processed successfully</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <h3 className="text-3xl md:text-4xl font-bold tracking-tight">Intelligent Health Analysis</h3>
                        <p className="text-zinc-400 leading-relaxed">
                            Vaidy uses AI to parse your lab reports, extract biomarkers, and let you chat about your health data in natural language.
                        </p>
                        <div className="space-y-4">
                            {[
                                { icon: <Upload size={20} />, title: 'Easy Upload', desc: 'Drag & drop PDFs, images, or text reports' },
                                { icon: <FileText size={20} />, title: 'Smart Extraction', desc: 'AI-powered biomarker detection with reference ranges' },
                                { icon: <MessageSquare size={20} />, title: 'Natural Language Chat', desc: 'Ask questions about your health data in any language' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/30 transition-colors">
                                    <div className="text-white">{item.icon}</div>
                                    <div>
                                        <div className="font-medium text-white">{item.title}</div>
                                        <div className="text-sm text-zinc-500">{item.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
