import {
  getWeddingCapabilities,
  getWeddingNavigation,
  getWeddingRailItems,
  isWeddingEntryAllowed,
  type WeddingNavigationItem,
} from "./wedding-navigation";
import type { Locale } from "./i18n-dictionary";

/*
 * Le rétroplanning du back-office : tout le Monde remis dans l'ordre du
 * mariage, avec une ligne par entrée, son libellé et sa description.
 *
 * Dérivation pure, testée : elle compose la navigation existante (rail commun
 * + navigation de phase) et filtre par capacités du rôle — le planner voit
 * tout, un invité ne voit que ce qui le regarde. L'ordre est celui d'un
 * mariage : concevoir, vivre le Jour J, clôturer après.
 */

export type AdminSection = {
  id: string;
  title: string;
  hint: string;
  items: WeddingNavigationItem[];
};

export type AdminPlan = { sections: AdminSection[] };

const allowed = (items: WeddingNavigationItem[], caps: ReturnType<typeof getWeddingCapabilities>) =>
  items.filter(entry => isWeddingEntryAllowed(entry, caps));

export function buildAdminPlan(role: string, locale: Locale = "fr"): AdminPlan {
  const caps = getWeddingCapabilities(role);

  const rail = getWeddingRailItems("avant", caps, locale);
  const avant = allowed(getWeddingNavigation("avant", caps, locale).primary, caps);
  const pendant = allowed(getWeddingNavigation("pendant", caps, locale).primary, caps);

  return {
    sections: [
      {
        id: "concevoir",
        title: "Concevoir et préparer",
        hint: "Le socle : moments, personnes (+ plan de table), prestataires (+ budget), tâches, documents — puis la cérémonie, la logistique et les messages.",
        items: [...rail, ...avant],
      },
      {
        id: "jour-j",
        title: "Le Jour J",
        hint: "Ce qui se vit le jour même : le déroulé, les infos des invités, les contributions.",
        items: pendant,
      },
    ],
  };
}
