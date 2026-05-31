'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Trash2, Globe, ArrowUpRight, Paperclip, X, FileText, Sparkles } from 'lucide-react';
import { vaidyApi } from '@/lib/vaidyApi';
import { useVaidyStore } from '@/stores/vaidyStore';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function renderMarkdown(text: string): React.ReactNode[] {
    const lines = text.split('\n');
    const nodes: React.ReactNode[] = [];
    lines.forEach((line, i) => {
        if (i > 0) nodes.push(<br key={`br-${i}`} />);
        const parts: React.ReactNode[] = [];
        let remaining = line;
        let keyIdx = 0;
        while (remaining.length > 0) {
            const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
            const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
            const match = boldMatch || italicMatch;
            if (!match) { parts.push(remaining); break; }
            const idx = remaining.indexOf(match[0]);
            if (idx > 0) parts.push(remaining.slice(0, idx));
            if (boldMatch) {
                parts.push(<strong key={`b-${i}-${keyIdx++}`} className="font-bold text-zinc-100">{match[1]}</strong>);
            } else {
                parts.push(<em key={`i-${i}-${keyIdx++}`} className="italic">{match[1]}</em>);
            }
            remaining = remaining.slice(idx + match[0].length);
        }
        if (line.match(/^\d+\.\s/)) {
            nodes.push(<div key={i} className="flex gap-2 ml-1 py-0.5">{parts}</div>);
        } else if (line.startsWith('- ') || line.startsWith('• ')) {
            nodes.push(<div key={i} className="flex gap-2 ml-1 py-0.5"><span className="text-zinc-500 shrink-0">•</span><span>{parts.slice(1)}</span></div>);
        } else {
            nodes.push(<span key={i}>{parts}</span>);
        }
    });
    return nodes;
}

function ChatBubble({ msg }: { msg: any }) {
    const isUser = msg.role === 'user';
    const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
        >
            <div className={`max-w-[75%] min-w-0 ${isUser ? 'order-1' : 'order-1'}`}>
                {msg.attachedReport && (
                    <div className={`mb-1.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] ${
                        isUser ? 'bg-zinc-200 text-zinc-600' : 'bg-zinc-800/30 text-zinc-500 border border-zinc-800/50'
                    }`}>
                        <FileText size={10} />
                        <span className="font-medium">{msg.attachedReport.patient_name || 'Report'}</span>
                        {msg.attachedReport.report_date && <span>({msg.attachedReport.report_date})</span>}
                    </div>
                )}
                <div
                    className={`rounded-2xl px-4 py-2.5 ${
                        isUser
                            ? 'bg-white text-black'
                            : 'bg-zinc-900/80 border border-zinc-800/50 text-zinc-200'
                    }`}
                >
                    <div className="text-[13px] whitespace-pre-wrap leading-relaxed">
                        {isUser ? msg.content : renderMarkdown(msg.content)}
                    </div>
                </div>
                <div className={`flex items-center gap-1.5 mt-1 px-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && (
                        <Sparkles size={10} className="text-zinc-700" />
                    )}
                    <span className="text-[9px] font-mono text-zinc-700">{time}</span>
                </div>
            </div>
        </motion.div>
    );
}

export default function ChatPage() {
    const { chatMessages, addChatMessage, chatSessionId, isChatStreaming, setChatStreaming, clearChat } = useVaidyStore();
    const [input, setInput] = useState('');
    const [attachedReport, setAttachedReport] = useState<any>(null);
    const [showReportPicker, setShowReportPicker] = useState(false);
    const [reports, setReports] = useState<any[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const fetchReports = useCallback(async () => {
        try {
            const res = await vaidyApi.getReports();
            setReports(res?.reports || []);
        } catch {}
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const reportId = params.get('report');
        if (reportId) {
            fetchReports().then(() => {
                vaidyApi.getReport(Number(reportId)).then((detail) => {
                    setAttachedReport(detail);
                }).catch(() => {});
            });
        }
    }, [fetchReports]);

    const handleSend = async () => {
        if (!input.trim() || isChatStreaming) return;

        const userMsg: any = {
            id: crypto.randomUUID(),
            role: 'user' as const,
            content: input.trim(),
            timestamp: new Date(),
        };
        if (attachedReport) {
            userMsg.attachedReport = {
                patient_name: attachedReport.patient_name,
                report_date: attachedReport.report_date,
            };
        }
        addChatMessage(userMsg);
        const currentInput = input.trim();
        setInput('');
        setChatStreaming(true);

        const assistantMsgId = crypto.randomUUID();
        let fullText = '';

        try {
            const history = chatMessages.map((m) => ({ role: m.role, content: m.content }));
            let message = currentInput;
            if (attachedReport) {
                message = `[Report #${attachedReport.id} - ${attachedReport.patient_name || 'Unknown'}]\n${currentInput}`;
            }

            const headers = await vaidyApi.getAuthHeaders();
            const response = await fetch(`${API_BASE}/api/chat/stream`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    history,
                    session_id: chatSessionId,
                    user_id: '',
                }),
                signal: abortRef.current?.signal,
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let buffer = '';
            let currentEvent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (line.startsWith('event: ')) {
                        currentEvent = line.slice(7).trim();
                    } else if (line.startsWith('data: ')) {
                        try {
                            const payload = JSON.parse(line.slice(6));
                            if (currentEvent === 'chunk' && payload.text) {
                                fullText += payload.text;
                                const existing = useVaidyStore.getState().chatMessages.find((m: any) => m.id === assistantMsgId);
                                if (existing) {
                                    useVaidyStore.setState((state: any) => ({
                                        chatMessages: state.chatMessages.map((m: any) =>
                                            m.id === assistantMsgId ? { ...m, content: fullText } : m
                                        ),
                                    }));
                                } else {
                                    addChatMessage({
                                        id: assistantMsgId,
                                        role: 'assistant',
                                        content: fullText,
                                        timestamp: new Date(),
                                    });
                                }
                            } else if (currentEvent === 'done') {
                                if (!fullText && payload.text) fullText = payload.text;
                                const existing = useVaidyStore.getState().chatMessages.find((m: any) => m.id === assistantMsgId);
                                if (existing) {
                                    useVaidyStore.setState((state: any) => ({
                                        chatMessages: state.chatMessages.map((m: any) =>
                                            m.id === assistantMsgId ? { ...m, content: fullText || payload.text || m.content } : m
                                        ),
                                    }));
                                } else if (fullText || payload.text) {
                                    addChatMessage({
                                        id: assistantMsgId,
                                        role: 'assistant',
                                        content: fullText || payload.text || '',
                                        timestamp: new Date(),
                                    });
                                }
                            } else if (currentEvent === 'error') {
                                throw new Error(payload.message || 'Stream error');
                            }
                        } catch (e: any) {
                            if (e.message === 'Stream error') throw e;
                        }
                    }
                }
            }

            if (!fullText) {
                addChatMessage({
                    id: assistantMsgId,
                    role: 'assistant',
                    content: 'No response received.',
                    timestamp: new Date(),
                });
            }
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            const existing = useVaidyStore.getState().chatMessages.find((m: any) => m.id === assistantMsgId);
            if (existing && fullText) return;
            addChatMessage({
                id: assistantMsgId,
                role: 'assistant',
                content: `Error: ${err.message || 'Failed to get response'}`,
                timestamp: new Date(),
            });
        } finally {
            setChatStreaming(false);
            setAttachedReport(null);
            abortRef.current = null;
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Header Bar */}
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-zinc-900/80">
                <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                    <div>
                        <h1 className="text-lg font-black text-white tracking-tight uppercase">Health Chat</h1>
                        <p className="text-[11px] text-zinc-600">Ask about your health data in natural language</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
                        <Globe size={11} className="text-zinc-500" />
                        <span className="text-[10px] font-mono text-zinc-500">Auto-detect</span>
                    </div>
                    <button
                        onClick={clearChat}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded-lg transition-colors"
                    >
                        <Trash2 size={11} />
                        Clear
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-6 chat-scrollbar" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
                {chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-14 h-14 border border-zinc-800 flex items-center justify-center rotate-45 mb-5">
                            <Sparkles size={18} className="text-zinc-700 -rotate-45" />
                        </div>
                        <h3 className="text-base font-black text-white uppercase tracking-tight">Ask Vaidy anything</h3>
                        <p className="text-xs text-zinc-600 mt-2 max-w-sm leading-relaxed">
                            Ask about your latest report, cholesterol trends, or any health concern.
                            Attach a report for detailed analysis.
                        </p>
                        <div className="flex flex-wrap gap-2 mt-6 justify-center max-w-lg">
                            {[
                                'Analyze my latest report in detail',
                                'What were my cholesterol levels?',
                                'Are my blood sugar values normal?',
                                'Summarize all my reports',
                                'Compare my reports over time',
                            ].map((q) => (
                                <button
                                    key={q}
                                    onClick={() => setInput(q)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] bg-zinc-900/50 border border-zinc-800/50 rounded-lg text-zinc-500 hover:text-white hover:border-zinc-700/50 transition-all"
                                >
                                    {q}
                                    <ArrowUpRight size={9} className="text-zinc-700" />
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="max-w-3xl mx-auto space-y-4">
                        <AnimatePresence>
                            {chatMessages.map((msg) => (
                                <ChatBubble key={msg.id} msg={msg} />
                            ))}
                        </AnimatePresence>
                        {isChatStreaming && (chatMessages.length === 0 || chatMessages[chatMessages.length - 1]?.role === 'user') && (
                            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                                <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-2xl px-4 py-2.5 flex items-center gap-2.5">
                                    <div className="flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                    <span className="text-[10px] font-mono text-zinc-600">Thinking...</span>
                                </div>
                            </motion.div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Report Picker */}
            <AnimatePresence>
                {showReportPicker && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="mx-4 mb-1 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden max-h-44 overflow-y-auto shadow-xl"
                    >
                        {reports.length === 0 ? (
                            <div className="p-4 text-xs text-zinc-500 text-center">No reports found</div>
                        ) : (
                            reports.map((r) => (
                                <button
                                    key={r.id}
                                    onClick={() => { setAttachedReport(r); setShowReportPicker(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/50 transition-colors text-left border-b border-zinc-800/30 last:border-0"
                                >
                                    <FileText size={13} className="text-zinc-500 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs font-medium text-zinc-300 truncate">{r.patient_name || 'Unnamed'}</div>
                                        <div className="text-[10px] text-zinc-600">{r.report_date || ''} {r.lab_name ? `· ${r.lab_name}` : ''}</div>
                                    </div>
                                    <div className="text-[10px] text-zinc-600 shrink-0">
                                        {r.biomarker_count || 0} markers
                                    </div>
                                </button>
                            ))
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Input Area */}
            <div className="shrink-0 border-t border-zinc-900/80 bg-[#0a0a0a] px-6 py-4">
                {attachedReport && (
                    <div className="mb-2 flex items-center gap-2 px-3 py-1.5 bg-zinc-800/30 border border-zinc-700/30 rounded-lg w-fit">
                        <FileText size={11} className="text-blue-400" />
                        <span className="text-[11px] text-zinc-300 font-medium">{attachedReport.patient_name || 'Report'}</span>
                        {attachedReport.report_date && <span className="text-[10px] text-zinc-600">{attachedReport.report_date}</span>}
                        <button onClick={() => setAttachedReport(null)} className="ml-1 text-zinc-500 hover:text-white transition-colors">
                            <X size={10} />
                        </button>
                    </div>
                )}
                <div className="flex items-end gap-3 max-w-3xl mx-auto">
                    <button
                        onClick={() => { setShowReportPicker(!showReportPicker); if (!showReportPicker) fetchReports(); }}
                        className={`shrink-0 p-2.5 rounded-xl transition-all ${
                            showReportPicker
                                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25'
                                : 'bg-zinc-900/50 text-zinc-500 hover:text-zinc-300 border border-zinc-800/50'
                        }`}
                        title="Attach a report"
                    >
                        <Paperclip size={15} />
                    </button>
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={attachedReport ? `Ask about ${attachedReport.patient_name || 'this report'}...` : 'Ask about your health data...'}
                        rows={1}
                        className="flex-1 bg-zinc-900/50 border border-zinc-800/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 resize-none transition-colors"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isChatStreaming}
                        className="shrink-0 p-2.5 bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 text-black rounded-xl transition-all"
                    >
                        <Send size={15} />
                    </button>
                </div>
            </div>
            <style>{`
                .chat-scrollbar::-webkit-scrollbar { width: 6px; }
                .chat-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .chat-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
                .chat-scrollbar::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
                .chat-scrollbar { scrollbar-width: thin; scrollbar-color: #27272a transparent; }
            `}</style>
        </div>
    );
}
