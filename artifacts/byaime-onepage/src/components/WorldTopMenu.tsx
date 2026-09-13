import { useState } from "react";
import { buildAdminPlan } from "@/lib/admin-plan";
import type { Locale } from "@/lib/i18n-dictionary";
import type { WeddingDestination } from "@/lib/wedding-navigation";

/*
 * Le menu horizontal du portail : une catégorie par entrée, un sous-menu qui
 * explique chaque écran avant de l'ouvrir. Blanc, texte noir, institutionnel —
 * on ne devine plus une icône, on lit.
 *
 * Les catégories et leurs entrées viennent de `buildAdminPlan` : le portail et
 * la page Admin partagent exactement le même sommaire, filtré par rôle.
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
      className="flex items-center gap-1 overflow-x-auto px-3 pt-2 pr-44"
      aria-label="Menu horizontal du Monde"
    >
      {plan.sections.map(section => (
        <div key={section.id} className="relative shrink-0">
          <button
            type="button"
            aria-expanded={open === section.id}
            onClick={() => setOpen(open === section.id ? null : section.id)}
            className={
              open === section.id
                ? "rounded-full bg-[#171410] px-4 py-1.5 text-[11px] uppercase tracking-[0.18em] text-[#FFFFFF]"
                : "rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.18em] text-[#171410]/70 transition-colors hover:bg-[#171410]/10 hover:text-[#171410]"
            }
          >
            {section.title}
          </button>
          {open === section.id && (
            <div className="absolute left-0 top-full z-50 mt-1 min-w-72 border border-[#E6E1D8] bg-[#FFFFFF] shadow-xl">
              <p className="border-b border-[#E6E1D8] px-4 py-2 text-[11px] leading-relaxed text-[#8A8375]">
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
                  className="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left transition-colors hover:bg-[#FFFFFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#171410]/40"
                >
                  <span className="text-[13px] text-[#171410]">{item.label}</span>
                  <span className="text-[11px] leading-snug text-[#8A8375]">{item.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
