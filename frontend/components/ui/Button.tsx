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
    "border-none bg-accent-primary text-primary hover:bg-accent-secondary active:scale-[0.98]",
  secondary:
    "border border-border bg-transparent text-primary hover:bg-elevated",
  ghost: "text-accent hover:bg-elevated hover:text-accent",
  danger: "border border-status-critical bg-transparent text-status-critical hover:bg-status-critical/10",
  outline:
    "border border-border text-accent hover:border-accent-primary hover:bg-elevated",
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
