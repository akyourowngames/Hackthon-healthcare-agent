'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, name: string) => Promise<void>;
    logout: () => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    loginWithGithub: () => Promise<void>;
    getToken: () => Promise<string | null>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = async (email: string, password: string) => {
        setError(null);
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) {
            setError(authError.message);
            throw new Error(authError.message);
        }
    };

    const signup = async (email: string, password: string, name: string) => {
        setError(null);
        const { error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: name } },
        });
        if (authError) {
            setError(authError.message);
            throw new Error(authError.message);
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
    };

    const loginWithGoogle = async () => {
        setError(null);
        const { error: authError } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/dashboard` },
        });
        if (authError) {
            setError(authError.message);
            throw new Error(authError.message);
        }
    };

    const loginWithGithub = async () => {
        setError(null);
        const { error: authError } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: { redirectTo: `${window.location.origin}/dashboard` },
        });
        if (authError) {
            setError(authError.message);
            throw new Error(authError.message);
        }
    };

    const getToken = async (): Promise<string | null> => {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token ?? null;
    };

    const clearError = () => setError(null);

    return (
        <AuthContext.Provider value={{
            user, session, loading, error,
            login, signup, logout,
            loginWithGoogle, loginWithGithub,
            getToken, clearError,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}
