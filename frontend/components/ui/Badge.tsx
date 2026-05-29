type BadgeVariant = "teal" | "amber" | "red" | "slate" | "blue" | "purple";

const styles: Record<BadgeVariant, string> = {
  teal: "border-teal-500/30 bg-teal-500/10 text-teal-300",
  amber: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  red: "border-red-500/30 bg-red-500/10 text-red-300",
  slate: "border-white/10 bg-white/[0.04] text-slate-400",
  blue: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  purple: "border-purple-500/30 bg-purple-500/10 text-purple-300",
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
