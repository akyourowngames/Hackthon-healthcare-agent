import type { Metadata } from "next";

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
    <main className="section-shell">
      <p className="vaidy-pill">Contact</p>
      <h1 className="vaidy-title">Contact placeholder</h1>
      <p className="vaidy-body">
        This page will contain Vaidy&apos;s contact information.
      </p>
    </main>
  );
}
