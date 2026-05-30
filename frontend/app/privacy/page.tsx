import Link from "next/link";
import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/LegalPageLayout";

export const metadata: Metadata = {
  title: {
    absolute: "Privacy Policy | Vaidy Health",
  },
  description:
    "How Vaidy protects your health data. We never sell to insurers or pharma. DPDP Act 2023 compliant. End-to-end encrypted.",
  alternates: {
    canonical: "https://vaidy.vercel.app/privacy",
  },
  openGraph: {
    title: "Privacy Policy | Vaidy Health",
    description:
      "How Vaidy protects your health data. We never sell to insurers or pharma. DPDP Act 2023 compliant. End-to-end encrypted.",
    url: "https://vaidy.vercel.app/privacy",
  },
};

const sections = [
  {
    title: "What we collect",
    body: [
      "Vaidy only works with the PDF blood test report you upload and the chat messages you send while using the app.",
      "You do not need an account to use this prototype, and we do not ask for your name, email address, or other profile details just to analyze a report.",
    ],
  },
  {
    title: "How we use it",
    body: [
      "Your report is read by our AI pipeline, including ONNX and NVIDIA NIM inference, so Vaidy can detect biomarkers and explain the results in plain language.",
      "Your uploads and messages are not used for advertising, retargeting, or training our own models.",
    ],
  },
  {
    title: "No data storage",
    body: [
      "Vaidy is designed as a session-only hackathon prototype. Uploaded reports and chat context are used during the active browser session.",
      "After you close the tab, we do not write your health report or chat history to a database for later use.",
    ],
  },
  {
    title: "We never sell health data",
    body: [
      "We do not sell your health data to insurers, pharmaceutical companies, data brokers, advertisers, or anyone else. Ever.",
    ],
  },
  {
    title: "Third-party services",
    body: [
      "Vaidy may send report content to the NVIDIA NIM API for inference and may run on hosting providers such as Railway or Render.",
      "We do not use Google Analytics, ad pixels, or tracking scripts on this prototype.",
    ],
  },
  {
    title: "Your rights",
    body: [
      "Because we do not store your reports or chat history after the session ends, there is normally nothing for us to delete later.",
      "If you have a privacy question, contact us at risuhfoundry@gmail.com and we will answer as clearly as we can.",
    ],
  },
  {
    title: "Changes",
    body: [
      "If Vaidy changes how it handles data, we will update this page openly instead of hiding the change in legal language.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPageLayout>
      <Link
        href="/"
        className="inline-flex text-sm font-semibold text-accent transition hover:text-accent-secondary"
      >
        &larr; Back to Vaidy
      </Link>

      <section className="mt-8 rounded-xl border border-status-warning/30 bg-status-warning/10 p-4">
        <p className="text-sm font-semibold text-status-warning">Hackathon prototype</p>
        <p className="mt-2 text-sm leading-6 text-secondary">
          Vaidy is an early demo built for a hackathon. It can help explain blood
          report values, but it is not a doctor, diagnosis, or replacement for
          medical advice.
        </p>
      </section>

      <header className="mt-10">
        <p className="vaidy-pill">Privacy</p>
        <h1 className="vaidy-title">Privacy Policy</h1>
        <p className="mt-3 text-sm font-medium text-muted">
          Last updated: May 2025
        </p>
        <p className="mt-6 text-base leading-7 text-secondary">
          Vaidy analyzes blood test PDF reports with AI and explains results in a
          chat UI. This page explains what happens to your data in direct,
          practical language.
        </p>
      </header>

      <div className="mt-10 space-y-9">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-xl font-bold tracking-normal text-primary">
              {section.title}
            </h2>
            <div className="mt-3 space-y-3">
              {section.body.map((paragraph) => (
                <p
                  key={paragraph}
                  className="text-base leading-7 text-secondary"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-12 rounded-xl border border-border bg-surface p-5">
        <h2 className="text-lg font-bold tracking-normal text-primary">
          Project details
        </h2>
        <dl className="mt-4 space-y-3 text-sm leading-6 text-secondary">
          <div>
            <dt className="font-semibold text-primary">Team</dt>
            <dd>
              Rishab Gautam, Krish Verma, Shaurya Rai, Dasswastika Grover,
              Manvi Balyan
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-primary">Contact</dt>
            <dd>
              <a
                href="mailto:risuhfoundry@gmail.com"
                className="text-accent transition hover:text-accent-secondary"
              >
                risuhfoundry@gmail.com
              </a>
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-primary">GitHub</dt>
            <dd>
              <a
                href="https://github.com/akyourowngames/Hackthon-healthcare-agent"
                className="break-words text-accent transition hover:text-accent-secondary"
                rel="noreferrer"
                target="_blank"
              >
                github.com/akyourowngames/Hackthon-healthcare-agent
              </a>
            </dd>
          </div>
        </dl>
      </section>
    </LegalPageLayout>
  );
}
