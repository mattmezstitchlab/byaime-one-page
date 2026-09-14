import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { findAimeScreenByLabel, getAimeScreen, pushAimeScreen, type AimeScreenId } from "@/lib/aime-guidance";
import { useI18n } from "@/lib/i18n";
import { EYEBROW, TITLE, LEAD } from "@/lib/site-design";

type CenteredBlockProps = {
  eyebrow: string;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  leading?: ReactNode;
  size?: "md" | "lg" | "xl";
  testId?: string;
  screenId?: AimeScreenId;
  variant?: "default" | "demo";
};

export function CenteredBlock({
  eyebrow,
  title,
  description,
  onClose,
  children,
  leading,
  size = "md",
  testId,
  screenId,
  variant = "demo",
}: CenteredBlockProps) {
  const { t } = useI18n();
  const guideScreenId = (screenId ? getAimeScreen(screenId)?.id : undefined) ?? findAimeScreenByLabel(title)?.id ?? null;
  useEffect(() => {
    if (!guideScreenId) return undefined;
    return pushAimeScreen(guideScreenId);
  }, [guideScreenId]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const isDemo = variant === "demo";

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[var(--agency-ink)]/40 px-3 py-5 backdrop-blur-[12px] sm:px-6 sm:py-8"
      onClick={onClose}
    >
      <motion.section
        data-testid={testId}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, scale: 0.97, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 16 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        onClick={event => event.stopPropagation()}
        data-size={size}
        className={cn(
          "flex w-full flex-col overflow-hidden text-[var(--agency-ink)] shadow-[0_32px_80px_-16px_rgba(23,20,16,0.32),0_0_0_1px_rgba(23,20,16,0.04)_inset]",
          isDemo
            ? "h-[min(860px,calc(100dvh-2rem))] max-w-6xl rounded-[22px] border border-[var(--agency-hairline)] bg-[var(--agency-paper)] sm:h-[min(860px,calc(100dvh-3rem))]"
            : "h-[min(760px,calc(100dvh-2.5rem))] max-w-5xl rounded-[2rem] bg-card text-foreground sm:h-[min(760px,calc(100dvh-4rem))]",
        )}
      >
        {isDemo && (
          <div className="flex h-[46px] shrink-0 items-center gap-2.5 border-b border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-5">
            <span className="flex items-center gap-1.5">
              <span className="h-[11px] w-[11px] rounded-full bg-[#ff5f57]" />
              <span className="h-[11px] w-[11px] rounded-full bg-[#febc2e]" />
              <span className="h-[11px] w-[11px] rounded-full bg-[#28c840]" />
            </span>
            <span className="ml-3 text-[12px] font-medium tracking-[.02em] text-[var(--agency-eyebrow)]">AIME — Le Monde</span>
            <span className="ml-auto hidden items-center gap-2 text-[11px] text-[var(--agency-eyebrow)] sm:flex">
              <span className="h-1 w-1 rounded-full bg-[var(--agency-hairline)]" />
              {eyebrow}
            </span>
          </div>
        )}

        <header
          className={cn(
            "flex shrink-0 items-start gap-4 border-b px-7 pb-6 pt-7 sm:px-10 sm:pt-8",
            isDemo ? "border-[var(--agency-hairline)] bg-[var(--agency-paper)]" : "border-border",
          )}
        >
          {leading}
          <div className="min-w-0 flex-1">
            <p className={cn(isDemo ? EYEBROW : "text-[10px] uppercase tracking-[.24em] text-muted-foreground")}>{eyebrow}</p>
            <h2 className={cn("mt-3 leading-tight", isDemo ? `${TITLE} text-3xl sm:text-4xl` : "font-display text-3xl font-semibold sm:text-4xl")}>{title}</h2>
            {description && (
              <p className={cn("mt-3 max-w-2xl", isDemo ? `${LEAD} text-[15px] leading-relaxed` : "text-sm font-light leading-relaxed text-foreground/65")}>
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label={t("panel.close")}
            className={cn(
              "-mr-2 grid h-9 w-9 place-items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2",
              isDemo
                ? "border border-[var(--agency-hairline)] text-[var(--agency-eyebrow)] hover:border-[var(--agency-ink)] hover:text-[var(--agency-ink)] focus-visible:ring-[var(--agency-ink)]/30"
                : "p-2 text-foreground/40 hover:bg-foreground/5 hover:text-foreground focus-visible:ring-ring",
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className={cn("min-h-0 flex-1 overflow-y-auto hide-scrollbar", isDemo ? "bg-[var(--agency-paper)] px-7 py-8 sm:px-10 sm:py-10" : "px-7 py-8 sm:px-10 sm:py-10")}>
          {children}
        </div>
      </motion.section>
    </motion.div>,
    document.body,
  );
}
