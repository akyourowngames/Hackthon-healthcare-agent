import Link from "next/link";

const footerLinks = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Contact", href: "/contact" },
];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-primary px-6 py-8 text-muted">
      <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-center gap-4 text-center sm:justify-between sm:text-left">
        <div className="flex items-center gap-2">
          <span
            className="h-5 w-5 rounded-md bg-accent-primary"
            aria-hidden="true"
          />
          <span className="text-[15px] font-bold tracking-[-0.03em] text-primary">vaidy</span>
        </div>

        <nav className="flex items-center gap-5" aria-label="Footer navigation">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13px] text-secondary transition-colors hover:text-accent"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="text-xs text-muted">
          (c) {new Date().getFullYear()} Vaidy. Built for India.
        </p>
      </div>
    </footer>
  );
}
