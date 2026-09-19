import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { findAimeScreenByLabel, getAimeScreen, pushAimeScreen, type AimeScreenId } from "@/lib/aime-guidance";
import { useI18n } from "@/lib/i18n";
import { EYEBROW, TITLE } from "@/lib/site-design";

type ContextPanelProps = {
  eyebrow: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Une icône devant le titre : ce que les éditeurs d'entité passent déjà. */
  leading?: ReactNode;
  screenId?: AimeScreenId;
  testId?: string;
};

/*
 * L'inspecteur : le panneau qui porte les options de CE qu'on a sélectionné.
 *
 * Il a longtemps été une `CenteredBlock` — une fenêtre centrée, un fond flouté,
 * et le fil disparu derrière. On ne pouvait donc pas lire et régler en même
 * temps, ce qui est le seul intérêt d'un inspecteur. Il s'ancre à droite, le
 * fil se recale à sa gauche (`.aime-inspector-open`, posée par le panneau lui
 * même : personne n'a à faire redescendre une largeur à travers trois écrans),
 * et sous 1024 px il devient une feuille en bas d'écran.
 *
 * Ce n'est pas une modale : `aria-modal="false"`, pas de fond qui borde la
 * page, pas de focus-piège — on peut continuer à cliquer dans le fil, et le
 * fil reste la source de ce qu'on est en train d'éditer.
 */
export function ContextPanel({
  eyebrow,
  title,
  onClose,
  children,
  leading,
  screenId,
  testId = "context-panel",
}: ContextPanelProps) {
  const { t } = useI18n();
  const dock = useRef<HTMLElement>(null);

  /* Le guidage AIME sait dans quel écran on tape : même contrat qu'avant. */
  const guideScreenId = (screenId ? getAimeScreen(screenId)?.id : undefined) ?? findAimeScreenByLabel(title)?.id ?? null;
  useEffect(() => (guideScreenId ? pushAimeScreen(guideScreenId) : undefined), [guideScreenId]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("aime-inspector-open");
    return () => root.classList.remove("aime-inspector-open");
  }, []);

  /* Le focus entre sur le premier champ réglable, puis rentre chez lui. */
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    /* Un champ d'abord, une commande ensuite : la croix du bandeau ne doit pas
       voler le focus au premier truc qu'on vient régler. */
    const field =
      dock.current?.querySelector<HTMLElement>("input:not([disabled]), textarea:not([disabled]), select:not([disabled])")
      ?? dock.current?.querySelector<HTMLElement>("[data-testid='context-panel-body'] button:not([disabled])");
    (field ?? dock.current)?.focus();
    return () => { previous?.focus?.(); };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <motion.aside
      ref={dock}
      data-testid={testId}
      data-aime-inspector=""
      role="dialog"
      aria-modal="false"
      aria-label={title}
      tabIndex={-1}
      initial={{ opacity: 0, x: 24, y: 0 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="aime-inspector fixed z-[115] flex flex-col bg-white text-[var(--agency-ink)] shadow-[0_32px_80px_-24px_rgba(23,20,16,0.3)] outline-none"
    >
      <div className="flex shrink-0 items-start gap-4 border-b border-[var(--agency-hairline)] px-6 pb-4 pt-5">
        {leading}
        <div className="min-w-0">
          <p className={EYEBROW}>{eyebrow}</p>
          <h2 className={`${TITLE} mt-1 text-xl leading-tight`}>{title}</h2>
        </div>
        <button
          type="button"
          data-testid="context-panel-close"
          onClick={onClose}
          aria-label={t("contextPanel.close")}
          className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--agency-hairline)] bg-white text-[var(--agency-body)] transition hover:border-[var(--agency-ink)]/30 hover:text-[var(--agency-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/40"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>
      <div data-testid={`${testId}-body`} className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        {children}
      </div>
    </motion.aside>,
    document.body,
  );
}
