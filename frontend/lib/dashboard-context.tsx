"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_USER,
  INITIAL_REPORTS,
  type MockReport,
  type UserProfile,
} from "@/lib/mock-dashboard";

const STORAGE_KEY = "vaidy_dashboard_mock";

type StoredState = {
  profile: UserProfile;
  reports: MockReport[];
  signedIn: boolean;
};

type DashboardContextValue = {
  profile: UserProfile;
  reports: MockReport[];
  signedIn: boolean;
  updateProfile: (patch: Partial<UserProfile>) => void;
  addReport: (report: MockReport) => void;
  removeReport: (id: string) => void;
  signIn: (email?: string) => void;
  signOut: () => void;
  toast: ToastState | null;
  showToast: (message: string, variant?: ToastVariant) => void;
  dismissToast: () => void;
};

export type ToastVariant = "success" | "error" | "info";
type ToastState = { message: string; variant: ToastVariant };

const defaultStored: StoredState = {
  profile: DEFAULT_USER,
  reports: INITIAL_REPORTS,
  signedIn: false,
};

function loadStored(): StoredState {
  if (typeof window === "undefined") return defaultStored;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStored;
    const parsed = JSON.parse(raw) as StoredState;
    return {
      profile: { ...DEFAULT_USER, ...parsed.profile },
      reports: parsed.reports?.length ? parsed.reports : INITIAL_REPORTS,
      signedIn: Boolean(parsed.signedIn),
    };
  } catch {
    return defaultStored;
  }
}

function saveStored(state: StoredState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_USER);
  const [reports, setReports] = useState<MockReport[]>(INITIAL_REPORTS);
  const [signedIn, setSignedIn] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const stored = loadStored();
    setProfile(stored.profile);
    setReports(stored.reports);
    setSignedIn(stored.signedIn);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveStored({ profile, reports, signedIn });
  }, [profile, reports, signedIn, hydrated]);

  const showToast = useCallback((message: string, variant: ToastVariant = "info") => {
    setToast({ message, variant });
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    setProfile((current) => ({ ...current, ...patch }));
  }, []);

  const addReport = useCallback((report: MockReport) => {
    setReports((current) => [report, ...current]);
  }, []);

  const removeReport = useCallback((id: string) => {
    setReports((current) => current.filter((r) => r.id !== id));
  }, []);

  const signIn = useCallback((email?: string) => {
    setSignedIn(true);
    if (email) {
      setProfile((current) => ({ ...current, email }));
    }
    window.localStorage.setItem("vaidy_user_id", "local-user");
  }, []);

  const signOut = useCallback(() => {
    setSignedIn(false);
    window.localStorage.removeItem("vaidy_user_id");
    window.localStorage.removeItem("vaidy_supabase_access_token");
  }, []);

  const value = useMemo(
    () => ({
      profile,
      reports,
      signedIn,
      updateProfile,
      addReport,
      removeReport,
      signIn,
      signOut,
      toast,
      showToast,
      dismissToast,
    }),
    [
      profile,
      reports,
      signedIn,
      updateProfile,
      addReport,
      removeReport,
      signIn,
      signOut,
      toast,
      showToast,
      dismissToast,
    ]
  );

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] text-slate-400">
        Loading…
      </div>
    );
  }

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
