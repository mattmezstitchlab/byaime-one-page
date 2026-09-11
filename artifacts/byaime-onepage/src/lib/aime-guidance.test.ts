import { describe, expect, it } from "vitest";
import { answerAime, nextBestActions } from "./aime-guidance";
import { AIME_SCREENS } from "./aime-architecture";
import { createInitialProject, parseIntention } from "./parser";
import { fact } from "./types";
import type { WorldProject } from "./types";

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
    expect(answer.actions[0].focus?.panel).toBe("sections");
  });

  it("explique le modèle quand on demande comment AIME fonctionne", () => {
    const answer = answerAime("comment fonctionne AIME ?", { project: null });
    expect(answer.kind).toBe("model");
    expect(answer.paragraphs.join(" ")).toContain("Timeline est la source");
  });
});
