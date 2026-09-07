import { useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

type ContextPanelProps = {
  eyebrow: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function ContextPanel({ eyebrow, title, onClose, children }: ContextPanelProps) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70 backdrop-blur-sm sm:items-stretch sm:justify-end" onClick={onClose}>
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
        onClick={event => event.stopPropagation()}
        className="h-[min(84dvh,760px)] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-[#080808] px-5 pb-24 pt-5 text-white shadow-2xl hide-scrollbar sm:h-full sm:max-w-sm sm:rounded-none sm:border-y-0 sm:border-r-0 sm:px-6 sm:pb-10 sm:pt-6"
      >
        <div className="sticky top-0 z-10 -mx-2 mb-8 flex items-start justify-between bg-[#080808]/95 px-2 pb-3 backdrop-blur">
          <div>
            <p className="text-[9px] uppercase tracking-[.22em] text-white/35">{eyebrow}</p>
            <h2 className="mt-1 text-sm font-medium text-white/85">{title}</h2>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="-mr-2 rounded-full p-2 text-white/45 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </motion.aside>
    </div>
  );
}