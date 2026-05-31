'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { SystemSidebar, TopBar, MobileBottomNav } from '@/components/dashboard/layout';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, loading } = useAuth();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const isChat = pathname === '/dashboard/chat';

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#080808] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className={`${isChat ? 'h-screen overflow-hidden' : 'min-h-screen'} bg-[#080808] text-zinc-300 font-sans flex flex-col lg:flex-row`}>
            <SystemSidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                mobileOpen={mobileMenuOpen}
                onMobileClose={() => setMobileMenuOpen(false)}
            />
            {isChat ? (
                <div className="flex-grow flex flex-col min-w-0">
                    <TopBar onMenuClick={() => setMobileMenuOpen(true)} />
                    <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                        {children}
                    </div>
                </div>
            ) : (
                <div className="flex-grow flex flex-col min-w-0">
                    <TopBar onMenuClick={() => setMobileMenuOpen(true)} />
                    <main className="flex-grow overflow-y-auto p-4 md:p-8 lg:p-10 pb-24 lg:pb-10 custom-scrollbar">
                        <div className="max-w-4xl lg:max-w-6xl 2xl:max-w-[1800px] mx-auto w-full transition-all duration-300">
                            {children}
                        </div>
                    </main>
                    <footer className="hidden lg:flex h-10 border-t border-zinc-900 bg-black/40 px-6 md:px-10 items-center justify-between text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-600">
                        <div className="flex gap-6">
                            <span className="text-blue-500/50">VAIDY</span>
                            <span>Local Instance: OK</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.2)]" />
                            <span>Connection Secure</span>
                        </div>
                    </footer>
                </div>
            )}
            <MobileBottomNav />
            <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
        @media (max-width: 768px) { .custom-scrollbar::-webkit-scrollbar { width: 0; } }
      `}</style>
        </div>
    );
}
