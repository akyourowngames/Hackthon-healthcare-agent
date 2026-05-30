'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, RefreshCw, Search, Plus } from 'lucide-react';
import { vaidyApi } from '@/lib/vaidyApi';
import { useVaidyStore } from '@/stores/vaidyStore';

export default function MemoryPage() {
    const { memoryEntries, setMemoryEntries } = useVaidyStore();
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [newMemory, setNewMemory] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchMemory = async () => {
        setLoading(true);
        try {
            const res = await vaidyApi.getMemory();
            setMemoryEntries(res?.entries || []);
        } catch (err) {
            console.error('Failed to fetch memory:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMemory(); }, []);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        try {
            const res = await vaidyApi.memoryRecall(searchQuery);
            setSearchResults(res?.hits || []);
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setSearching(false);
        }
    };

    const handleRemember = async () => {
        if (!newMemory.trim()) return;
        setSaving(true);
        try {
            await vaidyApi.remember(newMemory.trim());
            setNewMemory('');
            fetchMemory();
        } catch (err) {
            console.error('Failed to save memory:', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-10"
        >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Memory</h1>
                    <p className="text-zinc-500 text-sm mt-1">Stored health insights and context from your conversations.</p>
                </div>
                <button
                    onClick={fetchMemory}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {/* Search */}
                    <div className="flex gap-3">
                        <div className="flex-1 relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="Search memories..."
                                className="w-full bg-[#0A0A0A] border border-zinc-800/50 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={searching}
                            className="px-4 py-2.5 bg-white hover:bg-zinc-200 disabled:bg-zinc-800 text-black text-sm font-bold rounded-xl transition-colors"
                        >
                            {searching ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                        </button>
                    </div>

                    {/* Search results */}
                    {searchResults.length > 0 && (
                        <div className="bg-[#0A0A0A] border border-zinc-800/50 rounded-2xl p-6 space-y-3">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Search Results</h3>
                            {searchResults.map((hit: any, i: number) => (
                                <div key={i} className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                                    <p className="text-sm text-zinc-300">{hit.text}</p>
                                    <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-600">
                                        <span>Score: {(hit.score * 100).toFixed(0)}%</span>
                                        <span>{hit.source}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Memory list */}
                    <div className="bg-[#0A0A0A] border border-zinc-800/50 rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-zinc-800/50">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">All Memories</h3>
                            </div>
                        </div>
                        <div className="divide-y divide-zinc-800/30 max-h-[500px] overflow-y-auto">
                            {loading ? (
                                <div className="p-12 text-center">
                                    <RefreshCw size={24} className="text-zinc-600 mx-auto mb-4 animate-spin" />
                                    <p className="text-sm text-zinc-500">Loading memories...</p>
                                </div>
                            ) : memoryEntries.length === 0 ? (
                                <div className="p-12 text-center">
                                    <Brain size={32} className="text-zinc-700 mx-auto mb-4" />
                                    <p className="text-sm text-zinc-500">No memories stored yet</p>
                                    <p className="text-[10px] text-zinc-700 mt-1">Chat with Vaidy to build health context</p>
                                </div>
                            ) : (
                                memoryEntries.map((entry: any) => (
                                    <div key={entry.id} className="p-4 hover:bg-zinc-800/20 transition-all">
                                        <p className="text-sm text-zinc-300">{entry.text}</p>
                                        <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-600">
                                            <span>{entry.source}</span>
                                            <span>Importance: {(entry.importance * 100).toFixed(0)}%</span>
                                            <span>{new Date(entry.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Add memory */}
                <div className="bg-[#0A0A0A] border border-zinc-800/50 rounded-2xl p-6 sticky top-24 space-y-4">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Add Memory</h3>
                    <textarea
                        value={newMemory}
                        onChange={(e) => setNewMemory(e.target.value)}
                        placeholder="Store a health insight or note..."
                        rows={4}
                        className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 resize-none transition-colors"
                    />
                    <button
                        onClick={handleRemember}
                        disabled={!newMemory.trim() || saving}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 text-black text-xs font-black uppercase tracking-widest rounded-xl transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                    >
                        {saving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                        Store Memory
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
