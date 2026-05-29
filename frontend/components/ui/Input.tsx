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
          <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium text-slate-300">
            {label}
          </label>
        ) : null}
        <div
          className={`flex min-h-[44px] items-center gap-2 rounded-lg border bg-[#0d0d12] transition focus-within:ring-2 focus-within:ring-teal-500/40 ${
            error ? "border-red-500/50" : "border-white/[0.08] focus-within:border-teal-500/50"
          }`}
        >
          <input
            ref={ref}
            id={fieldId}
            className={`min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 ${className}`}
            aria-invalid={Boolean(error)}
            {...props}
          />
          {rightSlot}
        </div>
        {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
        {hint && !error ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      </div>
    );
  }
);

Input.displayName = "Input";
