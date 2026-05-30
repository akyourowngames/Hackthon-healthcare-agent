import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/LegalPageLayout";

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
    <LegalPageLayout>
      <Link
        href="/"
        className="inline-flex text-sm font-semibold text-accent transition hover:text-accent-secondary"
      >
        &larr; Back to Vaidy
      </Link>
      <p className="vaidy-pill mt-8">Terms</p>
      <h1 className="vaidy-title">Terms of service placeholder</h1>
      <p className="vaidy-body">
        This page will contain Vaidy&apos;s terms of service.
      </p>
    </LegalPageLayout>
  );
}
