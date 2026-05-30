import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PageTransitionProvider, SmoothScrollProvider } from "@/components/effects";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vaidy — AI Health Report Analyzer",
  description: "Upload lab reports, extract biomarkers, track health trends, and chat with an AI about your health data.",
  keywords: ["health", "AI", "lab reports", "biomarkers", "healthcare", "medical", "reports", "analysis"],
  authors: [{ name: "Vaidy Team" }],
  creator: "Vaidy Team",
  publisher: "Vaidy",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: "Vaidy — AI Health Report Analyzer",
    description: "Upload lab reports, extract biomarkers, track health trends, and chat with an AI about your health data.",
    type: "website",
    locale: "en_US",
    siteName: "Vaidy",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vaidy — AI Health Report Analyzer",
    description: "Upload lab reports, extract biomarkers, track health trends, and chat with an AI about your health data.",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

// JSON-LD Structured Data for SEO
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Vaidy",
  "description": "Upload lab reports, extract biomarkers, track health trends, and chat with an AI about your health data.",
  "applicationCategory": "HealthApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${inter.variable} ${geistMono.variable} font-sans antialiased bg-kernel-bg text-white`}
      >
        {/* Skip to main content link for accessibility */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <AuthProvider>
          <SmoothScrollProvider>
            <PageTransitionProvider>
              <main id="main-content">
                {children}
              </main>
            </PageTransitionProvider>
          </SmoothScrollProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

