import type { Metadata } from "next";
import { DashboardLayoutClient } from "@/components/dashboard/DashboardLayoutClient";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    absolute: "Your Health Dashboard | Vaidy",
  },
  description:
    "Track your biomarker trends over time. View hemoglobin, HbA1c, TSH, LDL history and get AI-powered health insights from all your reports.",
  alternates: {
    canonical: `${SITE_URL}/dashboard`,
  },
  openGraph: {
    title: "Your Health Dashboard | Vaidy",
    description:
      "Track your biomarker trends over time. View hemoglobin, HbA1c, TSH, LDL history and get AI-powered health insights from all your reports.",
    url: `${SITE_URL}/dashboard`,
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
