import { useState } from "react";
import { buildAdminPlan } from "@/lib/admin-plan";
import type { Locale } from "@/lib/i18n-dictionary";
import type { WeddingDestination } from "@/lib/wedding-navigation";
import { cn } from "@/lib/utils";
import { EYEBROW } from "@/lib/site-design";

/*
 * Le menu horizontal du portail — désormais blanc, comme demandé, et aligné
 * sur le dessin de l'écran démo : pastilles, jetons agency, pas de jaune.
 */
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
  const plan = buildAdminPlan(role, locale);

  return (
    <div
      data-testid="world-top-menu"
      className="flex items-center gap-1 overflow-x-auto bg-[var(--agency-paper)] px-3 pt-2 pr-44"
      aria-label="Menu horizontal du Monde"
    >
      {plan.sections.map(section => (
        <div key={section.id} className="relative shrink-0">
          <button
            type="button"
            aria-expanded={open === section.id}
            onClick={() => setOpen(open === section.id ? null : section.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.18em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/30",
              open === section.id
                ? "bg-[var(--agency-ink)] text-[var(--agency-paper)]"
                : "text-[var(--agency-body)] hover:bg-[var(--agency-ink)]/10 hover:text-[var(--agency-ink)]",
            )}
          >
            {section.title}
          </button>
          {open === section.id && (
            <div className="absolute left-0 top-full z-50 mt-2 min-w-72 overflow-hidden rounded-[16px] border border-[var(--agency-hairline)] bg-[var(--agency-paper)] shadow-[0_16px_40px_-12px_rgba(23,20,16,0.24)]">
              <p className="border-b border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-4 py-2.5 text-[11px] leading-relaxed text-[var(--agency-body)]">
                {section.hint}
              </p>
              {section.items.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onOpen(item.destination);
                    setOpen(null);
                  }}
                  className="flex w-full flex-col gap-0.5 bg-[var(--agency-paper)] px-4 py-2.5 text-left transition-colors hover:bg-[var(--agency-ink)]/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/30"
                >
                  <span className="text-[13px] font-medium text-[var(--agency-ink)]">{item.label}</span>
                  <span className="text-[11px] leading-snug text-[var(--agency-body)]">{item.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
