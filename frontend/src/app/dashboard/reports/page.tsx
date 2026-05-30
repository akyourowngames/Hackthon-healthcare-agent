'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText, RefreshCw, Calendar, Building, Hash, Search,
    Upload, ChevronRight, AlertTriangle, TrendingUp, X, ArrowUpRight
} from 'lucide-react';
import { vaidyApi } from '@/lib/vaidyApi';
import { useVaidyStore } from '@/stores/vaidyStore';
import type { Report } from '@/stores/vaidyStore';

function BiomarkerBadge({ name, value, unit, flag }: { name: string; value: any; unit?: string; flag?: string }) {
    const flagColor = flag === 'HIGH' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
        : flag === 'LOW' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
        : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    return (
        <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
            <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{name}</span>
                {flag && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${flagColor}`}>{flag}</span>}
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-lg font-mono font-bold text-white">{typeof value === 'number' ? value.toFixed(1) : value}</span>
                {unit && <span className="text-[10px] text-zinc-600">{unit}</span>}
            </div>
        </div>
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
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 ${
                dragOver ? 'border-blue-500 bg-blue-500/5' : 'border-zinc-800 hover:border-zinc-600 bg-[#0A0A0A]'
            }`}
        >
            <input ref={inputRef} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md"
                onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
            <Upload size={24} className={`mx-auto mb-2 ${dragOver ? 'text-blue-400' : 'text-zinc-600'}`} />
            <p className="text-sm font-medium text-zinc-300">Drop a report here</p>
            <p className="text-[11px] text-zinc-600 mt-0.5">PDF, images, or text</p>
        </div>
    );
}

export default function ReportsPage() {
    const { reports, setReports } = useVaidyStore();
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [reportDetail, setReportDetail] = useState<any>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [uploading, setUploading] = useState(false);

    const fetchReports = useCallback(async () => {
        setLoading(true);
        try {
            const res = await vaidyApi.getReports();
            setReports(res?.reports || []);
        } catch (err) {
            console.error('Failed to fetch reports:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchReports(); }, [fetchReports]);

    const loadReportDetail = async (report: Report) => {
        setSelectedReport(report);
        setLoadingDetail(true);
        try {
            const detail = await vaidyApi.getReport(report.id);
            setReportDetail(detail);
        } catch (err) {
            console.error('Failed to load report detail:', err);
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleUpload = async (file: File) => {
        setUploading(true);
        try {
            await vaidyApi.upload(file);
            await fetchReports();
        } catch (err) {
            console.error('Upload failed:', err);
        } finally {
            setUploading(false);
        }
    };

    const filtered = reports.filter((r) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (r.patient_name || '').toLowerCase().includes(q)
            || (r.lab_name || '').toLowerCase().includes(q)
            || (r.kind || '').toLowerCase().includes(q);
    });

    const biomarkers = reportDetail?.report?.biomarkers || reportDetail?.biomarkers || [];
    const findings = reportDetail?.report?.findings || reportDetail?.findings || [];

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Reports</h1>
                    <p className="text-zinc-500 text-sm mt-1">All uploaded lab reports and health documents.</p>
                </div>
                <button onClick={fetchReports}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors self-start">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Upload */}
            <UploadZone onUpload={handleUpload} />

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search reports by patient, lab, or type..."
                    className="w-full bg-[#0A0A0A] border border-zinc-800/50 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white">
                        <X size={14} />
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Report List */}
                <div className="lg:col-span-3 space-y-3">
                    {loading ? (
                        <div className="bg-[#0A0A0A] border border-zinc-800/50 rounded-2xl p-12 text-center">
                            <RefreshCw size={20} className="text-zinc-700 mx-auto mb-3 animate-spin" />
                            <p className="text-xs text-zinc-600">Loading reports...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="bg-[#0A0A0A] border border-zinc-800/50 rounded-2xl p-12 text-center">
                            <FileText size={28} className="text-zinc-800 mx-auto mb-3" />
                            <p className="text-sm text-zinc-500">{searchQuery ? 'No matching reports' : 'No reports yet'}</p>
                            <p className="text-[11px] text-zinc-700 mt-1">{searchQuery ? 'Try a different search' : 'Upload a report above to get started'}</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filtered.map((report, i) => (
                                <motion.div
                                    key={report.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    onClick={() => loadReportDetail(report)}
                                    className={`bg-[#0A0A0A] border rounded-2xl p-5 cursor-pointer transition-all group ${
                                        selectedReport?.id === report.id
                                            ? 'border-blue-500/40 bg-blue-500/5'
                                            : 'border-zinc-800/50 hover:border-zinc-700/50 hover:bg-zinc-800/20'
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl transition-colors ${
                                            selectedReport?.id === report.id ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800/50 text-zinc-500 group-hover:bg-zinc-800 group-hover:text-zinc-300'
                                        }`}>
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
                                        <div className="text-right shrink-0 flex items-center gap-3">
                                            <div>
                                                <div className="text-xs font-mono text-zinc-400">{report.biomarker_count} markers</div>
                                                <div className="text-[10px] text-zinc-600 mt-0.5">{report.kind || 'report'}</div>
                                            </div>
                                            <ChevronRight size={14} className={`transition-colors ${selectedReport?.id === report.id ? 'text-blue-400' : 'text-zinc-700 group-hover:text-zinc-500'}`} />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Detail Panel */}
                <div className="lg:col-span-2">
                    <div className="bg-[#0A0A0A] border border-zinc-800/50 rounded-2xl p-6 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
                        <AnimatePresence mode="wait">
                            {loadingDetail ? (
                                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="p-8 text-center">
                                    <RefreshCw size={20} className="text-zinc-600 mx-auto mb-3 animate-spin" />
                                    <p className="text-xs text-zinc-500">Loading detail...</p>
                                </motion.div>
                            ) : reportDetail ? (
                                <motion.div key="detail" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                    className="space-y-5">
                                    {/* Report Header */}
                                    <div className="pb-4 border-b border-zinc-800/50">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                                                <FileText size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-bold text-white truncate">{reportDetail.patient_name || 'Unknown'}</div>
                                                <div className="text-[11px] text-zinc-500 mt-0.5">{reportDetail.lab_name} · {reportDetail.report_date}</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-[10px] font-mono px-2 py-1 bg-zinc-800/50 rounded-lg text-zinc-400">{reportDetail.biomarker_count || biomarkers.length} biomarkers</span>
                                            <span className="text-[10px] font-mono px-2 py-1 bg-zinc-800/50 rounded-lg text-zinc-400">{reportDetail.kind || 'report'}</span>
                                        </div>
                                    </div>

                                    {/* Biomarkers */}
                                    {biomarkers.length > 0 && (
                                        <div>
                                            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3">Biomarkers</div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {biomarkers.map((b: any, i: number) => (
                                                    <BiomarkerBadge
                                                        key={i}
                                                        name={b.name || b.biomarker || `Marker ${i + 1}`}
                                                        value={b.value ?? b.current_value}
                                                        unit={b.unit}
                                                        flag={b.flag}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Findings */}
                                    {findings.length > 0 && (
                                        <div>
                                            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3">Findings</div>
                                            <div className="space-y-2">
                                                {findings.map((f: any, i: number) => (
                                                    <div key={i} className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                                                        <div className="flex items-center gap-2">
                                                            <AlertTriangle size={12} className="text-amber-400 shrink-0" />
                                                            <p className="text-xs text-zinc-300">{f.message || f.description || JSON.stringify(f)}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Raw Data */}
                                    {reportDetail.report && typeof reportDetail.report === 'object' && (
                                        <div>
                                            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3">Raw Data</div>
                                            <div className="bg-zinc-900/50 rounded-xl p-3 max-h-[200px] overflow-y-auto">
                                                <pre className="text-[10px] font-mono text-zinc-500 whitespace-pre-wrap">
                                                    {JSON.stringify(reportDetail.report, null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="p-12 text-center">
                                    <FileText size={28} className="text-zinc-800 mx-auto mb-3" />
                                    <p className="text-xs text-zinc-600">Select a report to view details</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
