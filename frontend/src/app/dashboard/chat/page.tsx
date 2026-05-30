'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, MessageSquare, Trash2, Globe, ArrowUpRight } from 'lucide-react';
import { vaidyApi } from '@/lib/vaidyApi';
import { useVaidyStore } from '@/stores/vaidyStore';

function ChatBubble({ msg }: { msg: any }) {
    const isUser = msg.role === 'user';
    const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
        >
            <div className={`max-w-[75%] ${isUser ? 'order-1' : 'order-1'}`}>
                <div
                    className={`rounded-2xl px-4 py-3 ${
                        isUser
                            ? 'bg-white text-black'
                            : 'bg-[#0A0A0A] border border-zinc-800/50 text-zinc-200'
                    }`}
                >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
                <div className={`flex items-center gap-2 mt-1.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && (
                        <div className="w-4 h-4 border border-zinc-700 flex items-center justify-center rotate-45">
                            <div className="w-1 h-1 bg-zinc-500" />
                        </div>
                    )}
                    <span className="text-[9px] font-mono text-zinc-600">{time}</span>
                </div>
            </div>
        </motion.div>
    );
}

export default function ChatPage() {
    const { chatMessages, addChatMessage, chatSessionId, isChatStreaming, setChatStreaming, clearChat } = useVaidyStore();
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const handleSend = async () => {
        if (!input.trim() || isChatStreaming) return;

        const userMsg = {
            id: crypto.randomUUID(),
            role: 'user' as const,
            content: input.trim(),
            timestamp: new Date(),
        };
        addChatMessage(userMsg);
        setInput('');
        setChatStreaming(true);

        try {
            const history = chatMessages.map((m) => ({ role: m.role, content: m.content }));
            const response = await vaidyApi.chat(userMsg.content, history, chatSessionId);
            addChatMessage({
                id: crypto.randomUUID(),
                role: 'assistant',
                content: response.text,
                timestamp: new Date(),
            });
        } catch (err: any) {
            addChatMessage({
                id: crypto.randomUUID(),
                role: 'assistant',
                content: `Error: ${err.message || 'Failed to get response'}`,
                timestamp: new Date(),
            });
        } finally {
            setChatStreaming(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-[calc(100vh-12rem)]"
        >
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Health Chat</h1>
                    <p className="text-zinc-500 text-sm mt-1">Ask questions about your health data in natural language.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0A0A0A] rounded-xl border border-zinc-800/50">
                        <Globe size={12} className="text-zinc-500" />
                        <span className="text-[10px] font-mono text-zinc-500">Auto-detect</span>
                    </div>
                    <button
                        onClick={clearChat}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors"
                    >
                        <Trash2 size={12} />
                        Clear
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-[#0A0A0A] border border-zinc-800/50 rounded-2xl overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {chatMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-16 h-16 border border-zinc-800 flex items-center justify-center rotate-45 mb-6">
                                <div className="w-4 h-4 bg-zinc-800" />
                            </div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tight">Ask Vaidy anything</h3>
                            <p className="text-sm text-zinc-500 mt-2 max-w-md">
                                Ask about your latest report, cholesterol trends, or any health concern.
                                <br />Supports English, Hindi, and Marathi.
                            </p>
                            <div className="flex flex-wrap gap-2 mt-8 justify-center">
                                {[
                                    'What were my cholesterol levels?',
                                    'Are my blood sugar values normal?',
                                    'Summarize my latest report',
                                ].map((q) => (
                                    <button
                                        key={q}
                                        onClick={() => setInput(q)}
                                        className="flex items-center gap-2 px-4 py-2 text-xs bg-[#0A0A0A] border border-zinc-800/50 rounded-xl text-zinc-400 hover:text-white hover:border-zinc-700/50 transition-all group"
                                    >
                                        {q}
                                        <ArrowUpRight size={10} className="text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <AnimatePresence>
                            {chatMessages.map((msg) => (
                                <ChatBubble key={msg.id} msg={msg} />
                            ))}
                        </AnimatePresence>
                    )}
                    {isChatStreaming && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                            <div className="bg-[#0A0A0A] border border-zinc-800/50 rounded-2xl px-4 py-3 flex items-center gap-3">
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

                <div className="p-4 border-t border-zinc-800/50 bg-[#0A0A0A]">
                    <div className="flex items-end gap-3">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about your health data..."
                            rows={1}
                            className="flex-1 bg-zinc-900/50 border border-zinc-800/50 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 resize-none transition-colors"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isChatStreaming}
                            className="p-3 bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 text-black rounded-xl transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
