import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Terms of Service | Vaidy Health",
  },
  description:
    "Terms for using Vaidy AI Health Copilot. Read our usage policy, medical disclaimer, and data rights.",
  alternates: {
    canonical: "https://vaidy.vercel.app/terms",
  },
  openGraph: {
    title: "Terms of Service | Vaidy Health",
    description:
      "Terms for using Vaidy AI Health Copilot. Read our usage policy, medical disclaimer, and data rights.",
    url: "https://vaidy.vercel.app/terms",
  },
};

export default function TermsPage() {
  return (
    <main className="section-shell">
      <p className="vaidy-pill">Terms</p>
      <h1 className="vaidy-title">Terms of service placeholder</h1>
      <p className="vaidy-body">
        This page will contain Vaidy&apos;s terms of service.
      </p>
    </main>
  );
}
