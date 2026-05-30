"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
  rightSlot?: ReactNode;
  wrapperClassName?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, rightSlot, className = "", wrapperClassName = "", id, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;

    return (
      <div className={wrapperClassName}>
        {label ? (
          <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium text-primary">
            {label}
          </label>
        ) : null}
        <div
          className={`flex min-h-[44px] items-center gap-2 rounded-lg border bg-surface transition focus-within:border-accent-primary focus-within:shadow-accent-glow ${
            error ? "border-status-critical" : "border-border"
          }`}
        >
          <input
            ref={ref}
            id={fieldId}
            className={`min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-primary outline-none placeholder:text-muted ${className}`}
            aria-invalid={Boolean(error)}
            {...props}
          />
          {rightSlot}
        </div>
        {error ? <p className="mt-1 text-xs text-status-critical">{error}</p> : null}
        {hint && !error ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      </div>
    );
  }
);

Input.displayName = "Input";
