"use client";

import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { Check, Camera } from "lucide-react";
import { Header } from "@/components/dashboard/Header";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useDashboard } from "@/lib/dashboard-context";
import { CONDITION_OPTIONS } from "@/lib/mock-dashboard";

export default function ProfilePage() {
  const { profile, updateProfile, showToast, reports } = useDashboard();
  const [deleteReportsConfirm, setDeleteReportsConfirm] = useState(false);
  const [deleteAccountStep, setDeleteAccountStep] = useState(0);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [conditions, setConditions] = useState(profile.conditions);

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const uniqueLabs = new Set(reports.map((r) => r.lab)).size;

  function savePersonal(e: FormEvent) {
    e.preventDefault();
    updateProfile({ conditions });
    showToast("Profile saved", "success");
  }

  function saveHealth(e: FormEvent) {
    e.preventDefault();
    updateProfile({ conditions });
    showToast("Health context saved", "success");
  }

  function toggleCondition(c: string) {
    setConditions((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));
  }

  return (
    <>
      <Header title="Profile & Settings" breadcrumb={["Home", "Dashboard", "Profile"]} />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-3xl space-y-8 px-4 py-6 sm:px-6"
      >
        <section className="dashboard-card overflow-hidden rounded-xl border border-white/[0.08] border-t-4 border-t-teal-500 bg-white/[0.04] p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="group relative">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-teal-500/15 text-2xl font-bold text-teal-400 ring-2 ring-teal-500/30">
                {initials}
              </span>
              <button
                type="button"
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 transition group-hover:opacity-100"
                aria-label="Change photo"
              >
                <Camera className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="font-heading text-2xl font-bold text-white">{profile.name}</h2>
              <p className="mt-1 flex items-center justify-center gap-2 text-sm text-slate-400 sm:justify-start">
                {profile.email}
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <Check className="h-3.5 w-3.5" /> verified
                </span>
              </p>
              <p className="mt-1 flex items-center justify-center gap-2 text-sm text-slate-500 sm:justify-start">
                +91 {profile.phone}
                <span className="text-emerald-400/80">✓</span>
              </p>
              <p className="mt-2 text-xs text-slate-600">Member since {profile.memberSince}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                {[`${reports.length} Reports`, `${uniqueLabs} Labs`, "47 Biomarkers"].map((pill) => (
                  <span key={pill} className="rounded-full border border-white/[0.08] bg-[#111] px-3 py-1 text-xs text-slate-400">
                    {pill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <ProfileSection title="Personal Information" onSubmit={savePersonal}>
          <Input
            label="Full Name"
            defaultValue={profile.name}
            onChange={(e) => updateProfile({ name: e.target.value })}
          />
          <div>
            <label className="mb-1.5 block text-sm text-slate-300">Phone Number</label>
            <div className="flex min-h-[44px] rounded-lg border border-white/[0.08] bg-[#0d0d12]">
              <span className="flex items-center border-r border-white/[0.08] px-3 text-sm text-slate-400">+91</span>
              <input
                defaultValue={profile.phone}
                onChange={(e) => updateProfile({ phone: e.target.value })}
                className="flex-1 bg-transparent px-3 text-sm text-white outline-none"
              />
            </div>
          </div>
          <Input label="Date of Birth" type="date" defaultValue={profile.dob} onChange={(e) => updateProfile({ dob: e.target.value })} />
          <div>
            <p className="mb-2 text-sm text-slate-400">Gender</p>
            <div className="flex flex-wrap gap-2">
              {["Male", "Female", "Other", "Prefer not to say"].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => updateProfile({ gender: g })}
                  className={`min-h-[44px] rounded-full border px-4 text-sm ${
                    profile.gender === g ? "border-teal-500 bg-teal-500/15 text-teal-300" : "border-white/[0.08] text-slate-500"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <Input label="City" placeholder="Mumbai" defaultValue={profile.city} onChange={(e) => updateProfile({ city: e.target.value })} />
          <div>
            <p className="mb-2 text-sm text-slate-400">Language Preference</p>
            <div className="flex gap-2">
              {(["en", "hi"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => updateProfile({ language: lang })}
                  className={`min-h-[44px] flex-1 rounded-full border text-sm font-medium ${
                    profile.language === lang ? "border-teal-500 bg-teal-500/15 text-teal-300" : "border-white/[0.08] text-slate-500"
                  }`}
                >
                  {lang === "en" ? "English" : "हिंदी"}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit">Save Changes</Button>
        </ProfileSection>

        <ProfileSection title="Health Context" subtitle="Helps AI give better answers" onSubmit={saveHealth}>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-400">Blood Group</span>
            <select
              value={profile.bloodGroup}
              onChange={(e) => updateProfile({ bloodGroup: e.target.value })}
              className="w-full min-h-[44px] rounded-lg border border-white/[0.08] bg-[#0d0d12] px-3 text-slate-300"
            >
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
          <div>
            <p className="mb-2 text-sm text-slate-400">Known Conditions</p>
            <div className="flex flex-wrap gap-2">
              {CONDITION_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCondition(c)}
                  className={`rounded-full border px-3 py-2 text-sm ${
                    conditions.includes(c) ? "border-teal-500 bg-teal-500/15 text-teal-300" : "border-white/[0.08] text-slate-500"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-400">Current Medications</span>
            <textarea
              defaultValue={profile.medications}
              onChange={(e) => updateProfile({ medications: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-white/[0.08] bg-[#0d0d12] px-3 py-2 text-slate-200 outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </label>
          <Button type="submit">Save Health Context</Button>
        </ProfileSection>

        <ProfileSection title="Notifications">
          {(
            [
              ["reportReady", "Email me when report analysis is ready"],
              ["weeklySummary", "Weekly health summary emails"],
              ["followUpReminders", "Reminders for follow-up tests"],
              ["healthTips", "Tips and health insights"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex min-h-[44px] cursor-pointer items-center justify-between gap-4">
              <span className="text-sm text-slate-300">{label}</span>
              <input
                type="checkbox"
                checked={profile.notifications[key]}
                onChange={(e) =>
                  updateProfile({
                    notifications: { ...profile.notifications, [key]: e.target.checked },
                  })
                }
                className="h-5 w-9 appearance-none rounded-full bg-slate-700 checked:bg-teal-500 accent-teal-500"
              />
            </label>
          ))}
        </ProfileSection>

        <ProfileSection title="Privacy & Data">
          <Button variant="outline" type="button" onClick={() => showToast("Export started — check your email", "info")}>
            Download all my data
          </Button>
          {deleteReportsConfirm ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              This will remove all reports.{" "}
              <button type="button" className="font-bold underline" onClick={() => showToast("Reports deleted (demo)", "info")}>
                Confirm delete all reports
              </button>
            </div>
          ) : (
            <Button variant="danger" type="button" onClick={() => setDeleteReportsConfirm(true)}>
              Delete all reports
            </Button>
          )}
          {deleteAccountStep === 0 ? (
            <Button variant="danger" type="button" onClick={() => setDeleteAccountStep(1)}>
              Delete account
            </Button>
          ) : (
            <div className="space-y-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-sm text-red-200">Type DELETE to confirm account deletion</p>
              <input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full rounded-lg border border-red-500/40 bg-[#0d0d12] px-3 py-2 text-sm text-white"
                placeholder="DELETE"
              />
              <Button
                variant="danger"
                type="button"
                disabled={deleteConfirmText !== "DELETE"}
                onClick={() => showToast("Account deletion requested (demo)", "error")}
              >
                Permanently delete account
              </Button>
            </div>
          )}
        </ProfileSection>

        <ProfileSection title="Account Security">
          <Input label="Current Password" type="password" placeholder="••••••••" />
          <Input label="New Password" type="password" placeholder="••••••••" />
          <Input label="Confirm New Password" type="password" placeholder="••••••••" />
          <Button type="button" onClick={() => showToast("Password updated (demo)", "success")}>
            Update Password
          </Button>
          <div className="rounded-lg border border-white/[0.08] bg-[#111] p-4">
            <p className="text-sm font-medium text-white">Connected Accounts</p>
            <p className="mt-2 flex items-center justify-between text-sm text-slate-400">
              Google
              <span className="rounded-full bg-teal-500/15 px-2 py-0.5 text-xs text-teal-400">Connected</span>
            </p>
            <button type="button" className="mt-2 text-xs text-slate-500 hover:text-red-400">
              Disconnect
            </button>
          </div>
          <p className="text-xs text-slate-600">Last login: Today from Mumbai, India</p>
        </ProfileSection>
      </motion.div>
    </>
  );
}

function ProfileSection({
  title,
  subtitle,
  children,
  onSubmit,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onSubmit?: (e: FormEvent) => void;
}) {
  const Tag = onSubmit ? "form" : "section";
  return (
    <Tag onSubmit={onSubmit} className="dashboard-card space-y-4 rounded-xl border border-white/[0.08] bg-white/[0.04] p-6">
      <div>
        <h3 className="font-heading text-lg font-bold text-white">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </Tag>
  );
}
