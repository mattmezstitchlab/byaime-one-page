import {
  getWeddingCapabilities,
  getWeddingNavigation,
  getWeddingRailItems,
  isWeddingEntryAllowed,
  type WeddingNavigationItem,
  type WorldPhase,
} from "./wedding-navigation";
import type { Locale } from "./i18n-dictionary";

/*
 * Le menu du Monde, version Timeline-first (14/09).
 *
 * Avant cette refonte, le menu du haut déroulait deux sections listant tous les
 * panneaux : c'était une seconde porte d'entrée parallèle à la Timeline, et le
 * chemin le plus court vers une fonctionnalité passait par « menu → panneau →
 * chercher le contexte ».
 *
 * Désormais la Timeline organise le produit : chaque Moment porte ses actions
 * (lib/moment-context.ts), et les panneaux sont des profondeurs ouvertes depuis
 * un Moment. Le menu global ne porte plus qu'UNE liste plate — le socle commun
 * plus les outils de la période courante — pour retrouver une catégorie en un
 * clic quand on ne veut pas dérouler le fil. Une entrée, un niveau, zéro section.
 */

export type AdminPlan = { sections: Array<{ id: string; title: string; hint: string; items: WeddingNavigationItem[] }> };

const allowed = (items: WeddingNavigationItem[], caps: ReturnType<typeof getWeddingCapabilities>) =>
  items.filter(entry => isWeddingEntryAllowed(entry, caps));

/** La liste plate du menu : socle commun + outils de la phase, sans doublon. */
export function buildWorldMenu(role: string, phase: WorldPhase, locale: Locale = "fr"): WeddingNavigationItem[] {
  const caps = getWeddingCapabilities(role);
  const rail = allowed(getWeddingRailItems(phase, caps, locale), caps);
  const phaseItems = allowed(
    [...getWeddingNavigation(phase, caps, locale).primary, ...getWeddingNavigation(phase, caps, locale).secondary],
    caps,
  );
  const seen = new Set<string>();
  return [...rail, ...phaseItems].filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function buildAdminPlan(role: string, locale: Locale = "fr", phase: WorldPhase = "avant"): AdminPlan {
  return {
    sections: [
      {
        id: "monde",
        title: "Le Monde",
        hint: "Une seule liste : le socle commun et les outils de la période. Tout le reste vit dans les Moments de la Timeline.",
        items: buildWorldMenu(role, phase, locale),
      },
    ],
  };
}
