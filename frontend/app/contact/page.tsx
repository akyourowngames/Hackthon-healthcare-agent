import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/LegalPageLayout";

export const metadata: Metadata = {
  title: {
    absolute: "Contact Vaidy | Get Help & Support",
  },
  description:
    "Reach the Vaidy team for support, bug reports, privacy requests, or partnership inquiries.",
  alternates: {
    canonical: "https://vaidy.vercel.app/contact",
  },
  openGraph: {
    title: "Contact Vaidy | Get Help & Support",
    description:
      "Reach the Vaidy team for support, bug reports, privacy requests, or partnership inquiries.",
    url: "https://vaidy.vercel.app/contact",
  },
};

export default function ContactPage() {
  return (
    <LegalPageLayout>
      <Link
        href="/"
        className="inline-flex text-sm font-semibold text-accent transition hover:text-accent-secondary"
      >
        &larr; Back to Vaidy
      </Link>
      <p className="vaidy-pill mt-8">Contact</p>
      <h1 className="vaidy-title">Contact placeholder</h1>
      <p className="vaidy-body">
        This page will contain Vaidy&apos;s contact information.
      </p>
    </LegalPageLayout>
  );
}
