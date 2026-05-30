'use client';

import { useEffect, useState } from 'react';
import { Activity, Search, Menu, Wifi, WifiOff } from 'lucide-react';
import { vaidyApi } from '@/lib/vaidyApi';

interface TopBarProps {
    onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
    const [uptime, setUptime] = useState('00:00:00');
    const [startTime] = useState(() => Date.now());
    const [backendOk, setBackendOk] = useState<boolean | null>(null);

    useEffect(() => {
        const timer = setInterval(() => {
            const diff = Date.now() - startTime;
            const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
            const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
            const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
            setUptime(`${h}:${m}:${s}`);
        }, 1000);
        return () => clearInterval(timer);
    }, [startTime]);

    useEffect(() => {
        const check = async () => {
            try {
                const res = await vaidyApi.getHealth();
                setBackendOk(res.ok);
            } catch {
                setBackendOk(false);
            }
        };
        check();
        const interval = setInterval(check, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <header className="h-16 md:h-20 bg-[#080808]/80 backdrop-blur-md border-b border-zinc-900 px-6 md:px-10 flex items-center justify-between z-40 sticky top-0">
            <div className="flex items-center gap-6">
                <button onClick={onMenuClick} className="lg:hidden p-2 -ml-2 text-zinc-400 hover:text-white">
                    <Menu size={20} />
                </button>

                <div className="hidden lg:flex items-center gap-2 text-zinc-500">
                    {backendOk === null ? (
                        <Activity size={14} className="text-zinc-600 animate-pulse" />
                    ) : backendOk ? (
                        <Wifi size={14} className="text-emerald-500" />
                    ) : (
                        <WifiOff size={14} className="text-red-500" />
                    )}
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${backendOk ? 'text-emerald-500/70' : backendOk === false ? 'text-red-500/70' : 'text-zinc-600'}`}>
                        {backendOk === null ? 'Checking...' : backendOk ? 'System Normal' : 'Offline'}
                    </span>
                </div>

                <div className="h-4 w-px bg-zinc-800 hidden lg:block" />

                <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Session</span>
                    <span className="text-xs font-mono font-bold text-zinc-300">{uptime}</span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative hidden sm:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                    <input
                        placeholder="Search health data..."
                        className="bg-zinc-900/50 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-[11px] font-medium focus:outline-none focus:border-zinc-600 w-48 lg:w-64 transition-all placeholder:text-zinc-600 text-white"
                    />
                </div>

                <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${backendOk ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-900'}`}>
                    <div className={`w-2 h-2 rounded-full ${backendOk ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
                </div>
            </div>
        </header>
    );
}
