export type ReportStatus = "Analyzed" | "Processing" | "Action Required";
export type LabKey = "apollo" | "thyrocare" | "lalpath" | "drlal" | "srl" | "other";
export type BiomarkerFlag = "normal" | "low" | "high";

export type MockReport = {
  id: string;
  type: string;
  category: string;
  lab: string;
  labKey: LabKey;
  date: string;
  status: ReportStatus;
  finding: string;
  biomarkers: { name: string; value: string; flag: BiomarkerFlag }[];
};

export type InsightTone = "good" | "watch" | "concern";

export type MockInsight = {
  id: string;
  tone: InsightTone;
  headline: string;
  body: string;
};

export type UserProfile = {
  name: string;
  email: string;
  phone: string;
  city: string;
  dob: string;
  gender: string;
  language: "en" | "hi";
  bloodGroup: string;
  conditions: string[];
  medications: string;
  memberSince: string;
  healthScore: number;
  notifications: {
    reportReady: boolean;
    weeklySummary: boolean;
    followUpReminders: boolean;
    healthTips: boolean;
  };
};

export const LAB_COLORS: Record<LabKey, string> = {
  apollo: "#3b82f6",
  thyrocare: "#8b5cf6",
  lalpath: "#ef4444",
  drlal: "#f97316",
  srl: "#06b6d4",
  other: "#64748b",
};

export const DEFAULT_USER: UserProfile = {
  name: "Ananya Rao",
  email: "ananya@example.com",
  phone: "9876543210",
  city: "Mumbai",
  dob: "1992-03-15",
  gender: "Female",
  language: "en",
  bloodGroup: "B+",
  conditions: ["Anemia"],
  medications: "Iron supplements — once daily",
  memberSince: "May 2025",
  healthScore: 78,
  notifications: {
    reportReady: true,
    weeklySummary: true,
    followUpReminders: true,
    healthTips: false,
  },
};

export const INITIAL_REPORTS: MockReport[] = [
  {
    id: "r1",
    type: "Complete Blood Count",
    category: "CBC",
    lab: "Apollo Diagnostics",
    labKey: "apollo",
    date: "2026-05-15",
    status: "Analyzed",
    finding: "Hemoglobin: 10.2 g/dL ↓ Low",
    biomarkers: [
      { name: "Hemoglobin", value: "10.2 g/dL", flag: "low" },
      { name: "WBC", value: "7.1 K/µL", flag: "normal" },
    ],
  },
  {
    id: "r2",
    type: "Lipid Panel",
    category: "Lipid",
    lab: "Thyrocare",
    labKey: "thyrocare",
    date: "2026-04-28",
    status: "Processing",
    finding: "LDL: 142 mg/dL — borderline",
    biomarkers: [
      { name: "LDL", value: "142 mg/dL", flag: "high" },
      { name: "HDL", value: "52 mg/dL", flag: "normal" },
    ],
  },
  {
    id: "r3",
    type: "Thyroid Profile",
    category: "Thyroid",
    lab: "Lal Path Labs",
    labKey: "lalpath",
    date: "2026-03-10",
    status: "Action Required",
    finding: "TSH: 5.8 mIU/L ↑ Elevated",
    biomarkers: [
      { name: "TSH", value: "5.8 mIU/L", flag: "high" },
      { name: "T3", value: "1.1 ng/mL", flag: "normal" },
    ],
  },
  {
    id: "r4",
    type: "Vitamin D & B12",
    category: "Vitamins",
    lab: "Apollo Diagnostics",
    labKey: "apollo",
    date: "2026-02-20",
    status: "Analyzed",
    finding: "Vitamin D: 18 ng/mL ↓ Low",
    biomarkers: [
      { name: "Vitamin D", value: "18 ng/mL", flag: "low" },
      { name: "B12", value: "410 pg/mL", flag: "normal" },
    ],
  },
  {
    id: "r5",
    type: "Liver Function Test",
    category: "Liver",
    lab: "SRL Diagnostics",
    labKey: "srl",
    date: "2026-01-12",
    status: "Analyzed",
    finding: "All markers within range",
    biomarkers: [
      { name: "ALT", value: "22 U/L", flag: "normal" },
      { name: "AST", value: "24 U/L", flag: "normal" },
    ],
  },
  {
    id: "r6",
    type: "HbA1c Test",
    category: "Diabetes",
    lab: "Dr. Lal PathLabs",
    labKey: "drlal",
    date: "2025-12-05",
    status: "Analyzed",
    finding: "HbA1c: 5.4% — normal",
    biomarkers: [{ name: "HbA1c", value: "5.4%", flag: "normal" }],
  },
];

export const INSIGHTS: MockInsight[] = [
  {
    id: "i1",
    tone: "good",
    headline: "Hemoglobin improving",
    body: "Up 18% since Jan. Iron supplementation is working.",
  },
  {
    id: "i2",
    tone: "watch",
    headline: "Vitamin D still low",
    body: "Consider increasing sun exposure or supplements.",
  },
  {
    id: "i3",
    tone: "concern",
    headline: "LDL borderline high",
    body: "Diet changes recommended. Consult your doctor.",
  },
];

export const HEMOGLOBIN_CHART = [
  { month: "Dec", value: 9.1 },
  { month: "Jan", value: 9.4 },
  { month: "Feb", value: 9.8 },
  { month: "Mar", value: 10.0 },
  { month: "Apr", value: 10.1 },
  { month: "May", value: 10.2 },
];

export const LAB_OPTIONS = [
  "Apollo Diagnostics",
  "Thyrocare",
  "Lal Path Labs",
  "Dr. Lal PathLabs",
  "SRL Diagnostics",
  "Other",
] as const;

export const REPORT_TYPE_OPTIONS = [
  "Complete Blood Count",
  "Lipid Panel",
  "Thyroid",
  "Liver Function",
  "Kidney Function",
  "Diabetes Panel",
  "Vitamin Panel",
  "Other",
] as const;

export const CONDITION_OPTIONS = [
  "Diabetes",
  "Thyroid",
  "Hypertension",
  "Anemia",
  "PCOD",
  "Heart Disease",
  "Asthma",
  "None",
] as const;

export function formatReportDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function passwordStrengthScore(password: string): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  let hasLower = false;
  let hasUpper = false;
  let hasDigit = false;
  let hasSymbol = false;
  for (let i = 0; i < password.length; i += 1) {
    const c = password.charCodeAt(i);
    if (c >= 97 && c <= 122) hasLower = true;
    else if (c >= 65 && c <= 90) hasUpper = true;
    else if (c >= 48 && c <= 57) hasDigit = true;
    else hasSymbol = true;
  }
  if (hasLower && hasUpper) score += 1;
  if (hasDigit && (hasSymbol || password.length >= 10)) score += 1;
  return Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
}

export function strengthLabel(score: number): string {
  if (score <= 1) return "Weak";
  if (score === 2) return "Fair";
  if (score === 3) return "Good";
  return "Strong";
}

export function isDigitChar(ch: string): boolean {
  if (ch.length !== 1) return false;
  const code = ch.charCodeAt(0);
  return code >= 48 && code <= 57;
}
