import { describe, expect, it } from "vitest";
import { buildUniversalWorld, parseFreePhraseToFacts } from "./universal-world";
import { buildSaxophonistTrajectory } from "./trajectory";
import { normalizeProject } from "./project-migration";

describe("point zéro universel — première tranche hors mariage", () => {
  it("1-5: un Monde peut être créé sans être un mariage", () => {
    const project = buildUniversalWorld({
      actorKind: "person",
      actorDetail: "saxophoniste",
      intention: ["trouver plus de prestations"],
      situation: ["je suis auto-entrepreneur", "je donne des cours"],
      ecosystem: ["lieux"],
    });
    expect(project.universe).not.toBe("Mariage");
    expect(project.universe).toBe("Saxophoniste");
    expect(project.title).toBe("Saxophoniste");
    expect(project.universal?.actorKind).toBe("person");
    expect(project.universal?.actorDetail).toBe("saxophoniste");
    // timeline reste colonne vertébrale
    expect(project.timeline.length).toBeGreaterThan(0);
    expect(project.timeline[0].title).toContain("Monde");
  });

  it("6: le saxophoniste auto-entrepreneur obtient une branche contextualisée", () => {
    const project = buildUniversalWorld({
      actorKind: "person",
      actorDetail: "saxophoniste",
      intention: ["explorer le régime du spectacle"],
      situation: ["je suis auto-entrepreneur", "j’ai déjà des prestations"],
      situationFree: "Je suis saxophoniste auto-entrepreneur, je joue dans des mariages et je donne des cours.",
      ecosystem: ["lieux", "bookers"],
    });
    expect(project.universal?.intention).toContain("explorer le régime du spectacle");
    expect(project.universal?.situation).toContain("je suis auto-entrepreneur");
    expect(project.universal?.nextQuestion).toContain("facturées");
    expect(project.trajectory).toBeDefined();
    expect(project.trajectory?.steps.length).toBe(8);
    expect(project.trajectory?.steps[2].title).toContain("types de rémunération");
    // intermittence modélisée comme trajectoire, pas bouton statut
    expect(project.trajectory?.steps.some(s => s.title.includes("validation humaine"))).toBe(true);
    // disclaimer présent, jamais de conseil définitif
    expect(project.trajectory?.disclaimer).toContain("ne donne pas de conseil juridique");
  });

  it("7: la trajectoire est proposée mais jamais appliquée automatiquement", () => {
    const project = buildUniversalWorld({
      actorKind: "person",
      actorDetail: "saxophoniste",
      intention: ["explorer le régime du spectacle"],
      situation: ["je suis auto-entrepreneur"],
      ecosystem: [],
    });
    // trajectoire stockée
    expect(project.trajectory).toBeDefined();
    // mais aucun event n'a été modifié automatiquement en dehors de la proposition
    // les modules sont en proposed, jamais en applied
    const trajModule = project.modulesProposed?.find(m => m.id === "trajectoire");
    expect(trajModule?.status).toBe("proposed");
    expect(trajModule?.provenance.source).toBe("aime");
    // aucun document canonique créé silencieusement
    expect(project.documents.length).toBe(0);
    expect(project.providers.length).toBe(0);
  });

  it("8: les faits restent confirmables et traçables", () => {
    const phrase = "Je suis saxophoniste auto-entrepreneur, je joue dans des mariages et je donne des cours.";
    const facts = parseFreePhraseToFacts(phrase);
    expect(facts.some(f => f.label === "Saxophoniste")).toBe(true);
    expect(facts.some(f => f.label === "Auto-entrepreneur")).toBe(true);
    expect(facts.every(f => f.provenance?.source === "aime")).toBe(true);
    expect(facts.every(f => f.status === "proposition_aime")).toBe(true);

    const project = buildUniversalWorld({
      actorKind: "person",
      actorDetail: "saxophoniste",
      intention: [],
      situation: ["je suis auto-entrepreneur"],
      situationFree: phrase,
      ecosystem: [],
    });
    // les faits issus de la phrase sont à l'état proposition, à confirmer
    const freeFacts = project.universal?.facts.filter(f => f.id === "fact-saxo" || f.id === "fact-auto");
    expect(freeFacts?.length).toBeGreaterThan(0);
    // les faits cochés sont confirmés
    const confirmed = project.universal?.facts.find(f => f.label === "je suis auto-entrepreneur");
    expect(confirmed?.status).toBe("confirme");
    expect(confirmed?.provenance?.source).toBe("human");
  });

  it("9: la Timeline s’ouvre après E (même sans mariage)", () => {
    const project = buildUniversalWorld({
      actorKind: "independent",
      actorDetail: undefined,
      intention: ["présenter mon univers"],
      situation: ["je pars de zéro"],
      ecosystem: ["je continue seul pour l’instant"],
    });
    expect(project.timeline.length).toBeGreaterThan(0);
    // le premier event est le Monde créé, pas un dashboard générique
    expect(project.timeline[0].kind).toBe("intention");
  });

  it("11: rétrocompatibilité — les Mondes mariage existants gardent leur timeline", () => {
    const legacy: any = {
      schemaVersion: 2,
      id: "legacy",
      title: "Notre Mariage",
      universe: "Mariage",
      pivot: { value: Date.now(), confidence: "confirme" },
      city: { value: "Lille", confidence: "confirme" },
      venue: { value: null, confidence: "manquant" },
      guestsCount: { value: 80, confidence: "confirme" },
      budget: { value: 20000, confidence: "confirme" },
      timeline: [{ id: "t1", time: Date.now(), kind: "intention", title: "L'intention posée", detail: "", status: "execute", confidence: "confirme", phase: "avant", universe: "Mariage", provenance: "real", visibility: "equipe", relations: [], dependencyIds: [], resources: [], propagation: { state: "none" } }],
      tasks: [],
      guests: [],
      tables: [],
      providers: [],
      payments: [],
      documents: [],
      communications: [],
      logistics: { accommodations: [], shuttles: [], parking: "", accessibility: "", weatherFallback: "", emergencyContacts: [], packing: [] },
      ceremony: { structure: [], notes: "", readings: [], vows: [], traditions: [], menu: "", drinks: "", cake: "", firstDance: "" },
      music: [],
      team: [],
      memoryChecklist: [],
      memories: [],
      messageTemplates: [],
      messageLogs: [],
      media: [],
      messages: [],
      missing: [],
    };
    const normalized = normalizeProject(legacy as any);
    expect(normalized.title).toBe("Notre Mariage");
    expect(normalized.universal).toBeUndefined();
    expect(normalized.trajectory).toBeUndefined();
    expect(normalized.timeline.length).toBeGreaterThan(0);
  });

  it("trajectoire générique fonctionne pour d’autres transitions", () => {
    const trajet = buildSaxophonistTrajectory("test-id");
    expect(trajet.steps.length).toBe(8);
    expect(trajet.current.length).toBeGreaterThan(0);
    expect(trajet.desired.length).toBeGreaterThan(0);
    // chaque étape est sourcée, datée, et typée
    for (const step of trajet.steps) {
      expect(step.source).toBeDefined();
      expect(step.sourceDate).toMatch(/2026/);
      expect(["confirme", "probable", "a_verifier", "proposition_aime"]).toContain(step.confidence);
    }
  });

  it("ne duplique pas les données canoniques", () => {
    const project = buildUniversalWorld({
      actorKind: "person",
      actorDetail: "saxophoniste",
      intention: [],
      situation: ["j’ai des factures ou documents"],
      ecosystem: [],
    });
    // facts propose mais documents restent vides tant que non validé
    expect(project.documents.length).toBe(0);
    expect(project.universal?.facts.some(f => f.label.includes("factures"))).toBe(true);
  });
});
