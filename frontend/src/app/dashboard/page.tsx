'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText, MessageSquare, Brain, Upload, AlertTriangle,
    Heart, RefreshCw, ChevronRight, Zap, ArrowUpRight, Calendar, Building
} from 'lucide-react';
import { vaidyApi } from '@/lib/vaidyApi';
import { useVaidyStore } from '@/stores/vaidyStore';

function HealthScoreRing({ score }: { score: number }) {
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const color = score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';

    return (
        <div className="relative w-36 h-36">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={radius} fill="none" stroke="#1a1a1a" strokeWidth="8" />
                <motion.circle
                    cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="8"
                    strokeLinecap="round" strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                    className="text-4xl font-black text-white font-mono"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                >
                    {score}
                </motion.span>
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">/ 100</span>
            </div>
        </div>
    );
}

function MetricCard({ label, value, icon: Icon, color, sub }: {
    label: string; value: string | number;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    color: string; sub?: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className="bg-[#0A0A0A] border border-zinc-800/50 p-5 rounded-2xl group hover:border-zinc-700/50 transition-all"
        >
            <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${color}`}>
                    <Icon size={16} />
                </div>
                {sub && <span className="text-[10px] font-mono text-zinc-600">{sub}</span>}
            </div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-1">{label}</div>
            <div className="text-2xl font-black tracking-tight text-white">{value}</div>
        </motion.div>
    );
}

function UploadZone({ onUpload }: { onUpload: (file: File) => void }) {
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onUpload(file);
    }, [onUpload]);

    return (
        <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
                dragOver
                    ? 'border-blue-500 bg-blue-500/5'
                    : 'border-zinc-800 hover:border-zinc-600 bg-[#0A0A0A]'
            }`}
        >
            <input ref={inputRef} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md"
                onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
            <Upload size={28} className={`mx-auto mb-3 ${dragOver ? 'text-blue-400' : 'text-zinc-600'}`} />
            <p className="text-sm font-medium text-zinc-300">Drop a lab report here</p>
            <p className="text-[11px] text-zinc-600 mt-1">PDF, images, or text files</p>
        </div>
    );
}

function UploadProgress({ progress }: { progress: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center gap-3"
        >
            <RefreshCw size={16} className="text-blue-400 animate-spin" />
            <div>
                <p className="text-sm font-medium text-blue-300">Processing report...</p>
                <p className="text-[11px] text-blue-400/60 mt-0.5">{progress}</p>
            </div>
        </motion.div>
    );
}

export default function DashboardPage() {
    const {
        reports, healthScore, anomalies, biomarkers, notifications,
        setReports, setHealthScore, setAnomalies, setBiomarkers, setNotifications, setSystemStatus
    } = useVaidyStore();
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<any>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [reportsRes, statusRes, dashRes, notifRes] = await Promise.allSettled([
                vaidyApi.getReports(),
                vaidyApi.getStatus(),
                vaidyApi.getDashboard(),
                vaidyApi.getNotifications(),
            ]);
            if (reportsRes.status === 'fulfilled') setReports(reportsRes.value.reports || []);
            if (statusRes.status === 'fulfilled') { setStatus(statusRes.value); setSystemStatus(statusRes.value); }
            if (dashRes.status === 'fulfilled') {
                const d = dashRes.value;
                setHealthScore(d.health_score || null);
                setAnomalies(d.anomalies || []);
                setBiomarkers(d.biomarkers || []);
            }
            if (notifRes.status === 'fulfilled') setNotifications(notifRes.value.notifications || []);
        } catch (err) {
            console.error('Dashboard fetch failed:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleUpload = async (file: File) => {
        setUploading(true);
        setUploadProgress('Uploading file...');
        try {
            await vaidyApi.uploadAndWait(file, (stage) => setUploadProgress(stage));
            await fetchData();
        } catch (err) {
            console.error('Upload failed:', err);
        } finally {
            setUploading(false);
            setUploadProgress('');
        }
    };

    const score = healthScore?.score ?? 0;
    const abnormalCount = healthScore?.abnormal_latest ?? 0;
    const biomarkerCount = healthScore?.latest_biomarkers ?? 0;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Health Dashboard</h1>
                    <p className="text-zinc-500 text-sm mt-1">Overview of your health data and report status.</p>
                </div>
                <button onClick={fetchData}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors self-start">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Top Row: Health Score + Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Health Score Ring */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="lg:col-span-4 bg-[#0A0A0A] border border-zinc-800/50 rounded-2xl p-6 flex flex-col items-center justify-center"
                >
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4">Health Score</div>
                    <HealthScoreRing score={score} />
                    <div className="flex gap-6 mt-4">
                        <div className="text-center">
                            <div className="text-lg font-mono font-bold text-white">{biomarkerCount}</div>
                            <div className="text-[9px] uppercase tracking-widest text-zinc-600">Biomarkers</div>
                        </div>
                        <div className="text-center">
                            <div className={`text-lg font-mono font-bold ${abnormalCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{abnormalCount}</div>
                            <div className="text-[9px] uppercase tracking-widest text-zinc-600">Abnormal</div>
                        </div>
                    </div>
                </motion.div>

                {/* Metric Cards */}
                <div className="lg:col-span-8 grid grid-cols-2 gap-4">
                    <MetricCard label="Total Reports" value={reports.length} icon={FileText} color="bg-blue-500/10 text-blue-400" sub={`${status?.report_count || 0} processed`} />
                    <MetricCard label="Anomalies" value={anomalies.length} icon={AlertTriangle}
                        color={anomalies.length > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}
                        sub={anomalies.length > 0 ? 'Needs review' : 'All clear'} />
                    <MetricCard label="Memory Entries" value={status?.memory?.entries || 0} icon={Brain} color="bg-violet-500/10 text-violet-400" sub={`${status?.memory?.sessions || 0} sessions`} />
                    <MetricCard label="AI Model" value={status?.chat_model?.split('/').pop()?.substring(0, 18) || '...'} icon={Zap} color="bg-cyan-500/10 text-cyan-400" sub="Active" />
                </div>
            </div>

            {/* Upload Zone */}
            <AnimatePresence>
                {uploading ? (
                    <UploadProgress progress={uploadProgress} />
                ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <UploadZone onUpload={handleUpload} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom Row: Reports + Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Reports */}
                <div className="lg:col-span-2 bg-[#0A0A0A] border border-zinc-800/50 rounded-2xl overflow-hidden">
                    <div className="p-5 border-b border-zinc-800/50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Recent Reports</h3>
                        </div>
                        <a href="/dashboard/reports" className="text-[10px] font-mono text-zinc-500 hover:text-white transition-colors flex items-center gap-1">
                            View All <ChevronRight size={10} />
                        </a>
                    </div>
                    <div className="space-y-2">
                        {loading ? (
                            <div className="p-12 text-center">
                                <RefreshCw size={20} className="text-zinc-700 mx-auto mb-3 animate-spin" />
                                <p className="text-xs text-zinc-600">Loading...</p>
                            </div>
                        ) : reports.length === 0 ? (
                            <div className="p-12 text-center">
                                <FileText size={28} className="text-zinc-800 mx-auto mb-3" />
                                <p className="text-sm text-zinc-500">No reports yet</p>
                                <p className="text-[11px] text-zinc-700 mt-1">Upload a lab report above to get started</p>
                            </div>
                        ) : (
                            reports.slice(0, 5).map((report, i) => (
                                <motion.div
                                    key={report.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="bg-[#0A0A0A] border border-zinc-800/50 rounded-2xl p-5 cursor-pointer transition-all group hover:border-zinc-700/50 hover:bg-zinc-800/20"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-xl bg-zinc-800/50 text-zinc-500 group-hover:bg-zinc-800 group-hover:text-zinc-300 transition-colors">
                                            <FileText size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-white truncate">{report.patient_name || 'Unnamed Report'}</div>
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                                                    <Calendar size={10} />
                                                    {report.report_date || 'No date'}
                                                </span>
                                                <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                                                    <Building size={10} />
                                                    {report.lab_name || 'Unknown lab'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-xs font-mono text-zinc-400">
                                                {report.finding_count > 0
                                                    ? `${report.finding_count} finding${report.finding_count !== 1 ? 's' : ''}`
                                                    : `${report.biomarker_count} marker${report.biomarker_count !== 1 ? 's' : ''}`}
                                            </div>
                                            <div className="text-[10px] text-zinc-600 mt-0.5">{report.kind || 'report'}</div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6">
                    {/* System Status */}
                    <div className="bg-[#0A0A0A] border border-zinc-800/50 rounded-2xl p-5 space-y-4">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">System</h3>
                        <div className="space-y-3">
                            {[
                                { label: 'Backend', value: status?.ok ? 'Online' : 'Offline', ok: status?.ok },
                                { label: 'Reports', value: status?.report_count || 0 },
                                { label: 'Memory', value: `${status?.memory?.entries || 0} entries` },
                                { label: 'Sessions', value: status?.memory?.sessions || 0 },
                            ].map((item) => (
                                <div key={item.label} className="flex justify-between text-xs">
                                    <span className="text-zinc-500">{item.label}</span>
                                    {'ok' in item ? (
                                        <span className={`font-mono ${item.ok ? 'text-emerald-400' : 'text-red-400'}`}>{item.value as string}</span>
                                    ) : (
                                        <span className="font-mono text-white">{item.value}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Notifications */}
                    {notifications.length > 0 && (
                        <div className="bg-[#0A0A0A] border border-zinc-800/50 rounded-2xl p-5 space-y-3">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Alerts</h3>
                            {notifications.slice(0, 3).map((n: any, i: number) => (
                                <div key={i} className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                                    <p className="text-xs text-zinc-300">{n.message || n.text || 'Health alert'}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Quick Actions */}
                    <div className="bg-[#0A0A0A] border border-zinc-800/50 rounded-2xl p-5 space-y-3">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Quick Actions</h3>
                        <a href="/dashboard/chat" className="block p-3 bg-zinc-800/30 rounded-xl border border-zinc-800/50 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group">
                            <div className="flex items-center gap-3">
                                <MessageSquare size={16} className="text-blue-400" />
                                <div>
                                    <div className="text-xs font-bold text-white">Chat with Vaidy</div>
                                    <div className="text-[10px] text-zinc-600">Ask about your health data</div>
                                </div>
                                <ArrowUpRight size={12} className="ml-auto text-zinc-600 group-hover:text-blue-400 transition-colors" />
                            </div>
                        </a>
                        <a href="/dashboard/reports" className="block p-3 bg-zinc-800/30 rounded-xl border border-zinc-800/50 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all group">
                            <div className="flex items-center gap-3">
                                <FileText size={16} className="text-violet-400" />
                                <div>
                                    <div className="text-xs font-bold text-white">View Reports</div>
                                    <div className="text-[10px] text-zinc-600">Browse all health reports</div>
                                </div>
                                <ArrowUpRight size={12} className="ml-auto text-zinc-600 group-hover:text-violet-400 transition-colors" />
                            </div>
                        </a>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
