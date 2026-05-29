"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
};

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-[0_0_24px_rgba(20,184,166,0.25)] hover:brightness-110 active:scale-[0.98]",
  secondary:
    "border border-white/10 bg-white/[0.04] text-slate-200 hover:border-teal-500/30 hover:bg-white/[0.06]",
  ghost: "text-teal-400 hover:bg-teal-500/10 hover:text-teal-300",
  danger: "border border-red-500/40 text-red-300 hover:bg-red-500/10",
  outline:
    "border border-teal-500/40 text-teal-300 hover:border-teal-400 hover:bg-teal-500/10",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      loading,
      fullWidth,
      leftIcon,
      className = "",
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${fullWidth ? "w-full" : ""} ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : leftIcon}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
