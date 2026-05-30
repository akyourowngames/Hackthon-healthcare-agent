import { create } from 'zustand';

export interface Report {
    id: number;
    patient_name: string;
    report_date: string;
    lab_name: string;
    biomarker_count: number;
    kind: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export interface HealthScore {
    score: number;
    latest_biomarkers: number;
    abnormal_latest: number;
    finding_count: number;
}

interface VaidyState {
    reports: Report[];
    selectedReport: Report | null;
    healthScore: HealthScore | null;
    anomalies: any[];
    biomarkers: any[];
    notifications: any[];
    chatMessages: ChatMessage[];
    chatSessionId: string;
    isChatStreaming: boolean;
    memoryEntries: any[];
    systemStatus: any;

    setReports: (reports: Report[]) => void;
    setSelectedReport: (report: Report | null) => void;
    setHealthScore: (score: HealthScore | null) => void;
    setAnomalies: (anomalies: any[]) => void;
    setBiomarkers: (biomarkers: any[]) => void;
    setNotifications: (notifications: any[]) => void;
    addChatMessage: (msg: ChatMessage) => void;
    clearChat: () => void;
    setChatStreaming: (v: boolean) => void;
    setMemoryEntries: (entries: any[]) => void;
    setSystemStatus: (status: any) => void;
}

export const useVaidyStore = create<VaidyState>((set) => ({
    reports: [],
    selectedReport: null,
    healthScore: null,
    anomalies: [],
    biomarkers: [],
    notifications: [],
    chatMessages: [],
    chatSessionId: typeof crypto !== 'undefined' ? crypto.randomUUID() : 'default-session',
    isChatStreaming: false,
    memoryEntries: [],
    systemStatus: null,

    setReports: (reports) => set({ reports }),
    setSelectedReport: (report) => set({ selectedReport: report }),
    setHealthScore: (score) => set({ healthScore: score }),
    setAnomalies: (anomalies) => set({ anomalies }),
    setBiomarkers: (biomarkers) => set({ biomarkers }),
    setNotifications: (notifications) => set({ notifications }),
    addChatMessage: (msg) => set((state) => ({
        chatMessages: [...state.chatMessages, msg],
    })),
    clearChat: () => set({ chatMessages: [], chatSessionId: crypto.randomUUID() }),
    setChatStreaming: (v) => set({ isChatStreaming: v }),
    setMemoryEntries: (entries) => set({ memoryEntries: entries }),
    setSystemStatus: (status) => set({ systemStatus: status }),
}));
