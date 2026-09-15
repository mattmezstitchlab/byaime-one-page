import { describe, expect, it } from "vitest";
import { answerAime, nextBestActions } from "./aime-guidance";
import { AIME_SCREENS } from "./aime-architecture";
import { createInitialProject, parseIntention } from "./parser";
import { fact } from "./types";
import type { TimelineEvent, WorldProject } from "./types";

/*
 * Le moteur de conseil ne doit jamais sortir du décor : chaque étape proposée
 * correspond à un état réel du Monde, et chaque bouton mène à un écran décrit
 * dans le registre d'architecture.
 */

const projectFrom = (sentence: string, patch: Partial<WorldProject> = {}): WorldProject =>
  ({ ...createInitialProject(parseIntention(sentence), sentence), ...patch });

/*
 * Un Monde vidé de ses exemples : le démonstrateur de `createInitialProject`
 * pré-remplit invités, prestataires et paiements, ce qui masquerait les règles
 * que l'on veut observer ici.
 */
const bareWorld = (sentence: string, patch: Partial<WorldProject> = {}): WorldProject =>
  projectFrom(sentence, {
    timeline: [], tasks: [], guests: [], tables: [], providers: [], payments: [],
    documents: [], music: [], memories: [], media: [],
    logistics: { emergencyContacts: [] } as unknown as WorldProject["logistics"],
    ...patch,
  });

const WEIGHT_ORDER = { blocant: 0, utile: 1, saison: 2 } as const;

function expectValidSteps(steps: ReturnType<typeof nextBestActions>) {
  for (const step of steps) {
    expect(step.title.length).toBeGreaterThan(3);
    expect(step.why.length).toBeGreaterThan(15);
    const action = step.action;
    const canMove = Boolean(action.focus || action.href || action.emit);
    expect(canMove, `« ${step.title} » ne propose aucun déplacement`).toBe(true);
    if (action.focus?.panel !== undefined) expect(AIME_SCREENS[`panel:${action.focus.panel}` as keyof typeof AIME_SCREENS]).toBeDefined();
    if (action.focus?.view !== undefined) expect(AIME_SCREENS[`view:${action.focus.view}` as keyof typeof AIME_SCREENS]).toBeDefined();
    if (action.href) expect(AIME_SCREENS[action.href === "/" ? "home" : "legal" as keyof typeof AIME_SCREENS]).toBeDefined();
  }
  // Les blocages passent avant les conseils.
  const ranks = steps.map(step => WEIGHT_ORDER[step.weight]);
  expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
}

describe("agent de guidage d'AIME", () => {
  it("sans Monde, la seule étape qui compte est la première phrase", () => {
    const steps = nextBestActions(null);
    expect(steps).toHaveLength(1);
    expect(steps[0].id).toBe("start");
    expect(steps[0].action.href).toBe("/");
  });

  it("signale ce qui bloque réellement la suite", () => {
    const steps = nextBestActions(projectFrom("Notre mariage."));
    const ids = steps.map(step => step.id);
    expect(ids).toContain("pivot"); // date reprise mais non confirmée
    expect(ids).toContain("place"); // ni ville ni lieu
    expect(ids).toContain("rsvp"); // des réponses attendues
    expect(ids).not.toContain("guests"); // le Monde de démonstration est déjà peuplé
    expect(ids.length).toBeLessThanOrEqual(5);
    expectValidSteps(steps);
  });

  it("suit l'avancement : relance, puis plan de table", () => {
    const withGuests = projectFrom("Notre mariage le 14 août 2027 près de Lille, 120 invités, 20 000 €.", {
      pivot: fact(new Date("2027-08-14").getTime(), "confirme"),
      tables: [],
      guests: [
        { id: "g1", name: "Camille", role: "invite", invitationSent: true, rsvp: "confirme", adults: 1 },
        { id: "g2", name: "Thomas", role: "invite", invitationSent: true, rsvp: "en_attente", adults: 1 },
      ] as WorldProject["guests"],
    });
    const ids = nextBestActions(withGuests).map(step => step.id);
    expect(ids).not.toContain("pivot");
    expect(ids).not.toContain("place");
    expect(ids).toContain("rsvp");
    expect(ids).toContain("seating"); // des invités, aucune table
  });

  it("repasse par la case invitation quand aucun lien n'est parti", () => {
    const untouched = projectFrom("Notre mariage le 14 août 2027 près de Lille.", {
      pivot: fact(new Date("2027-08-14").getTime(), "confirme"),
      guests: [{ id: "g1", name: "Camille", role: "invite", rsvp: "en_attente" }] as WorldProject["guests"],
    });
    const ids = nextBestActions(untouched).map(step => step.id);
    expect(ids).toContain("invite");
    expect(ids).not.toContain("rsvp"); // on ne relance pas ce qui n'a pas été envoyé
  });

  /* ————— Alertes de cohérence : `world-alerts.ts` transformé en recommandations ————— */

  const NOW = Date.UTC(2026, 8, 15, 10); // fixe : les alertes ne doivent jamais dépendre de l'horloge du test

  const moment = (overrides: Partial<TimelineEvent> = {}): TimelineEvent => ({
    id: "m1",
    time: Date.UTC(2027, 7, 14, 12),
    kind: "jalon",
    title: "Moment",
    status: "prepare",
    confidence: "confirme",
    phase: "avant",
    universe: "Mariage",
    provenance: "real",
    ...overrides,
  });

  /*
   * Un Monde « silencieux » : date, ville et lieu confirmés, un invité invité
   * et confirmé, une table posée, aucun prestataire en cours. Rien ne déclenche
   * les étapes structurelles — seules les alertes de cohérence peuvent parler.
   */
  const quietWorld = (patch: Partial<WorldProject> = {}): WorldProject =>
    bareWorld("Notre mariage le 14 août 2027 près de Lille.", {
      pivot: fact(Date.UTC(2027, 7, 14, 12), "confirme"),
      city: fact("Lille", "confirme"),
      venue: fact("Domaine du Bois", "confirme"),
      guests: [{ id: "g1", name: "Camille", role: "invite", invitationSent: true, rsvp: "confirme", attendance: { ceremony: true, cocktail: true, dinner: true, brunch: false } }] as WorldProject["guests"],
      tables: [{ id: "tb1", name: "Table d'honneur", capacity: 8 }] as WorldProject["tables"],
      providers: [] as unknown as WorldProject["providers"],
      ...patch,
    });

  it("dit qu'un engagement Avant est en retard, sans panneau nouveau", () => {
    const monde = quietWorld({
      timeline: [moment({ id: "e1", title: "Réserver le traiteur", time: NOW - 86400000 })],
    });
    const steps = nextBestActions(monde, { phase: "avant", now: NOW });
    expect(steps.map(step => step.id)).toEqual(["late"]);
    expect(steps[0].title).toBe("« Réserver le traiteur » est en retard");
    expect(steps[0].weight).toBe("blocant");
    expect(steps[0].action.focus?.view).toBe("chronological");
    expectValidSteps(steps);
  });

  it("ne transforme pas une suggestion non adoptée en fausse urgence", () => {
    const monde = quietWorld({
      timeline: [moment({ id: "s1", title: "Suggestion jamais adoptée", time: NOW - 86400000, provenance: "suggested" })],
    });
    expect(nextBestActions(monde, { phase: "avant", now: NOW })).toEqual([]);
  });

  it("compte les éléments à confirmer avec les mots du couple", () => {
    const monde = quietWorld({
      timeline: [
        moment({ id: "e1", title: "Valider le menu", status: "a_valider" }),
        moment({ id: "e2", title: "Confirmer les fleurs", status: "en_attente" }),
      ],
    });
    const steps = nextBestActions(monde, { phase: "avant", now: NOW });
    const confirm = steps.find(step => step.id === "confirm");
    expect(confirm?.title).toBe("Vous avez encore 2 éléments à confirmer");
    expect(confirm?.action.focus?.overview).toBe(true);
    const answer = answerAime("je fais quoi maintenant ?", { project: monde });
    expect(answer.kind).toBe("next");
    expect(answer.steps.join(" ")).toContain("Vous avez encore 2 éléments à confirmer");
  });

  it("relève l'incohérence entre un devis et la jauge d'invités", () => {
    const monde = quietWorld({
      guests: Array.from({ length: 120 }, (_, index) => ({
        id: `g${index}`, name: `Invité ${index}`, role: "invite" as const,
        invitationSent: true, rsvp: "confirme" as const,
        attendance: { ceremony: true, cocktail: true, dinner: true, brunch: false },
      })) as WorldProject["guests"],
      timeline: [moment({ id: "d1", kind: "devis", title: "Devis traiteur", amountCents: 50000 })],
    });
    const step = nextBestActions(monde, { phase: "avant", now: NOW }).find(item => item.id === "guests-budget");
    expect(step?.title).toContain("Devis traiteur");
    expect(step?.weight).toBe("utile");
    expect(step?.action.focus?.panel).toBe("budget");
  });

  it("propose la relance d'un prestataire resté sans réponse", () => {
    const monde = quietWorld({
      providers: [{ id: "p9", category: "traiteur", role: "Traiteur", name: "Maison Bernard", status: "contacte" }] as WorldProject["providers"],
    });
    const steps = nextBestActions(monde, { phase: "avant", now: NOW });
    const relance = steps.find(step => step.id === "relance-p9");
    expect(relance?.title).toBe("Préparer une relance pour Maison Bernard");
    expect(relance?.why).toContain("Bonjour Maison Bernard");
    expect(relance?.action.focus?.panel).toBe("messages");
  });

  it("garde la hiérarchie : un retard passe avant un conseil", () => {
    const monde = quietWorld({
      providers: [{ id: "p9", category: "traiteur", role: "Traiteur", name: "Maison Bernard", status: "contacte" }] as WorldProject["providers"],
      timeline: [
        moment({ id: "e1", title: "Réserver le traiteur", time: NOW - 86400000 }),
        moment({ id: "e2", title: "Valider le menu", status: "a_valider" }),
        moment({ id: "e3", title: "Cérémonie", phase: "pendant" }),
      ],
    });
    const steps = nextBestActions(monde, { phase: "avant", now: NOW });
    expect(steps[0].id).toBe("late");
    expect(steps[0].weight).toBe("blocant");
    expectValidSteps(steps);
  });

  it("adapte le conseil à la phase du Monde", () => {
    const day = bareWorld("Notre mariage le 14 août 2027 près de Lille, 120 invités.", {
      pivot: fact(new Date("2027-08-14").getTime(), "confirme"),
    });
    expect(nextBestActions(day, { phase: "avant" }).map(step => step.id)).toEqual(["guests", "timeline"]);
    const pendant = nextBestActions(day, { phase: "pendant" });
    expect(pendant.map(step => step.id)).toEqual(expect.arrayContaining(["emergency", "regie"]));
    expect(pendant.map(step => step.id)).not.toContain("timeline");
    const apres = nextBestActions(day, { phase: "apres" });
    expect(apres.map(step => step.id)).toEqual(expect.arrayContaining(["thanks", "memories"]));
    expectValidSteps(pendant);
    expectValidSteps(apres);
  });

  it("respecte les capacités du rôle : un invité ne déplace rien", () => {
    const day = bareWorld("Notre mariage le 14 août 2027 près de Lille.", {
      pivot: fact(new Date("2027-08-14").getTime(), "confirme"),
    });
    const guest = nextBestActions(day, { phase: "pendant", role: "viewer" }).find(step => step.id === "role");
    expect(guest).toBeDefined();
    expect(guest?.action.focus?.panel).toBe("team");
    expect(nextBestActions(day, { phase: "pendant", role: "owner" }).some(step => step.id === "role")).toBe(false);
  });

  it("explique l'écran courant quand on lui demande", () => {
    const answer = answerAime("À quoi sert cet écran ?", { project: null, screen: "panel:seating" });
    expect(answer.kind).toBe("screen");
    expect(answer.title).toBe("Plan de table");
    expect(answer.steps.length).toBeGreaterThan(1);
    expect(answer.actions.length).toBeGreaterThan(0);
    expect(answer.actions[0].label.length).toBeLessThanOrEqual(40);
  });

  it("répond à « comment on fait X » par un écran qui existe", () => {
    const answer = answerAime("comment je note les réponses des invités ?", { project: null });
    expect(["howto", "screen"]).toContain(answer.kind);
    expect(answer.matches.length).toBeGreaterThan(0);
    for (const match of answer.matches) expect(AIME_SCREENS[match.screen.id]).toBe(match.screen);
  });

  it("renvoie la suite quand on demande quoi faire", () => {
    const answer = answerAime("je fais quoi maintenant ?", { project: null });
    expect(answer.kind).toBe("next");
    expect(answer.steps[0]).toContain("première phrase");
  });

  it("sait dire qui voit quoi", () => {
    const family = answerAime("qui peut voir le budget ?", { project: null, role: "family" });
    expect(family.kind).toBe("roles");
    expect(family.steps.join(" ")).toContain("Voit les finances : non");
    const owner = answerAime("qui peut voir le budget ?", { project: null, role: "owner" });
    expect(owner.steps.join(" ")).toContain("Voit les finances : oui");
  });

  it("n'invente jamais un écran inconnu", () => {
    const answer = answerAime("combien de kilowatts pour la scie circulaire ?", { project: null });
    expect(answer.kind).toBe("unknown");
    expect(answer.title).toContain("pas trouvé");
    expect(answer.matches).toHaveLength(0);
    expect(answer.actions[0].focus?.search).toBe(true);
  });

  it("explique le modèle quand on demande comment AIME fonctionne", () => {
    const answer = answerAime("comment fonctionne AIME ?", { project: null });
    expect(answer.kind).toBe("model");
    expect(answer.paragraphs.join(" ")).toContain("Timeline est la source");
  });
});
