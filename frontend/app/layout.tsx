import type { Metadata } from "next";
import { DM_Sans, Sora } from "next/font/google";
import "./globals.css";
import { WaitlistProvider } from "@/components/WaitlistProvider";
import { AuthProvider } from "@/lib/auth-context";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-sans",
});

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-sora",
});

const SITE_URL = "https://vaidy.vercel.app";
const SITE_TITLE = "Vaidy — Your AI Health Copilot, Built for India";
const SITE_DESCRIPTION =
  "Upload blood reports from Apollo, Thyrocare, or Lal Path Labs. Detect trends, understand biomarkers, and get plain-language explanations in Hindi or English.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: "Vaidy",
  keywords: [
    "Vaidy",
    "AI health copilot",
    "Apollo",
    "Thyrocare",
    "Lal Path Labs",
    "blood report analysis",
    "biomarker trends",
    "health AI India",
  ],
  authors: [{ name: "Vaidy" }],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Vaidy",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_IN",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Vaidy — Your AI Health Copilot, Built for India",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${dmSans.variable} ${sora.variable}`}>
      <body className="min-h-full flex flex-col font-sans">
        <div className="page-light" aria-hidden="true" />
        <div className="vignette" aria-hidden="true" />

        <WaitlistProvider>
          <AuthProvider>
            <div className="relative z-10 flex flex-1 flex-col">{children}</div>
          </AuthProvider>
        </WaitlistProvider>
      </body>
    </html>
  );
}
