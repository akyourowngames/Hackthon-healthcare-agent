import Link from "next/link";
import { Activity } from "lucide-react";

type VaidyLogoProps = {
  href?: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
};

const sizes = {
  sm: { text: "text-base", icon: "h-3.5 w-3.5", gap: "gap-1.5" },
  md: { text: "text-lg", icon: "h-4 w-4", gap: "gap-2" },
  lg: { text: "text-2xl", icon: "h-5 w-5", gap: "gap-2.5" },
};

export function VaidyLogo({ href = "/", size = "md", showIcon = true }: VaidyLogoProps) {
  const s = sizes[size];
  const inner = (
    <span className={`inline-flex items-center ${s.gap} font-bold tracking-tight`}>
      {showIcon ? (
        <Activity className={`${s.icon} text-teal-400`} strokeWidth={2.5} aria-hidden />
      ) : null}
      <span className={s.text}>
        <span className="text-teal-400">vaidy</span>
      </span>
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="text-slate-100 no-underline transition hover:opacity-90">
        {inner}
      </Link>
    );
  }

  return <span className="text-slate-100">{inner}</span>;
}
