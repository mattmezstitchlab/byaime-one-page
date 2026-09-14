import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { buildAdminPlan } from "@/lib/admin-plan";
import type { Locale } from "@/lib/i18n-dictionary";
import type { WeddingDestination } from "@/lib/wedding-navigation";
import { cn } from "@/lib/utils";
import { EYEBROW } from "@/lib/site-design";

/*
 * Le menu horizontal du portail — blanc, aligné sur le dessin de l'écran démo :
 * pastilles, jetons agency, pas de jaune.
 *
 * Réparation du 14/09 : les boutons en haut à gauche « ne fonctionnaient pas ».
 * Ils s'ouvraient bel et bien, mais leur sous-menu était rendu DANS la rangée
 * `overflow-x-auto`. Un `overflow-x: auto` fait passer `overflow-y` en `auto`
 * aussi : le panneau, absolutely positioned, était donc découpé à la hauteur de
 * la rangée — invisible. Il est maintenant rendu dans un portail, positionné en
 * `fixed` sous son bouton, et se ferme au clic extérieur, à Échap, au scroll et
 * au redimensionnement.
 */

type Anchor = { top: number; left: number; width: number };

export function WorldTopMenu({
  role,
  locale,
  onOpen,
}: {
  role: string;
  locale: Locale;
  onOpen: (destination: WeddingDestination) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const panelRef = useRef<HTMLDivElement>(null);
  const plan = buildAdminPlan(role, locale);

  const place = (sectionId: string) => {
    const rect = buttonRefs.current[sectionId]?.getBoundingClientRect();
    if (!rect) return null;
    return {
      top: rect.bottom + 8,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - 300)),
      width: rect.width,
    };
  };

  const toggle = (sectionId: string) => {
    if (open === sectionId) {
      setOpen(null);
      setAnchor(null);
      return;
    }
    setAnchor(place(sectionId));
    setOpen(sectionId);
  };

  /* Le panneau suit son bouton : la rangée défile, la fenêtre se redimensionne. */
  useLayoutEffect(() => {
    if (!open) return undefined;
    const reposition = () => setAnchor(place(open));
    reposition();
    window.addEventListener("resize", reposition);
    return () => window.removeEventListener("resize", reposition);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onScroll = () => setAnchor(place(open));
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (buttonRefs.current[open]?.contains(target)) return;
      setOpen(null);
      setAnchor(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(null);
        setAnchor(null);
        buttonRefs.current[open]?.focus();
      }
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const section = plan.sections.find(item => item.id === open);
  /* Jamais plus haut que la fenêtre, jamais plus large qu'elle. */
  const maxHeight = anchor ? Math.max(160, window.innerHeight - anchor.top - 16) : undefined;

  return (
    <>
      <div
        ref={rowRef}
        data-testid="world-top-menu"
        className="flex items-center gap-1 overflow-x-auto bg-[var(--agency-paper)] px-3 pt-2 pr-44"
        aria-label="Menu horizontal du Monde"
      >
        {plan.sections.map(item => (
          <button
            key={item.id}
            ref={node => { buttonRefs.current[item.id] = node; }}
            type="button"
            data-testid={`world-top-menu-${item.id}`}
            aria-expanded={open === item.id}
            aria-haspopup="true"
            onClick={() => toggle(item.id)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.18em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/30",
              open === item.id
                ? "bg-[var(--agency-ink)] text-[var(--agency-paper)]"
                : "text-[var(--agency-body)] hover:bg-[var(--agency-ink)]/10 hover:text-[var(--agency-ink)]",
            )}
          >
            {item.title}
          </button>
        ))}
      </div>

      {section && anchor && createPortal(
        <div
          ref={panelRef}
          role="menu"
          aria-label={section.title}
          data-testid={`world-top-menu-panel-${section.id}`}
          style={{ position: "fixed", top: anchor.top, left: anchor.left, minWidth: 288, maxWidth: "min(360px, calc(100vw - 24px))", maxHeight, overflowY: "auto" }}
          className="z-[130] overflow-hidden rounded-[16px] border border-[var(--agency-hairline)] bg-[var(--agency-paper)] shadow-[0_16px_40px_-12px_rgba(23,20,16,0.24)]"
        >
          <p className={cn(EYEBROW, "border-b border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-4 py-2.5 normal-case tracking-normal")}>
            {section.hint}
          </p>
          {section.items.map(item => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              data-testid={`world-top-menu-item-${item.id}`}
              onClick={() => {
                onOpen(item.destination);
                setOpen(null);
                setAnchor(null);
              }}
              className="flex w-full flex-col gap-0.5 bg-[var(--agency-paper)] px-4 py-2.5 text-left transition-colors hover:bg-[var(--agency-ink)]/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/30"
            >
              <span className="text-[13px] font-medium text-[var(--agency-ink)]">{item.label}</span>
              <span className="text-[11px] leading-snug text-[var(--agency-body)]">{item.description}</span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
