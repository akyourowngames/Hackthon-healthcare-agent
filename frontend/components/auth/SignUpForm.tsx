"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { VaidyLogo } from "@/components/ui/VaidyLogo";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { passwordStrengthScore, strengthLabel } from "@/lib/mock-dashboard";

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const strengthColors = ["bg-red-500", "bg-amber-500", "bg-yellow-500", "bg-teal-400", "bg-emerald-500"];

type SignUpFormProps = {
  onSwitchToSignIn: () => void;
  onSuccess: (email: string) => void;
};

export function SignUpForm({ onSwitchToSignIn, onSuccess }: SignUpFormProps) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirm: "",
    day: "",
    month: "",
    year: "",
    gender: "",
    language: "en" as "en" | "hi",
    terms: false,
  });

  const score = passwordStrengthScore(form.password);
  const passwordsMatch = form.confirm.length > 0 && form.password === form.confirm;

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.terms) return;
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      onSuccess(form.email.trim() || "ananya@example.com");
    }, 800);
  }

  return (
    <div className="auth-card max-h-[90vh] w-full max-w-md overflow-y-auto border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-xl sm:p-8">
      <VaidyLogo href="/" size="sm" />
      <h1 className="font-heading mt-6 text-2xl font-bold text-white">Create your account</h1>
      <p className="mt-1 text-sm text-slate-400">Start understanding your health today</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Input label="Full Name" placeholder="Ananya Rao" value={form.name} onChange={(e) => update("name", e.target.value)} required />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">Phone Number</label>
          <div className="flex min-h-[44px] overflow-hidden rounded-lg border border-white/[0.08] bg-[#0d0d12] focus-within:ring-2 focus-within:ring-teal-500/40">
            <span className="flex items-center gap-1 border-r border-white/[0.08] px-3 text-sm text-slate-300">
              🇮🇳 +91
            </span>
            <input
              type="tel"
              placeholder="98765 43210"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className="min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-100 outline-none"
              inputMode="tel"
            />
          </div>
        </div>

        <Input label="Email" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => update("email", e.target.value)} required />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">Password</label>
          <div className="flex min-h-[44px] items-center rounded-lg border border-white/[0.08] bg-[#0d0d12] focus-within:ring-2 focus-within:ring-teal-500/40">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
            />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="px-3 text-slate-500">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="mt-2 flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  score > i ? strengthColors[Math.min(score, 4) - 1] : "bg-white/10"
                }`}
              />
            ))}
          </div>
          {form.password ? (
            <p className="mt-1 text-xs text-slate-500">{strengthLabel(score)}</p>
          ) : null}
        </div>

        <Input
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          value={form.confirm}
          onChange={(e) => update("confirm", e.target.value)}
          error={form.confirm && !passwordsMatch ? "Passwords do not match" : undefined}
        />

        <div>
          <p className="mb-2 text-sm text-slate-400">Date of Birth <span className="text-slate-600">(optional)</span></p>
          <p className="mb-2 text-xs text-slate-500">For personalized health context</p>
          <div className="grid grid-cols-3 gap-2">
            <select value={form.day} onChange={(e) => update("day", e.target.value)} className="auth-select min-h-[44px] rounded-lg border border-white/[0.08] bg-[#0d0d12] px-2 text-sm text-slate-300">
              <option value="">Day</option>
              {Array.from({ length: 31 }, (_, i) => String(i + 1)).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select value={form.month} onChange={(e) => update("month", e.target.value)} className="auth-select min-h-[44px] rounded-lg border border-white/[0.08] bg-[#0d0d12] px-2 text-sm text-slate-300">
              <option value="">Month</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={String(i + 1)}>{m}</option>
              ))}
            </select>
            <select value={form.year} onChange={(e) => update("year", e.target.value)} className="auth-select min-h-[44px] rounded-lg border border-white/[0.08] bg-[#0d0d12] px-2 text-sm text-slate-300">
              <option value="">Year</option>
              {Array.from({ length: 80 }, (_, i) => 2026 - i).map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm text-slate-400">Gender <span className="text-slate-600">(optional)</span></p>
          <div className="flex flex-wrap gap-2">
            {["Male", "Female", "Prefer not to say"].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => update("gender", g)}
                className={`min-h-[44px] rounded-full border px-4 text-sm font-medium transition ${
                  form.gender === g
                    ? "border-teal-500 bg-teal-500/15 text-teal-300"
                    : "border-white/[0.08] text-slate-400 hover:text-white"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm text-slate-400">Language Preference</p>
          <div className="flex gap-2">
            {[
              { id: "en" as const, label: "English" },
              { id: "hi" as const, label: "हिंदी" },
            ].map((lang) => (
              <button
                key={lang.id}
                type="button"
                onClick={() => update("language", lang.id)}
                className={`min-h-[44px] flex-1 rounded-full border text-sm font-medium ${
                  form.language === lang.id
                    ? "border-teal-500 bg-teal-500/15 text-teal-300"
                    : "border-white/[0.08] text-slate-400"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex gap-3 text-sm text-slate-400">
          <input
            type="checkbox"
            checked={form.terms}
            onChange={(e) => update("terms", e.target.checked)}
            className="mt-1 h-4 w-4 rounded accent-teal-500"
          />
          <span>
            I agree to the{" "}
            <Link href="/privacy" className="text-teal-400 hover:underline">Privacy Policy</Link>
            {" "}and{" "}
            <Link href="/terms" className="text-teal-400 hover:underline">Terms of Service</Link>
          </span>
        </label>

        <Button type="submit" fullWidth loading={loading} disabled={!form.terms}>
          Create Account
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
        <span className="h-px flex-1 bg-white/[0.08]" />
        or continue with
        <span className="h-px flex-1 bg-white/[0.08]" />
      </div>

      <button
        type="button"
        className="flex w-full min-h-[44px] items-center justify-center gap-3 rounded-lg border border-white/[0.08] bg-[#111] text-sm font-semibold text-white"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <button type="button" onClick={onSwitchToSignIn} className="font-semibold text-teal-400">
          Sign in
        </button>
      </p>

      <p className="mt-4 text-center text-xs text-slate-600">
        🔒 End-to-end encrypted · 🇮🇳 India&apos;s #1 health AI · ✓ Never sold to insurers
      </p>
    </div>
  );
}
