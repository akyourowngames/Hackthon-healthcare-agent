"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: string;
  sheetOnMobile?: boolean;
};

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-[560px]",
  sheetOnMobile = false,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <motion.button
            type="button"
            aria-label="Close overlay"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "modal-title" : undefined}
            initial={{ opacity: 0, y: sheetOnMobile ? 40 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: sheetOnMobile ? 40 : 12 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`relative z-10 w-full ${maxWidth} rounded-t-2xl border border-white/[0.08] bg-[#111118] p-5 shadow-2xl sm:rounded-2xl sm:p-6 ${sheetOnMobile ? "max-h-[92vh] overflow-y-auto" : ""}`}
          >
            {title ? (
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 id="modal-title" className="font-heading text-xl font-bold text-white">
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : null}
            {children}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
