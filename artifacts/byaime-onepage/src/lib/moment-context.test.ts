import { describe, expect, it } from "vitest";
import { createInitialProject, parseIntention } from "./parser";
import {
  FULL_MOMENT_CAPABILITIES,
  INTENT_ACTIONS,
  MOMENT_PRIMARY_COUNT,
  buildMomentContext,
  momentDocumentIds,
  momentGuestIds,
  momentIntent,
  momentLinks,
  momentProviderIds,
  momentTrackIds,
  type MomentCapabilities,
} from "./moment-context";
import type { TimelineEvent, WorldProject } from "./types";
import { getAimePanelItems, getAimePanelMenu } from "./panel-navigation";
import { normalizePanelId } from "./wedding-navigation";

const INTENTION = "Notre mariage le 5 août 2027, près de Lille, 90 invités.";
const project = createInitialProject(parseIntention(INTENTION), INTENTION);
const DAY = 86_400_000;

const find = (fragment: string): TimelineEvent => {
  const event = project.timeline.find(item => item.title.toLowerCase().includes(fragment.toLowerCase()));
  if (!event) throw new Error(`Moment introuvable : ${fragment}`);
  return event;
};

const caps: MomentCapabilities = FULL_MOMENT_CAPABILITIES;
const noMoney: MomentCapabilities = { seeFinances: false, manageDocuments: true };
const noDocs: MomentCapabilities = { seeFinances: true, manageDocuments: false };

describe("momentIntent — chaque Moment sait de quoi il parle", () => {
  it("lit le poste depuis le prestataire relié, pas seulement depuis le titre", () => {
    expect(momentIntent(find("découverte du lieu"), project)).toBe("lieu");
    expect(momentIntent(find("Choix du photographe"), project)).toBe("photographe");
    expect(momentIntent(find("Dégustation du menu"), project)).toBe("table");
    expect(momentIntent(find("La musique"), project)).toBe("musique");
  });

  it("reconnaît les personnes, les tenues, la papeterie et les préparatifs", () => {
    expect(momentIntent(find("invitations"), project)).toBe("invites");
    expect(momentIntent(find("Save the Date"), project)).toBe("invites");
    expect(momentIntent(find("Alliances"), project)).toBe("tenue");
    expect(momentIntent(find("Plan de table"), project)).toBe("table");
    expect(momentIntent(find("Essai beauté"), project)).toBe("prep");
    expect(momentIntent(find("Les fleurs"), project)).toBe("fleurs");
  });

  it("bascule en clôture quand le Jour J approche", () => {
    expect(momentIntent(find("Dernier point"), project)).toBe("finaliser");

    /* Même Moment, même texte : loin du Jour J il reste sur son poste. */
    const pivot = project.pivot.value;
    const loin: WorldProject = { ...project, pivot: { value: pivot + 300 * DAY } };
    const lastWeek = loin.timeline.find(event => event.title === "Dernier point")!;
    expect(momentIntent(lastWeek, loin)).not.toBe("finaliser");
    const imminent: WorldProject = { ...project, pivot: { value: pivot } };
    expect(momentIntent(find("Dernier point"), imminent)).toBe("finaliser");
  });

  it("donne au Jour J la régie, à la cérémonie son poste, à l'Après ses souvenirs", () => {
    expect(momentIntent(find("Réveil"), project)).toBe("jour-j");
    expect(momentIntent(find("L'engagement"), project)).toBe("ceremonie");
    expect(momentIntent(find("banquet"), project)).toBe("table");
    expect(momentIntent(find("mots doux"), project)).toBe("remerciements");
    expect(momentIntent(find("Mémoires figées"), project)).toBe("souvenirs");
    expect(momentIntent(find("Règlement final"), project)).toBe("finaliser");
  });
});

describe("momentLinks — une seule lecture des relations", () => {
  it("retourne exactement ce que les repères affichent", () => {
    const lieu = find("découverte du lieu");
    const links = momentLinks(project, lieu.id);

    expect(links.providers.map(item => item.id)).toEqual(momentProviderIds(project, lieu.id));
    expect(links.documents.map(item => item.id)).toEqual(momentDocumentIds(project, lieu.id));
    expect(links.tracks.map(item => item.id)).toEqual(momentTrackIds(project, lieu.id));
    expect(links.guests.map(item => item.id)).toEqual(momentGuestIds(project, lieu.id));
    expect(links.providers[0]?.name).toBeTruthy();
  });

  it("suit les documents du prestataire relié, sans nouvelle collection", () => {
    expect(momentDocumentIds(project, find("découverte du lieu").id).length).toBeGreaterThan(0);
  });

  it("suit la musique reliée par timelineEventIds", () => {
    const withMusic = project.timeline.find(event => momentTrackIds(project, event.id).length > 0);
    expect(withMusic, "aucun Moment ne porte de musique").toBeTruthy();
    expect(momentTrackIds(project, withMusic!.id).length).toBeGreaterThan(0);
  });
});

describe("buildMomentContext — le contexte et ses actions", () => {
  it("donne des repères courts, jamais une liste brute", () => {
    const context = buildMomentContext(find("découverte du lieu"), project, caps, "fr");

    expect(context.facts.length).toBeGreaterThan(0);
    expect(context.facts.length).toBeLessThanOrEqual(4);
    expect(context.facts.map(fact => fact.label)).toContain("Lieu");
  });

  it("propose une poignée d'actions, le reste sous « Plus »", () => {
    const context = buildMomentContext(find("Choix du photographe"), project, caps, "fr");
    const primary = context.actions.slice(0, context.primaryCount);

    expect(context.primaryCount).toBe(MOMENT_PRIMARY_COUNT);
    expect(context.actions.length).toBeGreaterThan(MOMENT_PRIMARY_COUNT);
    expect(primary.map(action => action.label)).toEqual(["Rechercher", "Professionnels", "Voir leur travail", "Contacter"]);
    /* Chaque action vise une surface qui existe déjà. */
    for (const action of context.actions) {
      expect(["panel", "view", "route"]).toContain(action.destination.kind);
    }
  });

  it("cache l'argent à un rôle qui ne doit pas le voir", () => {
    const event = find("découverte du lieu");
    const withMoney = buildMomentContext(event, project, caps, "fr");
    const without = buildMomentContext(event, project, noMoney, "fr");

    expect(withMoney.actions.some(action => action.id === "budget")).toBe(true);
    expect(without.actions.some(action => action.id === "budget")).toBe(false);
    expect(without.facts.some(fact => fact.label === "Budget")).toBe(false);
  });

  it("cache les documents quand le rôle n'y a pas accès", () => {
    const without = buildMomentContext(find("découverte du lieu"), project, noDocs, "fr");

    expect(without.actions.some(action => action.id === "documents")).toBe(false);
    expect(without.facts.some(fact => fact.label === "Documents")).toBe(false);
  });

  it("reste cohérent pour un Moment sans aucune donnée reliée", () => {
    const bare: TimelineEvent = { ...find("Réveil"), relations: [] };
    const context = buildMomentContext(bare, project, caps, "fr");

    expect(context.actions.length).toBeGreaterThan(0);
    expect(context.facts.length).toBeLessThanOrEqual(4);
  });

  it("contextualise le Jour J et l'Après avec leurs propres actions", () => {
    const day = buildMomentContext(find("Réveil"), project, caps, "fr");
    expect(day.actions.map(action => action.id)).toContain("regie");

    const thanks = buildMomentContext(find("mots doux"), project, caps, "fr");
    expect(thanks.actions.map(action => action.id)).toContain("thanks");
    expect(thanks.actions.map(action => action.id)).toContain("gallery");

    const memories = buildMomentContext(find("Mémoires figées"), project, caps, "fr");
    expect(memories.actions.map(action => action.id)).toContain("share");
    const share = memories.actions.find(action => action.id === "share")!;
    expect(share.destination).toEqual({ kind: "route", href: `/bilan/${project.id}` });
  });

  it("traduit les actions dans la langue du Monde", () => {
    const fr = buildMomentContext(find("Choix du photographe"), project, caps, "fr");
    const en = buildMomentContext(find("Choix du photographe"), project, caps, "en");

    expect(fr.actions[0].label).toBe("Rechercher");
    expect(en.actions[0].label).toBe("Search");
  });

  it("ne dépasse jamais quatre actions primaires, quel que soit le Moment", () => {
    for (const event of project.timeline) {
      const context = buildMomentContext(event, project, caps, "fr");
      expect(context.primaryCount).toBeLessThanOrEqual(MOMENT_PRIMARY_COUNT);
      expect(context.actions.length).toBeGreaterThan(0);
    }
    for (const intent of Object.keys(INTENT_ACTIONS) as (keyof typeof INTENT_ACTIONS)[]) {
      expect(INTENT_ACTIONS[intent].length).toBeGreaterThan(0);
    }
  });
});

describe("audit de navigation — rien ne vit seulement dans un menu", () => {
  const panelsFromMoments = () => {
    const panels = new Set<string>();
    const views = new Set<string>();
    for (const event of project.timeline) {
      for (const action of buildMomentContext(event, project, caps, "fr").actions) {
        if (action.destination.kind === "panel") panels.add(normalizePanelId(action.destination.panel));
        if (action.destination.kind === "view") views.add(action.destination.view);
      }
    }
    return { panels, views };
  };

  it("chaque panneau du menu est aussi atteignable depuis un Moment", () => {
    /* Le menu du Monde, c'est la colonne du Panneau AIME (source unique). */
    const menuPanels = new Set<string>();
    for (const item of getAimePanelItems(getAimePanelMenu({ role: "owner", locale: "fr", project }))) {
      if (item.destination.kind === "panel") menuPanels.add(normalizePanelId(item.destination.panel));
    }
    expect(menuPanels.size).toBeGreaterThan(0);

    const { panels } = panelsFromMoments();
    for (const panel of menuPanels) {
      expect(panels.has(panel), `« ${panel} » n'est atteignable que par le menu`).toBe(true);
    }
  });

  it("les vues de la Timeline sont, elles aussi, portées par des Moments", () => {
    const { views } = panelsFromMoments();

    expect(views.has("music")).toBe(true);
    expect(views.has("public-info")).toBe(true);
  });

  it("le chemin le plus court reste Moment → action → résultat", () => {
    /* Un clic sur une action de Moment ouvre une surface existante : aucune
       action ne pointe vers un panneau inconnu du modèle de navigation. */
    const known = new Set<string>(["pilotage", "documents", "logistics", "messages", "music", "dayof"]);
    const { panels } = panelsFromMoments();
    for (const panel of panels) expect(known.has(panel), `panneau inconnu : ${panel}`).toBe(true);
  });
});
