export const SITE_URL = "https://vaidy.vercel.app";

export const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Vaidy",
  applicationCategory: "HealthApplication",
  operatingSystem: "Web",
  description:
    "AI health copilot that reads blood reports, detects biomarker trends, and explains results in plain language for Indian users.",
  url: SITE_URL,
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", reviewCount: "120" },
  inLanguage: ["en-IN", "hi-IN"],
  areaServed: "IN",
};

export const faqPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Can Vaidy read Apollo Diagnostics reports?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Vaidy supports Apollo, Thyrocare, Lal Path Labs, Dr. Lal PathLabs, and 50+ Indian lab formats in PDF and image.",
      },
    },
    {
      "@type": "Question",
      name: "Is my health data safe with Vaidy?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. All reports are encrypted in transit and at rest. We never sell data to insurers, pharma companies, or ad networks.",
      },
    },
    {
      "@type": "Question",
      name: "Does Vaidy work in Hindi?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Vaidy explains your health reports in both Hindi and English. You can switch languages anytime in the chat.",
      },
    },
    {
      "@type": "Question",
      name: "Is Vaidy free to use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Vaidy is free to try with no doctor required. Upload your first report and get instant AI explanations.",
      },
    },
  ],
};
