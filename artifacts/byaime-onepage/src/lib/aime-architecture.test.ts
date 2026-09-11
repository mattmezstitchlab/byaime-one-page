import { describe, expect, it } from "vitest";
import {
  AIME_SCREENS,
  architectureBrief,
  findAimeScreenByLabel,
  normalizeAimeText,
  searchAimeScreens,
  type AimeScreenId,
} from "./aime-architecture";
import { WEDDING_PANEL_LABELS, WORLD_PHASES, type WeddingPanelId, type WorldPhase } from "./wedding-navigation";
import type { WorldFocusRequest } from "./world-focus";

/*
 * Ces tests sont le garde-fou de l'agent : ils échouent dès qu'un écran du code
 * n'est plus décrit dans le registre, ou qu'une aide promet un saut impossible.
 */

const PANEL_IDS = Object.keys(WEDDING_PANEL_LABELS) as WeddingPanelId[];
const REACHABLE_VIEWS: Exclude<TimelineView, "map">[] = [
  "chronological", "public-info", "day-of", "person", "provider", "music", "logistics", "collaborative", "memories",
];
const KNOWN_ROUTES = [
  "/", "/guides", "/creation", "/connexion", "/sign-in", "/sign-up", "/user-portal", "/profile", "/conditions", "/confidentialite",
];
const KNOWN_EVENTS = ["aime:open-ai", "aime:open-me", "aime:open-world-settings", "aime:open-collaboration-invite"];

const isKnownRoute = (href: string) => KNOWN_ROUTES.some(route => href === route || href.startsWith(`${route}/`));

function validFocus(focus: WorldFocusRequest | undefined) {
  if (!focus) return true;
  const panelOk = focus.panel === undefined || PANEL_IDS.includes(focus.panel as WeddingPanelId);
  const viewOk = focus.view === undefined || (["chronological", "public-info", "day-of", "person", "provider", "music", "logistics", "collaborative", "memories"] as string[]).includes(focus.view);
  const phaseOk = focus.phase === undefined || (WORLD_PHASES as ReadonlyArray<{ id: WorldPhase }>).some(phase => phase.id === focus.phase);
  const auditOk = focus.auditView === undefined || ["isolated", "dangling", "music", "connected"].includes(focus.auditView);
  return panelOk && viewOk && phaseOk && auditOk;
}

describe("registre d'architecture d'AIME", () => {
  it("décrit chaque panneau du Monde, avec le libellé exact du code", () => {
    for (const panel of PANEL_IDS) {
      const screen = AIME_SCREENS[`panel:${panel}` as AimeScreenId];
      expect(screen, `panneau « ${panel} » absent du registre`).toBeDefined();
      expect(screen.id).toBe(`panel:${panel}`);
      expect(screen.label).toBe(WEDDING_PANEL_LABELS[panel]);
      expect(screen.purpose.length).toBeGreaterThan(20);
      expect(screen.does.length).toBeGreaterThan(0);
    }
  });

  it("décrit chaque vue accessible de la Timeline", () => {
    for (const view of REACHABLE_VIEWS) {
      const screen = AIME_SCREENS[`view:${view}` as AimeScreenId];
      expect(screen, `vue « ${view} » absente du registre`).toBeDefined();
      expect(screen.does.length).toBeGreaterThan(0);
    }
    // La vue « map » n'est plus atteignable depuis la suppression de la carte : elle ne doit pas ressurgir dans l'aide.
    expect(AIME_SCREENS["view:map" as AimeScreenId]).toBeUndefined();
  });

  it("décrit les trois phases, les écrans publics et les panneaux du portail", () => {
    for (const id of ["home", "portal", "profile", "guides", "creation", "rsvp", "invite", "public-profile", "legal"] satisfies AimeScreenId[]) {
      expect(AIME_SCREENS[id].label).toBeTruthy();
    }
    for (const phase of WORLD_PHASES) {
      expect(AIME_SCREENS[`phase:${phase.id}` as AimeScreenId]?.label).toBe(phase.label);
    }
    for (const id of ["portal:me", "portal:world-settings", "portal:invite"] satisfies AimeScreenId[]) {
      expect(AIME_SCREENS[id].actions.length).toBeGreaterThan(0);
    }
  });

  it("ne promet aucun saut impossible : panneaux, vues, phases, routes et événements sont réels", () => {
    for (const screen of Object.values(AIME_SCREENS)) {
      for (const action of screen.actions) {
        expect(validFocus(action.focus), `${screen.id} → focus invalide`).toBe(true);
        if (action.href) expect(isKnownRoute(action.href), `${screen.id} → route ${action.href}`).toBe(true);
        if (action.emit) expect(KNOWN_EVENTS, `${screen.id} → ${action.emit}`).toContain(action.emit);
        if (!action.focus && !action.href && !action.emit) {
          throw new Error(`${screen.id} : l'action « ${action.label} » ne sait pas où aller`);
        }
      }
      for (const related of screen.related) {
        expect(AIME_SCREENS[related], `${screen.id} → écran lié ${related}`).toBeDefined();
      }
    }
  });

  it("retrouve un écran depuis le titre affiché d'un panneau", () => {
    for (const panel of PANEL_IDS) {
      const title = WEDDING_PANEL_LABELS[panel];
      expect(findAimeScreenByLabel(title)?.id).toBe(`panel:${panel}`);
    }
    expect(findAimeScreenByLabel("Régie du Jour J")?.id).toBe("panel:dayof");
    expect(findAimeScreenByLabel("Panneau inventé par un cauchemar")).toBeUndefined();
    expect(findAimeScreenByLabel("")).toBeUndefined();
  });

  it("ignore accents et casse dans la recherche", () => {
    expect(normalizeAimeText("Préparer le Plan-de-Table !")).toBe("preparer le plan de table");
    const [best] = searchAimeScreens("où est le plan de table");
    expect(best?.screen.id).toBe("panel:seating");
    const results = searchAimeScreens("budget et paiements a venir");
    expect(results.map(match => match.screen.id)).toContain("panel:budget");
    expect(searchAimeScreens("")).toEqual([]);
    expect(searchAimeScreens("zzz qqq")).toEqual([]);
  });

  it("résume l'architecture pour la documentation et l'aide", () => {
    const brief = architectureBrief();
    expect(brief).toContain("Un Monde, pas un formulaire");
    expect(brief).toContain("panel:guests");
    expect(brief.split("\n").filter(line => line.startsWith("- ")).length).toBe(Object.keys(AIME_SCREENS).length);
  });
});
