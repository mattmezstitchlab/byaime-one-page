import { Fragment, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { findAimeScreenByLabel, getAimeScreen, pushAimeScreen, type AimeScreenId } from "@/lib/aime-guidance";
import { AimeScreenHint } from "./AimeGuide";
import { usePanelChrome, type PanelNavItem } from "./PanelChrome";

type CenteredBlockProps = {
  eyebrow: string;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  leading?: ReactNode;
  size?: "md" | "lg" | "xl";
  testId?: string;
  /**
   * L'écran est reconnu depuis son titre et publié au contexte de guidage ; le
   * bouton « Expliquer cet écran » est automatique. Les écrans d'aide le
   * retirent pour ne pas proposer d'ouvrir de l'aide depuis l'aide.
   */
  showGuideHint?: boolean;
  /**
   * Quand le titre n'est pas un libellé d'écran connu (un panneau nommé d'après
   * le projet, par exemple), on précise l'écran à publier dans le contexte.
   */
  screenId?: AimeScreenId;
};

const navPillClasses = (active?: boolean) =>
  cn(
    "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[9px] uppercase tracking-[.13em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    active
      ? "border-foreground bg-foreground text-background"
      : "border-foreground/10 text-foreground/65 hover:border-foreground/30 hover:text-foreground",
  );

function PanelNavigation({ items, onClose }: { items: PanelNavItem[]; onClose: () => void }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Navigation de la page" className="mt-2 flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
      {items.map(item =>
        item.href ? (
          <Link
            key={item.id}
            href={item.href}
            onClick={onClose}
            aria-current={item.active ? "page" : undefined}
            className={navPillClasses(item.active)}
          >
            {item.label}
          </Link>
        ) : (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onClose();
              item.onClick?.();
            }}
            aria-current={item.active ? "page" : undefined}
            className={navPillClasses(item.active)}
          >
            {item.label}
          </button>
        ),
      )}
    </nav>
  );
}

export function CenteredBlock({ eyebrow, title, description, onClose, children, leading, size = "md", testId, showGuideHint = true, screenId }: CenteredBlockProps) {
  const chrome = usePanelChrome();
  const crumbs = [...chrome.breadcrumb, { label: title }];
  /*
   * Un panneau qui correspond à un écran connu prend la main sur le contexte de
   * guidage, et le rend à la fermeture. Un titre inconnu (panneau d'aide, éditeur)
   * ne l'écrase pas : sinon AIME oublierait où il se trouve.
   */
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

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-background/72 px-3 py-5 backdrop-blur-sm sm:px-6 sm:py-8"
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
        data-size={size}
        className={cn("flex h-[min(760px,calc(100dvh-2.5rem))] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] bg-card text-foreground shadow-2xl sm:h-[min(760px,calc(100dvh-4rem))]")}
      >
        <header className="flex shrink-0 items-start gap-4 border-b border-border px-7 pb-5 pt-7 sm:px-10 sm:pt-9">
          {leading}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[.24em] text-muted-foreground">{eyebrow}</p>
            <h2 className="mt-3 font-display text-3xl font-light leading-tight sm:text-4xl">{title}</h2>
            {description && <p className="mt-3 max-w-2xl text-sm font-light leading-relaxed text-foreground/65">{description}</p>}
          </div>
          {showGuideHint && <AimeScreenHint />}
          <button onClick={onClose} aria-label="Fermer" className="-mr-2 rounded-full p-2 text-foreground/40 transition hover:text-foreground hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="shrink-0 border-b border-border/70 px-7 py-2.5 sm:px-10">
          <nav aria-label="Fil d’ariane" className="flex items-center gap-1 overflow-x-auto hide-scrollbar text-[11px]">
            {crumbs.map((crumb, index) => {
              const isLast = index === crumbs.length - 1;
              return (
                <Fragment key={`${crumb.label}-${index}`}>
                  {index > 0 && <ChevronRight aria-hidden="true" className="h-3 w-3 shrink-0 text-foreground/30" />}
                  {isLast ? (
                    <span aria-current="page" className="shrink-0 whitespace-nowrap text-foreground/85">{crumb.label}</span>
                  ) : crumb.href ? (
                    <Link href={crumb.href} onClick={onClose} className="shrink-0 whitespace-nowrap text-foreground/45 transition-colors hover:text-foreground">{crumb.label}</Link>
                  ) : (
                    <span className="shrink-0 whitespace-nowrap text-foreground/45">{crumb.label}</span>
                  )}
                </Fragment>
              );
            })}
          </nav>
          <PanelNavigation items={chrome.navigation} onClose={onClose} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-8 sm:px-10 sm:py-10 hide-scrollbar">{children}</div>
      </motion.section>
    </motion.div>,
    document.body,
  );
}
