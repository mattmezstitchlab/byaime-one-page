import { useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type CenteredBlockProps = {
  eyebrow: string;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  leading?: ReactNode;
  size?: "md" | "lg" | "xl";
  testId?: string;
};

const widths = {
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-5xl",
};

export function CenteredBlock({ eyebrow, title, description, onClose, children, leading, size = "md", testId }: CenteredBlockProps) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/72 px-3 py-5 backdrop-blur-sm sm:px-6 sm:py-8"
      onClick={onClose}
    >
      <motion.section
        data-testid={testId}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, scale: .97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: .97, y: 10 }}
        transition={{ duration: .22, ease: [0.16, 1, 0.3, 1] }}
        onClick={event => event.stopPropagation()}
        className={cn("flex max-h-[calc(100dvh-2.5rem)] w-full flex-col overflow-hidden rounded-[2rem] bg-[#0a0a0a]/97 text-white shadow-2xl sm:max-h-[calc(100dvh-4rem)]", widths[size])}
      >
        <header className="flex shrink-0 items-start gap-4 px-7 pb-5 pt-7 sm:px-10 sm:pt-9">
          {leading}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[.24em] text-white/35">{eyebrow}</p>
            <h2 className="mt-3 font-display text-3xl font-light leading-tight sm:text-4xl">{title}</h2>
            {description && <p className="mt-3 max-w-2xl text-sm font-light leading-relaxed text-white/42">{description}</p>}
          </div>
          <button onClick={onClose} aria-label="Fermer" className="-mr-2 rounded-full p-2 text-white/35 transition hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-8 sm:px-10 sm:pb-10 hide-scrollbar">{children}</div>
      </motion.section>
    </motion.div>
  );
}