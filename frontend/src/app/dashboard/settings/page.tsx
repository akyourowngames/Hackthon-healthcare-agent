'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Settings, Globe, Zap, Shield,
    Check, AlertTriangle, Bell, Lock
} from 'lucide-react';

const SETTINGS_KEY = 'vaidy_settings';

interface VaidySettings {
    language: string;
    autoProcess: boolean;
    notifications: boolean;
    defaultUserId: string;
}

const DEFAULT_SETTINGS: VaidySettings = {
    language: 'auto',
    autoProcess: true,
    notifications: true,
    defaultUserId: '',
};

function loadSettings(): VaidySettings {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {}
    return DEFAULT_SETTINGS;
}

function saveSettings(settings: VaidySettings): void {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
}

function SettingsSection({ icon: Icon, title, description, children }: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    title: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <section className="group bg-[#0A0A0A] border border-zinc-900/50 hover:border-zinc-800 rounded-2xl p-6 transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-zinc-900 rounded-xl text-zinc-400 group-hover:text-white group-hover:bg-zinc-800 transition-colors">
                    <Icon size={20} />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wide">{title}</h3>
                    {description && <p className="text-xs text-zinc-500 mt-1">{description}</p>}
                </div>
            </div>
            <div className="space-y-1 pl-1">{children}</div>
        </section>
    );
}

function ToggleRow({ label, description, checked, onChange }: {
    label: string; description?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex justify-between items-center py-4 border-b border-dashed border-zinc-900 last:border-0 hover:bg-zinc-900/30 -mx-2 px-2 rounded-lg transition-colors">
            <div>
                <span className="text-sm font-medium text-zinc-300">{label}</span>
                {description && <p className="text-xs text-zinc-600 mt-0.5">{description}</p>}
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={`relative w-11 h-6 rounded-full transition-all duration-300 ${checked ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'bg-zinc-800'}`}
                role="switch" aria-checked={checked}
            >
                <motion.div
                    animate={{ x: checked ? 22 : 2 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={`absolute top-1 w-4 h-4 rounded-full shadow-sm ${checked ? 'bg-black' : 'bg-zinc-400'}`}
                />
            </button>
        </div>
    );
}

function SelectRow({ label, description, value, options, onChange }: {
    label: string; description?: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
    return (
        <div className="flex justify-between items-center py-4 border-b border-dashed border-zinc-900 last:border-0 hover:bg-zinc-900/30 -mx-2 px-2 rounded-lg transition-colors">
            <div>
                <span className="text-sm font-medium text-zinc-300">{label}</span>
                {description && <p className="text-xs text-zinc-600 mt-0.5">{description}</p>}
            </div>
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="appearance-none bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg pl-3 pr-8 py-1.5 text-xs font-mono text-zinc-300 focus:outline-none cursor-pointer"
                >
                    {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
            </div>
        </div>
    );
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<VaidySettings>(DEFAULT_SETTINGS);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

    useEffect(() => { setSettings(loadSettings()); }, []);

    const updateSetting = <K extends keyof VaidySettings>(key: K, value: VaidySettings[K]) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
        setSaveStatus('idle');
    };

    const handleSave = () => {
        saveSettings(settings);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="max-w-4xl mx-auto pb-20"
        >
            <div className="mb-10">
                <h1 className="text-3xl font-black text-white tracking-tight uppercase mb-2 flex items-center gap-3">
                    <Settings className="text-zinc-500" size={24} />
                    Settings
                </h1>
                <p className="text-zinc-500 font-medium">Manage your Vaidy preferences</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <SettingsSection icon={Globe} title="General" description="Language and display preferences">
                        <SelectRow
                            label="Chat Language"
                            description="Auto-detect or set preferred language"
                            value={settings.language}
                            options={['auto', 'English', 'Hindi', 'Marathi']}
                            onChange={(v) => updateSetting('language', v)}
                        />
                    </SettingsSection>

                    <SettingsSection icon={Zap} title="Processing" description="Report processing preferences">
                        <ToggleRow
                            label="Auto-process Uploads"
                            description="Automatically extract biomarkers on upload"
                            checked={settings.autoProcess}
                            onChange={(v) => updateSetting('autoProcess', v)}
                        />
                    </SettingsSection>
                </div>

                <div className="space-y-6">
                    <SettingsSection icon={Bell} title="Notifications" description="Alert preferences">
                        <ToggleRow
                            label="Health Alerts"
                            description="Get notified about abnormal values"
                            checked={settings.notifications}
                            onChange={(v) => updateSetting('notifications', v)}
                        />
                    </SettingsSection>

                    <SettingsSection icon={Shield} title="System" description="Backend connection info">
                        <div className="flex justify-between items-center py-4 border-b border-dashed border-zinc-900">
                            <div className="flex items-center gap-2">
                                <Lock size={14} className="text-emerald-500" />
                                <span className="text-sm font-medium text-zinc-300">Backend</span>
                            </div>
                            <span className="text-xs font-mono text-zinc-400">localhost:8000</span>
                        </div>
                        <div className="flex justify-between items-center py-4">
                            <span className="text-sm font-medium text-zinc-300">User ID</span>
                            <span className="text-xs font-mono text-zinc-400">{settings.defaultUserId}</span>
                        </div>
                    </SettingsSection>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-8 flex justify-end"
            >
                <button
                    onClick={handleSave}
                    className="px-8 py-3 bg-white hover:bg-zinc-200 text-black rounded-full text-xs font-black uppercase tracking-widest transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center gap-2"
                >
                    {saveStatus === 'saved' ? (
                        <><Check size={16} className="text-emerald-600" /><span>Saved</span></>
                    ) : (
                        <span>Save Changes</span>
                    )}
                </button>
            </motion.div>
        </motion.div>
    );
}
