import type { Metadata } from "next";
import { DM_Sans, Sora } from "next/font/google";
import "./globals.css";
import { WaitlistProvider } from "@/components/WaitlistProvider";
import { AuthProvider } from "@/lib/auth-context";
import { JsonLd } from "@/components/JsonLd";
import { faqPageJsonLd, SITE_URL, softwareApplicationJsonLd } from "@/lib/seo";

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

export const metadata: Metadata = {
  title: {
    default: "Vaidy — AI Health Copilot for India | Understand Your Blood Reports",
    template: "%s | Vaidy",
  },
  description:
    "Upload blood reports from Apollo, Thyrocare, Lal Path Labs. Get instant AI explanations in Hindi & English. Detect trends, understand biomarkers, track your health history — free.",
  keywords: [
    "blood report analyzer India",
    "AI health assistant India",
    "thyrocare report explanation",
    "Apollo diagnostics AI",
    "CBC report meaning in Hindi",
    "HbA1c explained",
    "health report scanner",
    "medical report AI India",
    "blood test result explainer",
    "Lal Path Labs report analysis",
  ],
  authors: [{ name: "Vaidy Health" }],
  creator: "Vaidy",
  applicationName: "Vaidy",
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "Vaidy — Your AI Health Copilot, Built for India",
    description:
      "Upload any blood report. Get plain-language explanations in Hindi or English. Track trends across Apollo, Thyrocare, Lal Path Labs & 50+ labs.",
    url: SITE_URL,
    siteName: "Vaidy",
    locale: "en_IN",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Vaidy AI Health Copilot" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vaidy — AI Health Copilot for India",
    description: "Finally understand your blood reports. AI explanations in Hindi & English.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  verification: {
    google: "WKrXa9MES5vv-PlYtlomsZ2PnftcRvMQhrDJh0qohT4",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN" className={`h-full antialiased ${dmSans.variable} ${sora.variable}`}>
      <body className="min-h-full flex flex-col font-sans">
        <JsonLd data={softwareApplicationJsonLd} />
        <JsonLd data={faqPageJsonLd} />
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
