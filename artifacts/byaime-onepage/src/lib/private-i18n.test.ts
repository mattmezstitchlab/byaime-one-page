import { describe, expect, it } from "vitest";
import { dictionaries, translate, type I18nKey, type Locale } from "./i18n-dictionary";
import { getPrivateNavigation, PRIVATE_PRIMARY_NAVIGATION } from "./private-navigation";
import {
  getPanelContextGroup,
  getWeddingCapabilities,
  getWeddingNavigation,
  getWeddingNavigationLabel,
  getWeddingPanelLabel,
  getWeddingPanelLabels,
  getWeddingRailItems,
  getWorldPhases,
  WEDDING_PANEL_IDS,
  WEDDING_PANEL_LABELS,
  WORLD_PHASES,
} from "./wedding-navigation";

/*
 * L'espace privé se traduit par lots. Ces tests tiennent la promesse du lot :
 * la coque du Monde parle réellement anglais, sans laisser fuir de français,
 * et le français reste le repli exact quand rien n'est demandé.
 */

const LOCALES: Locale[] = ["fr", "en"];
const owner = getWeddingCapabilities("owner");

describe("dictionnaire bilingue", () => {
  it("traduit chaque clé française en anglais, sans trou", () => {
    const frKeys = Object.keys(dictionaries.fr) as I18nKey[];
    const enKeys = Object.keys(dictionaries.en) as I18nKey[];
    expect(new Set(enKeys)).toEqual(new Set(frKeys));
    for (const key of frKeys) {
      expect(dictionaries.en[key], `clé « ${key} » vide en anglais`).toBeTruthy();
    }
  });

  it("retombe en français quand la clé manque dans la langue demandée", () => {
    expect(translate("en", "inconnu" as I18nKey)).toBe("inconnu");
    expect(translate("fr", "world.phase.pendant")).toBe("Le Jour J");
  });

  it("interpole les variables dans les deux langues", () => {
    expect(translate("fr", "world.hero.guests", { count: 120 })).toBe("120 invités");
    expect(translate("en", "world.hero.guests", { count: 120 })).toBe("120 guests");
  });
});

describe("coque privée traduite", () => {
  it("traduit la navigation globale, et garde les mêmes routes", () => {
    expect(getPrivateNavigation("fr").map(item => item.label)).toEqual(["Profil", "Monde"]);
    expect(getPrivateNavigation("en").map(item => item.label)).toEqual(["Profile", "World"]);
    for (const locale of LOCALES) {
      expect(getPrivateNavigation(locale).map(item => item.href)).toEqual(["/profile", "/user-portal"]);
    }
  });

  it("garde le français comme valeur par défaut, à l'identique de l'ancien tableau", () => {
    expect(getPrivateNavigation()).toEqual([...PRIVATE_PRIMARY_NAVIGATION]);
    expect(getWorldPhases()).toEqual([...WORLD_PHASES]);
    expect(getWeddingPanelLabels()).toEqual(WEDDING_PANEL_LABELS);
  });

  it("traduit les trois périodes du Monde", () => {
    expect(getWorldPhases("fr").map(phase => phase.label)).toEqual(["Avant", "Le Jour J", "Après"]);
    expect(getWorldPhases("en").map(phase => phase.label)).toEqual(["Before", "The big day", "After"]);
  });

  it("traduit la barre latérale et les outils du mode sans changer leur ordre", () => {
    const ids = (locale: Locale) => getWeddingRailItems("avant", owner, locale).map(item => item.id);
    expect(ids("en")).toEqual(ids("fr"));
    expect(getWeddingRailItems("avant", owner, "en").map(item => item.label)).toEqual([
      "Timeline", "People", "Vendors", "Tasks", "Finances", "Documents", "Team", "Music",
    ]);
    expect(getWeddingNavigation("avant", owner, "en").primary.map(item => item.label)).toEqual([
      "Ceremony & reception", "Logistics", "Seating chart", "Messages",
    ]);
  });

  it("nomme la Timeline selon la période, dans les deux langues", () => {
    expect(getWeddingRailItems("pendant", owner, "en")[0].label).toBe("Live Timeline");
    expect(getWeddingRailItems("apres", owner, "en")[0].label).toBe("Timeline · Replay");
    expect(getWeddingRailItems("pendant", owner, "fr")[0].label).toBe("Timeline en direct");
  });

  it("traduit chaque panneau du Monde", () => {
    for (const panel of WEDDING_PANEL_IDS) {
      for (const locale of LOCALES) {
        expect(getWeddingPanelLabel(panel, locale), `panneau « ${panel} » en ${locale}`).toBeTruthy();
      }
    }
    expect(getWeddingPanelLabel("guests", "en")).toBe("Guest list");
    expect(getWeddingPanelLabel("dayof", "en")).toBe("Big day control desk");
  });

  it("traduit les groupes de navigation contextuelle", () => {
    const rail = getWeddingRailItems("avant", owner, "en");
    const navigation = getWeddingNavigation("avant", owner, "en");
    expect(getPanelContextGroup("budget", rail, navigation, "chronological", "en").label).toBe("Common ground");
    expect(getPanelContextGroup("seating", rail, navigation, "chronological", "en").label).toBe("Tools for this mode");
    expect(getPanelContextGroup("sections", rail, navigation, "chronological", "en").label).toBe("World navigation");
  });

  it("traduit le libellé de la position courante du Monde", () => {
    const rail = getWeddingRailItems("avant", owner, "en");
    const navigation = getWeddingNavigation("avant", owner, "en");
    expect(getWeddingNavigationLabel("chronological", null, navigation, rail, "en")).toBe("Timeline");
    expect(getWeddingNavigationLabel("chronological", "guests", navigation, rail, "en")).toBe("Guest list");
  });

  it("ne laisse fuir aucun accent français dans la coque anglaise", () => {
    const english = [
      ...getPrivateNavigation("en").flatMap(item => [item.label, item.description]),
      ...getWorldPhases("en").map(phase => phase.label),
      ...(["avant", "pendant", "apres"] as const).flatMap(phase => [
        ...getWeddingRailItems(phase, owner, "en").flatMap(item => [item.label, item.description]),
        ...getWeddingNavigation(phase, owner, "en").primary.flatMap(item => [item.label, item.description]),
        ...getWeddingNavigation(phase, owner, "en").secondary.flatMap(item => [item.label, item.description]),
      ]),
      ...Object.values(getWeddingPanelLabels("en")),
    ];
    for (const value of english) {
      expect(value, `« ${value} » garde des caractères français`).not.toMatch(/[àâäçéèêëîïôöùûüœ]/i);
    }
  });
});
