import { supabase } from '@/lib/supabase';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

async function getUserId(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) throw new Error('Not authenticated');
    return session.user.id;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: { ...authHeaders, ...(options.headers as Record<string, string> || {}) },
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
        throw new Error(error.detail || `Request failed: ${response.status}`);
    }
    return response.json();
}

export interface HealthStatus {
    ok: boolean;
    report_count: number;
    chat_model: string;
    memory: { sessions: number; messages: number; entries: number };
}

export interface Report {
    id: number;
    patient_name: string;
    report_date: string;
    lab_name: string;
    biomarker_count: number;
    kind: string;
}

export interface DashboardData {
    user_id: string;
    health_score: {
        score: number;
        latest_biomarkers: number;
        abnormal_latest: number;
        finding_count: number;
    };
    anomalies: any[];
    biomarkers: any[];
    history: any[];
    reports: any[];
}

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
}

export interface ChatResponse {
    text: string;
    used_report_context: boolean;
    model: string;
    session_id: string;
    language: string;
}

export interface MemoryEntry {
    id: number;
    text: string;
    source: string;
    importance: number;
    created_at: string;
}

export const vaidyApi = {
    async getHealth(): Promise<HealthStatus> {
        return apiRequest<HealthStatus>('/api/health');
    },

    async getStatus(): Promise<any> {
        return apiRequest<any>('/api/status');
    },

    async getReports(): Promise<{ reports: Report[] }> {
        const userId = await getUserId();
        return apiRequest<{ reports: Report[] }>(`/api/reports?user_id=${encodeURIComponent(userId)}`);
    },

    async getReport(reportId: number): Promise<any> {
        const userId = await getUserId();
        return apiRequest<any>(`/api/reports/${reportId}?user_id=${encodeURIComponent(userId)}`);
    },

    async getDashboard(): Promise<DashboardData> {
        const userId = await getUserId();
        return apiRequest<DashboardData>(`/api/dashboard/${userId}`);
    },

    async chat(message: string, history: ChatMessage[] = [], sessionId?: string): Promise<ChatResponse> {
        const userId = await getUserId();
        return apiRequest<ChatResponse>('/api/chat', {
            method: 'POST',
            body: JSON.stringify({
                message,
                history,
                session_id: sessionId || crypto.randomUUID(),
                user_id: userId,
            }),
        });
    },

    async chatStream(message: string, history: ChatMessage[] = [], sessionId?: string): Promise<ReadableStream> {
        const headers = await getAuthHeaders();
        const userId = await getUserId();
        const response = await fetch(`${API_BASE}/api/chat/stream`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                message,
                history,
                session_id: sessionId || crypto.randomUUID(),
                user_id: userId,
            }),
        });
        if (!response.ok) throw new Error('Stream request failed');
        return response.body!;
    },

    async getMemory(limit = 50): Promise<{ entries: MemoryEntry[] }> {
        const userId = await getUserId();
        return apiRequest<{ entries: MemoryEntry[] }>(`/api/memory?limit=${limit}&user_id=${encodeURIComponent(userId)}`);
    },

    async memoryRecall(query: string): Promise<{ hits: any[] }> {
        const userId = await getUserId();
        return apiRequest<{ hits: any[] }>(`/api/memory/recall?q=${encodeURIComponent(query)}&user_id=${encodeURIComponent(userId)}`);
    },

    async remember(text: string, source = 'manual'): Promise<any> {
        const userId = await getUserId();
        return apiRequest<any>('/api/memory/remember', {
            method: 'POST',
            body: JSON.stringify({ text, source, user_id: userId }),
        });
    },

    async search(query: string): Promise<{ hits: any[] }> {
        const userId = await getUserId();
        return apiRequest<{ hits: any[] }>(`/api/search?q=${encodeURIComponent(query)}&user_id=${encodeURIComponent(userId)}`);
    },

    async getNotifications(): Promise<{ notifications: any[] }> {
        const userId = await getUserId();
        return apiRequest<{ notifications: any[] }>(`/api/notifications/${userId}`);
    },

    async upload(file: File): Promise<any> {
        const headers = await getAuthHeaders();
        const userId = await getUserId();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('user_id', userId);
        const response = await fetch(`${API_BASE}/api/upload`, {
            method: 'POST',
            headers: { Authorization: headers['Authorization'] || '' },
            body: formData,
        });
        if (!response.ok) throw new Error('Upload failed');
        return response.json();
    },

    async getBiomarker(name: string): Promise<any> {
        const userId = await getUserId();
        return apiRequest<any>(`/api/biomarker/${userId}/${encodeURIComponent(name)}`);
    },
};
