import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Menu as MenuIcon } from "lucide-react";
import { buildWorldMenu } from "@/lib/admin-plan";
import type { Locale } from "@/lib/i18n-dictionary";
import type { WeddingDestination, WorldPhase } from "@/lib/wedding-navigation";
import { cn } from "@/lib/utils";
import { EYEBROW } from "@/lib/site-design";

/*
 * Le menu du Monde, simplifié (14/09) : UN bouton, UNE liste plate.
 *
 * La Timeline organise le produit — chaque Moment porte ses repères et ses
 * actions — donc le menu n'a plus à dérouler deux sections de panneaux. Il
 * reste un raccourci : le socle commun et les outils de la période courante,
 * sur un seul niveau, pour retrouver une catégorie sans dérouler le fil.
 *
 * Mécanique conservée du 14/09 : le panneau est rendu dans un portail en
 * `fixed` sous son bouton (jamais dans une rangée `overflow-x-auto`, qui
 * découperait le sous-menu), et se ferme au clic extérieur, à Échap, au scroll
 * et au redimensionnement.
 */

type Anchor = { top: number; left: number; width: number };

export function WorldTopMenu({
  role,
  locale,
  phase,
  onOpen,
}: {
  role: string;
  locale: Locale;
  phase: WorldPhase;
  onOpen: (destination: WeddingDestination) => void;
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const items = buildWorldMenu(role, phase, locale);

  const place = (): Anchor | null => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      top: rect.bottom + 8,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - 300)),
      width: rect.width,
    };
  };

  const toggle = () => {
    if (open) {
      setOpen(false);
      setAnchor(null);
      return;
    }
    setAnchor(place());
    setOpen(true);
  };

  useLayoutEffect(() => {
    if (!open) return undefined;
    const reposition = () => setAnchor(place());
    reposition();
    window.addEventListener("resize", reposition);
    return () => window.removeEventListener("resize", reposition);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onScroll = () => setAnchor(place());
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setOpen(false);
      setAnchor(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setAnchor(null);
        buttonRef.current?.focus();
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

  /* Jamais plus haut que la fenêtre, jamais plus large qu'elle. */
  const maxHeight = anchor ? Math.max(160, window.innerHeight - anchor.top - 16) : undefined;

  return (
    <>
      <div
        data-testid="world-top-menu"
        className="flex items-center gap-1 bg-[var(--agency-paper)] px-3 pt-2"
        aria-label="Menu du Monde"
      >
        <button
          ref={buttonRef}
          type="button"
          data-testid="world-top-menu-button"
          aria-expanded={open}
          aria-haspopup="true"
          onClick={toggle}
          className={cn(
            "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.18em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/30",
            open
              ? "bg-[var(--agency-ink)] text-[var(--agency-paper)]"
              : "text-[var(--agency-body)] hover:bg-[var(--agency-ink)]/10 hover:text-[var(--agency-ink)]",
          )}
        >
          <MenuIcon className="h-3.5 w-3.5" />
          Menu
        </button>
      </div>

      {open && anchor && createPortal(
        <div
          ref={panelRef}
          role="menu"
          aria-label="Le Monde"
          data-testid="world-top-menu-panel-monde"
          style={{ position: "fixed", top: anchor.top, left: anchor.left, minWidth: 288, maxWidth: "min(360px, calc(100vw - 24px))", maxHeight, overflowY: "auto" }}
          className="z-[130] overflow-hidden rounded-[16px] border border-[var(--agency-hairline)] bg-[var(--agency-paper)] shadow-[0_16px_40px_-12px_rgba(23,20,16,0.24)]"
        >
          <p className={cn(EYEBROW, "border-b border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-4 py-2.5 normal-case tracking-normal")}>
            Le socle et les outils de la période — tout le reste vit dans les Moments.
          </p>
          {items.map(item => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              data-testid={`world-top-menu-item-${item.id}`}
              onClick={() => {
                onOpen(item.destination);
                setOpen(false);
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
