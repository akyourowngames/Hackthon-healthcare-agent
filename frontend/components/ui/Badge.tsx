type BadgeVariant = "teal" | "amber" | "red" | "slate" | "blue" | "purple";

const styles: Record<BadgeVariant, string> = {
  teal: "border-accent-primary/30 bg-accent-glow text-accent",
  amber: "border-status-warning/30 bg-status-warning/10 text-status-warning",
  red: "border-status-critical/30 bg-status-critical/10 text-status-critical",
  slate: "border-border bg-elevated text-secondary",
  blue: "border-status-improving/30 bg-status-improving/10 text-status-improving",
  purple: "border-border bg-elevated text-secondary",
};

export function Badge({
  children,
  variant = "slate",
  className = "",
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export function statusBadgeVariant(
  status: string
): BadgeVariant {
  if (status === "Analyzed" || status === "Normal") return "teal";
  if (status === "Processing") return "amber";
  if (status === "Action Required" || status === "Critical") return "red";
  return "slate";
}
