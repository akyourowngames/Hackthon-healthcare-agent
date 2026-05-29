"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useDashboard } from "@/lib/dashboard-context";

const borderColors = {
  success: "border-l-teal-500",
  error: "border-l-red-500",
  info: "border-l-slate-400",
};

export function ToastContainer() {
  const { toast, dismissToast } = useDashboard();

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      <AnimatePresence>
        {toast ? (
          <motion.div
            key={toast.message}
            initial={{ opacity: 0, y: 8, x: 8 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className={`pointer-events-auto max-w-sm rounded-lg border border-white/[0.08] border-l-4 bg-[#16161e] px-4 py-3 text-sm text-slate-200 shadow-xl ${borderColors[toast.variant]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <p>{toast.message}</p>
              <button
                type="button"
                onClick={dismissToast}
                className="shrink-0 text-slate-500 hover:text-white"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
