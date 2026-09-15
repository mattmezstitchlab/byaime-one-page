import { describe, expect, it } from "vitest";

import {
  DEMO_PHRASE,
  DAY_SHIFT_OPTIONS,
  demoWorld,
  bandeInstants,
  buildChapters,
  buildDayBande,
  buildBandeState,
  buildRegie,
  commitShift,
  daysUntil,
  declareDayDelay,
  listEngagements,
  markMomentDone,
  previewShift,
  projectFromPhrase,
  resolutionFor,
  settleEngagement,
  understoodFacts,
} from "./bande";
import { createInitialProject, parseIntention } from "./parser";
import { fact, type WorldProject } from "./types";

/*
 * Les contrôles de la Bande.
 *
 * Deux choses y sont défendues :
 *  1. **tout est dérivé** — aucun engagement, aucun nombre de la régie n'est
 *     saisi quelque part : ils sortent du `WorldProject`, donc régler une ligne
 *     change le chiffre en haut de l'écran ;
 *  2. **rien n'est écrit sans confirmation** — décaler un Moment montre d'abord
 *     ce que ça décale.
 *
 * Le pivot est fixé à minuit, comme le germe le construit : les Moments du Jour J
 * sont placés en `pivot + heures` (`seed-data.ts:91` et suivantes).
 */

const HOUR = 3_600_000;
const DAY = 86_400_000;
/** Samedi 12 juin 2027, minuit. */
const PIVOT = new Date(2027, 5, 12, 0, 0, 0).getTime();
const PHRASE = "Mariage le samedi 12 juin 2027, 120 invités, budget 30 000 €";

function fixture(pivot: number = PIVOT): WorldProject {
  const draft = parseIntention(PHRASE);
  return createInitialProject(
    { ...draft, universe: "Mariage", pivot: fact(pivot, "confirme") },
    PHRASE,
    { persona: "couple" },
  );
}

/** `Intl.NumberFormat` en français sépare les milliers par une espace fine
    insécable (U+202F) et colle le symbole avec une espace insécable (U+00A0) :
    les assertions se lisent mieux une fois les deux normalisées. */
const eur = (value: string) => value.replace(/[\u202f\u00a0]/g, " ");

const figure = (project: WorldProject, id: string, now: number) =>
  buildRegie(project, now).find(item => item.id === id);

describe("les trois résolutions suivent la date, pas les clics", () => {
  it("montre la forme du mariage tant qu'on est loin", () => {
    expect(resolutionFor(PIVOT, PIVOT - 400 * DAY)).toBe("mois");
    expect(resolutionFor(PIVOT, PIVOT - 60 * DAY)).toBe("mois");
  });

  it("montre les engagements pendant le dernier mois", () => {
    expect(resolutionFor(PIVOT, PIVOT - 30 * DAY)).toBe("engagements");
    expect(resolutionFor(PIVOT, PIVOT - 8 * DAY)).toBe("engagements");
    expect(resolutionFor(PIVOT, PIVOT - 2 * DAY)).toBe("engagements");
  });

  it("passe en régie de la veille au surlendemain", () => {
    expect(resolutionFor(PIVOT, PIVOT - 1 * DAY)).toBe("minutes");
    expect(resolutionFor(PIVOT, PIVOT + 16 * HOUR)).toBe("minutes");
    expect(resolutionFor(PIVOT, PIVOT + 2 * DAY)).toBe("minutes");
  });

  it("revient aux chapitres après le Jour J : la Bande continue", () => {
    expect(resolutionFor(PIVOT, PIVOT + 10 * DAY)).toBe("mois");
  });

  it("compte des jours calendaires, pas des tranches de 24 heures", () => {
    // 23 h la veille : il reste un jour, pas zéro.
    expect(daysUntil(PIVOT, PIVOT - HOUR)).toBe(1);
    expect(daysUntil(PIVOT, PIVOT)).toBe(0);
    expect(daysUntil(PIVOT, PIVOT - 400 * DAY)).toBe(400);
  });
});

describe("la régie : cinq nombres dérivés, aucune saisie", () => {
  const project = fixture();
  const now = PIVOT - 100 * DAY;

  it("nomme les cinq figures, dans l'ordre de lecture", () => {
    expect(buildRegie(project, now).map(item => item.id)).toEqual([
      "jours",
      "argent",
      "a-payer",
      "invites",
      "prestataires",
    ]);
  });

  it("compte les jours restants et la date du Jour J", () => {
    const jours = figure(project, "jours", now)!;
    expect(jours.value).toBe("100");
    expect(jours.label).toBe("Jours restants");
    expect(jours.detail).toContain("juin 2027");
  });

  it("additionne les devis des prestataires, et dit ce qui est déjà versé", () => {
    // Lieu 4 500 € + traiteur 8 500 € = 13 000 € engagés ; 1 500 € d'acompte versé.
    const argent = figure(project, "argent", now)!;
    expect(eur(argent.value)).toContain("13 000");
    expect(eur(argent.detail)).toContain("30 000");
    expect(eur(argent.detail)).toContain("1 500");
    expect(argent.alert).toBeFalsy();
  });

  it("isole ce qui doit être payé avant le Jour J", () => {
    const aPayer = figure(project, "a-payer", now)!;
    expect(eur(aPayer.value)).toContain("3 000");
    expect(aPayer.detail).toBe("aucune échéance dépassée");
    expect(aPayer.alert).toBeFalsy();
  });

  it("alerte quand une échéance est dépassée", () => {
    const late = PIVOT - 10 * DAY; // le solde du lieu est dû à J-30
    const aPayer = figure(project, "a-payer", late)!;
    expect(aPayer.detail).toBe("1 échéance dépassée");
    expect(aPayer.alert).toBe(true);
  });

  it("compte les réponses, sans confondre foyer et personne", () => {
    const invites = figure(project, "invites", now)!;
    expect(invites.value).toBe("3 / 120");
    expect(invites.detail).toBe("2 réponses en attente");
  });

  it("compte les prestataires verrouillés et alerte quand aucun ne l'est", () => {
    const project2 = fixture();
    const prestataires = figure(project2, "prestataires", now)!;
    expect(prestataires.value).toBe("1 / 5");
    expect(prestataires.alert).toBeFalsy();
    const sansReserve = { ...project2, providers: project2.providers.map(item => ({ ...item, status: "recherche" as const })) };
    expect(figure(sansReserve, "prestataires", now)!.alert).toBe(true);
  });
});

describe("les engagements : dérivés du graphe, jamais ressaisis", () => {
  const project = fixture();

  it("reprend le solde dû, les réponses manquantes, les tâches ouvertes et ce qui manque", () => {
    const engagements = listEngagements(project, PIVOT - 40 * DAY);
    const labels = engagements.map(item => item.label);
    expect(labels).toContain("Solde Lieu");
    expect(labels).toContain("Marie Laurent");
    expect(labels).toContain("Réserver le photographe");
    expect(labels).toContain("Adresse définitive du lieu");
  });

  it("n'y remet jamais ce qui est déjà réglé", () => {
    const labels = listEngagements(project, PIVOT - 40 * DAY).map(item => item.label);
    expect(labels).not.toContain("Acompte Lieu"); // payé
    expect(labels).not.toContain("Définir le budget global"); // terminée
    expect(labels).not.toContain("Sophie Martin"); // déjà confirmée
  });

  it("met le retard en tête, puis la semaine, puis la suite", () => {
    const engagements = listEngagements(project, PIVOT - 10 * DAY);
    const rank = { retard: 0, semaine: 1, suite: 2 } as const;
    const ranks = engagements.map(item => rank[item.urgency]);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(engagements[0].urgency).toBe("retard");
  });

  it("règle un paiement : la ligne disparaît et la régie bouge — même donnée", () => {
    const now = PIVOT - 40 * DAY;
    const solde = listEngagements(project, now).find(item => item.label === "Solde Lieu")!;
    const regle = settleEngagement(project, solde);
    expect(listEngagements(regle, now).map(item => item.label)).not.toContain("Solde Lieu");
    expect(eur(figure(regle, "a-payer", now)!.value)).toBe("0 €");
    expect(eur(figure(regle, "argent", now)!.detail)).toContain("4 500");
  });

  it("règle une réponse, une tâche, un prestataire, une information manquante", () => {
    const now = PIVOT - 40 * DAY;
    const engagements = listEngagements(project, now);
    const apresRsvp = settleEngagement(project, engagements.find(item => item.label === "Marie Laurent")!);
    expect(figure(apresRsvp, "invites", now)!.value).toBe("4 / 120");

    const apresTache = settleEngagement(project, engagements.find(item => item.label === "Réserver le photographe")!);
    expect(listEngagements(apresTache, now).map(item => item.label)).not.toContain("Réserver le photographe");

    const apresPrestataire = settleEngagement(project, engagements.find(item => item.kind === "prestataire")!);
    expect(apresPrestataire.providers.filter(item => item.status === "reserve").length).toBe(2);

    const apresManque = settleEngagement(project, engagements.find(item => item.kind === "manque")!);
    expect(apresManque.missing.length).toBe(project.missing.length - 1);
  });
});

describe("la Bande en mois : les chapitres, et qui a le droit de les voir", () => {
  const project = fixture();

  it("montre chaque Moment une fois, dans l'ordre, sous son chapitre", () => {
    const chapters = buildChapters(project, "owner");
    const moments = chapters.flatMap(chapter => chapter.moments);
    expect(moments.length).toBe(project.timeline.length);
    expect(new Set(moments.map(item => item.event.id)).size).toBe(project.timeline.length);
    const times = moments.map(item => item.event.time);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(chapters.every(chapter => chapter.moments.length > 0)).toBe(true);
    expect(chapters.map(chapter => chapter.chapter)).toContain("La cérémonie");
  });

  it("nomme les familles liées à un Moment, sans ouvrir le nœud", () => {
    const engagement = buildChapters(project, "owner")
      .flatMap(chapter => chapter.moments)
      .find(moment => moment.event.id === "dj3")!;
    expect(engagement.relations.map(item => item.family)).toEqual(["Invité", "Prestataire", "Musique"]);
    expect(engagement.relations.every(item => item.visible)).toBe(true);
  });

  it("masque ce qu'un invité n'a pas le droit de voir, et dit pourquoi", () => {
    // Rien n'est publié dans le germe : un invité ne voit aucun Moment. C'est le
    // modèle de visibilité qui le dit, pas un écran vide par accident.
    const viewer = buildChapters(project, "viewer");
    expect(viewer.flatMap(chapter => chapter.moments).every(moment => !moment.visible)).toBe(true);
    expect(viewer.flatMap(chapter => chapter.moments)[0].maskedReason).toBe("Non publié aux invités");

    const family = buildChapters(project, "family");
    expect(family.flatMap(chapter => chapter.moments).every(moment => moment.visible)).toBe(true);
  });

  it("signale la confiance quand AIME a proposé plutôt que constaté", () => {
    const moments = buildChapters(project, "owner").flatMap(chapter => chapter.moments);
    expect(moments.find(moment => moment.event.id === "t1")!.confidence).toBeUndefined(); // confirmé
    expect(moments.find(moment => moment.event.confidence === "suggere")!.confidence).toBe("Suggéré");
  });
});

describe("la Bande en minutes : la régie du Jour J", () => {
  const project = fixture();
  const now = PIVOT + 16.5 * HOUR;

  it("sait ce qui est en cours, ce qui vient, et à quelle heure", () => {
    const day = buildDayBande(project, "owner", now);
    expect(day.snapshot.live?.title).toBe("L'engagement");
    expect(day.snapshot.next?.title).toBe("La sortie");
    const live = day.moments.find(moment => moment.event.id === "dj3")!;
    expect(live.state).toBe("live");
    expect(live.clock).toBe("16:00");
    // Rien n'a été terminé : ce qui est passé reste en retard, il ne disparaît
    // jamais silencieusement (règle de `annotateDayRun`).
    expect(day.moments.find(moment => moment.event.id === "dj2")!.state).toBe("late");
    expect(day.snapshot.firstLate?.title).toBe("Réveil");
  });

  it("donne le compte à rebours du Moment suivant", () => {
    const day = buildDayBande(project, "owner", PIVOT + 15 * HOUR);
    const next = day.moments.find(moment => moment.event.id === day.snapshot.next?.id)!;
    expect(next.countdown).toBeTruthy();
  });

  it("termine un Moment : ce qui est passé cesse d'être en retard", () => {
    const done = markMomentDone(project, "dj2");
    const day = buildDayBande(done, "owner", now);
    expect(day.moments.find(moment => moment.event.id === "dj2")!.state).toBe("done");
    expect(day.snapshot.doneCount).toBe(1);
  });

  it("déclare un retard : la suite du déroulé glisse avec lui", () => {
    const delay = DAY_SHIFT_OPTIONS[1]; // +20 min
    const { project: shifted, affectedIds } = declareDayDelay(project, "dj3", delay.minutes);
    const source = shifted.timeline.find(event => event.id === "dj3")!;
    expect(source.time).toBe(project.timeline.find(event => event.id === "dj3")!.time + 20 * 60_000);
    expect(source.delayMinutes).toBe(20);
    expect(affectedIds.length).toBeGreaterThan(1);
    expect(shifted.timeline.find(event => event.id === "dj5")!.time).toBe(
      project.timeline.find(event => event.id === "dj5")!.time + 20 * 60_000,
    );
  });
});

describe("décaler un Moment : montrer la conséquence avant d'écrire", () => {
  const project = fixture();

  it("annonce les Moments qui suivraient, sans rien modifier", () => {
    const plan = previewShift(project, "dj1", 60)!;
    expect(plan.requiresConfirmation).toBe(true);
    expect(plan.dependentChanges.map(change => change.eventId)).toContain("dj3");
    expect(plan.dependentChanges[0].nextTime - plan.dependentChanges[0].currentTime).toBe(60 * 60_000);
    // L'aperçu ne touche pas au projet.
    expect(project.timeline.find(event => event.id === "dj3")!.time).toBe(PIVOT + 16 * HOUR);
  });

  it("n'écrit que les dépendants retenus", () => {
    const plan = previewShift(project, "dj1", 60)!;
    const applied = commitShift(project, plan, []);
    expect(applied.timeline.find(event => event.id === "dj1")!.time).toBe(PIVOT + 11 * HOUR);
    expect(applied.timeline.find(event => event.id === "dj3")!.time).toBe(PIVOT + 16 * HOUR);
  });

  it("n'écrit que ce qui est confirmé, et seulement les dépendants retenus", () => {
    const plan = previewShift(project, "dj1", 60)!;
    const applied = commitShift(project, plan, plan.dependentChanges.map(change => change.eventId));
    expect(applied.timeline.find(event => event.id === "dj1")!.time).toBe(PIVOT + 11 * HOUR);
    expect(applied.timeline.find(event => event.id === "dj3")!.time).toBe(PIVOT + 17 * HOUR);
    expect(applied.timeline.find(event => event.id === "dj3")!.propagation?.state).toBe("applied");
  });

  it("ne propose rien pour un décalage nul", () => {
    expect(previewShift(project, "dj1", 0)).toBeNull();
    expect(previewShift(project, "inconnu", 30)).toBeNull();
  });
});

describe("la phrase : un seul point d'entrée", () => {
  it("construit un Monde entier depuis une phrase", () => {
    const project = projectFromPhrase(DEMO_PHRASE);
    expect(project.universe).toBe("Mariage");
    expect(project.timeline.length).toBeGreaterThan(40);
    expect(project.guestsCount.value).toBe(120);
    expect(project.budget.value).toBe(30000);
  });

  it("dit ce qu'elle a compris, et ce qu'elle n'a pas compris", () => {
    const facts = understoodFacts(projectFromPhrase(DEMO_PHRASE));
    const jour = facts.find(item => item.id === "pivot")!;
    expect(jour.confidence).toBe("Confirmé");
    expect(jour.needsAction).toBe(false);
    const ville = facts.find(item => item.id === "city")!;
    expect(ville.value).toBe("—");
    expect(ville.confidence).toBe("Manquant");
    expect(ville.needsAction).toBe(true);
  });
});

describe("le Monde de démonstration", () => {
  it("pose un Jour J stable, à ~10 mois, et une phrase qui dit la même date", () => {
    const now = new Date(2026, 8, 14, 10, 0, 0).getTime();
    const { project, phrase } = demoWorld(now);
    expect(project.pivot.value).toBe(new Date(2027, 6, 14, 0, 0, 0).getTime());
    expect(daysUntil(project.pivot.value, now)).toBe(303);
    expect(resolutionFor(project.pivot.value, now)).toBe("mois");
    // La phrase affichée et la donnée doivent dire le même jour.
    expect(phrase).toContain("juillet 2027");
    expect(project.guestsCount.value).toBe(120);
    expect(project.timeline.length).toBeGreaterThan(40);
  });
});

describe("l'écran entier se dérive d'un projet, d'un rôle et d'un instant", () => {
  it("assemble régie, chapitres, Jour J et engagements", () => {
    const project = fixture();
    const state = buildBandeState(project, "owner", PIVOT - 100 * DAY);
    expect(state.automatic).toBe("mois");
    expect(state.resolution).toBe("mois");
    expect(state.days).toBe(100);
    expect(state.regie.length).toBe(5);
    expect(state.chapters.length).toBeGreaterThan(5);
    expect(state.day.snapshot.ordered.length).toBeGreaterThan(10);
    expect(state.engagements.length).toBeGreaterThan(5);
    expect(state.totalCount).toBe(project.timeline.length);
    expect(state.visibleCount).toBe(project.timeline.length);
  });

  it("reste forçable : personne n'est privé du Jour J six mois avant", () => {
    const state = buildBandeState(fixture(), "owner", PIVOT - 180 * DAY, "minutes");
    expect(state.automatic).toBe("mois");
    expect(state.resolution).toBe("minutes");
  });

  it("compte ce que le rôle a le droit de voir", () => {
    const state = buildBandeState(fixture(), "viewer", PIVOT - 100 * DAY);
    expect(state.visibleCount).toBe(0);
    expect(state.totalCount).toBeGreaterThan(0);
  });
});

/*
 * Les repères « voyager dans le temps » de la Bande : les deux instants du
 * Jour J suivent l'ancre cérémonie de la Timeline générée, au lieu des
 * heures fixes héritées de l'ancien germe (pivot + 16,5 h / + 22 h).
 */
describe("bandeInstants — les repères du Jour J suivent l'ancre cérémonie", () => {
  const HOUR = 3_600_000;
  /** Samedi 12 juin 2027, minuit local (le pivot de la démo). */
  const MINUIT = new Date(2027, 5, 12, 0, 0, 0, 0).getTime();
  /** Le même jour à 12 h : ce que le parseur pose quand l'heure n'est pas dite. */
  const MIDI = new Date(2027, 5, 12, 12, 0, 0, 0).getTime();
  const worldFrom = (phrase: string, pivot: number): WorldProject =>
    createInitialProject(
      { ...parseIntention(phrase), universe: "Mariage", pivot: fact(pivot, "confirme") },
      phrase,
      { persona: "couple" },
    );

  it("démo (pivot à minuit) : valeurs et libellés historiques inchangés", () => {
    const instants = bandeInstants(fixture(MINUIT), MINUIT);
    const ceremonie = instants.find(item => item.id === "ceremonie")!;
    const soiree = instants.find(item => item.id === "soiree")!;
    expect(ceremonie.at).toBe(MINUIT + 16.5 * HOUR);
    expect(ceremonie.label).toBe("Le Jour J, 16 h 30");
    expect(soiree.at).toBe(MINUIT + 22 * HOUR);
    expect(soiree.label).toBe("Le Jour J, 22 h");
    expect(instants.find(item => item.id === "veille")!.at).toBe(MINUIT - 6 * HOUR);
    expect(instants.find(item => item.id === "dernier-mois")!.at).toBe(MINUIT - 21 * DAY + 9 * HOUR);
  });

  it("pivot à 12 h (le parseur) : les repères restent le jour du Jour J", () => {
    const project = worldFrom("Mariage le samedi 12 juin 2027, 120 invités, budget 30 000 €", MIDI);
    const ceremonie = bandeInstants(project, MIDI).find(item => item.id === "ceremonie")!;
    // Avant : pivot + 16,5 h = le lendemain 4 h 30, sous un libellé « 16 h 30 ».
    expect(new Date(ceremonie.at).getDate()).toBe(12);
    expect(ceremonie.at).toBe(MIDI + 4.5 * HOUR); // 16 h 30, jour du pivot
    expect(ceremonie.label).toBe("Le Jour J, 16 h 30");
  });

  it("cérémonie à 15h : les repères suivent l'ancre générée, en cohérence avec la Timeline", () => {
    const project = worldFrom("Mariage le samedi 12 juin 2027, cérémonie à 15h, 120 invités", MIDI);
    expect(project.timeline.find(event => event.id === "dj3")!.time).toBe(MIDI + 3 * HOUR);
    const instants = bandeInstants(project, MIDI);
    const ceremonie = instants.find(item => item.id === "ceremonie")!;
    const soiree = instants.find(item => item.id === "soiree")!;
    expect(ceremonie.at).toBe(MIDI + 3.5 * HOUR); // 15 h 30 : la cérémonie est lancée
    expect(ceremonie.label).toBe("Le Jour J, 15 h 30");
    expect(soiree.at).toBe(MIDI + 9 * HOUR);      // 21 h : ancre + 6 h, comme avant
    expect(soiree.label).toBe("Le Jour J, 21 h");
  });

  it("sans Moment de cérémonie : repli sur le comportement historique", () => {
    const project = { ...fixture(MINUIT), timeline: [] };
    const instants = bandeInstants(project as WorldProject, MINUIT);
    expect(instants.find(item => item.id === "ceremonie")!.at).toBe(MINUIT + 16.5 * HOUR);
    expect(instants.find(item => item.id === "soiree")!.at).toBe(MINUIT + 22 * HOUR);
  });
});
