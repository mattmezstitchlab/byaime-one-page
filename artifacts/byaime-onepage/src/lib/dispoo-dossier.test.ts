import { describe, expect, it } from "vitest";
import {
  dossierDayMs,
  dossierLogisticsFill,
  dossierMemberToProvider,
  dossierMergeUpdates,
  dossierMusicTracks,
  dossierStepMs,
  dossierStepToMoment,
  dossierSubtitle,
  dossierToProjectDraft,
  isDossierCandidate,
  metierToProvider,
  newDossierMoments,
  newDossierProviders,
  parseDispooDossierText,
  planDossierPropagation,
  type DispooDossierV1,
} from "./dispoo-dossier";
import { fact, type MusicTrack, type WorldProject } from "./types";

const SAMPLE = {
  kind: "dispoo/dossier-jour-j",
  version: 1,
  identity: { name: "Mariage de Léa & Hugo", date: "2027-08-14", city: "Bordeaux", venue: "Domaine des Cèdres" },
  team: [
    { metier: "Photographe", name: "Studio Lumière", contact: "bonjour@studio-lumiere.fr", status: "reserve", priceCents: 180000 },
    { metier: "Traiteur", name: "Maison Fournil" },
    { metier: "DJ" },
  ],
  rundown: [
    { time: "14:00", title: "Cérémonie", location: "Parc du domaine", durationMinutes: 45 },
    { time: "2027-08-14T20:30:00", title: "Dîner", detail: "Discours à 21h" },
    { time: "n'importe quand", title: "Étape floue" },
  ],
  logistics: { parking: "Parking visiteurs à 250 m.", accessibility: "", weatherFallback: "Repli sous la verrière." },
  budget: { total: 20000, currency: "eur" },
} as const;

const parseSample = () => {
  const parsed = parseDispooDossierText(JSON.stringify(SAMPLE));
  if (!parsed.ok) throw new Error(`échantillon invalide : ${parsed.errors.join(" / ")}`);
  return parsed.dossier;
};

const projectWith = (overrides: Partial<WorldProject> = {}): WorldProject =>
  ({
    providers: [],
    timeline: [],
    logistics: {
      accommodations: [],
      shuttles: [],
      parking: "",
      accessibility: "",
      weatherFallback: "",
      emergencyContacts: [],
      packing: [],
    },
    city: fact(null, "manquant"),
    venue: fact(null, "manquant"),
    budget: fact(null, "manquant"),
    ...overrides,
  }) as unknown as WorldProject;

describe("dossier Jour J", () => {
  it("accepte un dossier v1 complet", () => {
    const dossier = parseSample();
    expect(dossier.identity.name).toBe("Mariage de Léa & Hugo");
    expect(dossier.team).toHaveLength(3);
    expect(dossier.rundown).toHaveLength(3);
  });

  it("refuse ce qui n'est pas du JSON ou pas un dossier", () => {
    expect(parseDispooDossierText("ceci n'est pas du JSON")).toEqual({ ok: false, errors: ["notJson"] });
    expect(parseDispooDossierText(JSON.stringify({ kind: "autre", version: 1 }))).toEqual({
      ok: false,
      errors: ["notDossier"],
    });
  });

  it("refuse un dossier sans identité ni date lisible, en le disant", () => {
    const missing = parseDispooDossierText(JSON.stringify({ kind: "dispoo/dossier-jour-j", version: 1 }));
    expect(missing.ok).toBe(false);
    if (missing.ok) return;
    expect(missing.errors.some(issue => issue.startsWith("identity"))).toBe(true);

    const badDay = parseDispooDossierText(
      JSON.stringify({
        kind: "dispoo/dossier-jour-j",
        version: 1,
        identity: { name: "X", date: "quand il fera beau" },
      }),
    );
    expect(badDay.ok).toBe(false);
  });

  it("ne retient que les fichiers JSON comme candidats", () => {
    expect(isDossierCandidate("dossier.jourj.json", "application/json")).toBe(true);
    expect(isDossierCandidate("Dossier.JSON", "")).toBe(true);
    expect(isDossierCandidate("contrat.pdf", "application/pdf")).toBe(false);
    expect(isDossierCandidate("photo.jpg", "image/jpeg")).toBe(false);
  });

  it("lit le jour sans bascule de fuseau, et les horaires ISO comme HH:MM", () => {
    const dossier = parseSample();
    const dayMs = dossierDayMs(dossier);
    expect(dayMs).not.toBeNull();
    if (dayMs === null) return;
    const day = new Date(dayMs);
    expect([day.getFullYear(), day.getMonth(), day.getDate()]).toEqual([2027, 7, 14]);

    const ceremony = dossierStepMs(dossier.rundown[0]!, dayMs);
    expect(ceremony).not.toBeNull();
    if (ceremony === null) return;
    const at = new Date(ceremony);
    expect([at.getHours(), at.getMinutes()]).toEqual([14, 0]);

    expect(dossierStepMs(dossier.rundown[1]!, dayMs)).not.toBeNull();
    expect(dossierStepMs(dossier.rundown[2]!, dayMs)).toBeNull();
  });

  it("range chaque métier dans la bonne catégorie de prestataire", () => {
    expect(metierToProvider("Photographe")).toEqual({ category: "photo", role: "Photographe" });
    expect(metierToProvider("vidéaste")).toEqual({ category: "video", role: "Vidéaste" });
    expect(metierToProvider("  TRAITEUR ")).toEqual({ category: "traiteur", role: "TRAITEUR" });
    expect(metierToProvider("fleuriste")).toMatchObject({ category: "fleuriste" });
    expect(metierToProvider("DJ")).toMatchObject({ category: "musique" });
    expect(metierToProvider("château").category).toBe("lieu");
    expect(metierToProvider("célébrante").category).toBe("officiant");
    expect(metierToProvider("maquilleuse").category).toBe("beaute");
    expect(metierToProvider("navettes").category).toBe("transport");
    expect(metierToProvider("magicien close-up")).toMatchObject({ category: "autre", role: "Magicien close-up" });
  });

  it("convertit un membre en prestataire, réservé ou à trouver", () => {
    const dossier = parseSample();
    const booked = dossierMemberToProvider(dossier.team[0]!);
    expect(booked).toMatchObject({
      category: "photo",
      role: "Photographe",
      name: "Studio Lumière",
      contact: "bonjour@studio-lumiere.fr",
      status: "reserve",
      amountCents: 180000,
    });
    expect(dossierMemberToProvider(dossier.team[1]!).status).toBe("contacte");
    expect(dossierMemberToProvider(dossier.team[2]!)).toMatchObject({ category: "musique", status: "recherche" });
  });

  it("convertit une étape en Moment audience du Jour J, tracé intégration", () => {
    const dossier = parseSample();
    const dayMs = dossierDayMs(dossier)!;
    const time = dossierStepMs(dossier.rundown[0]!, dayMs)!;
    expect(dossierStepToMoment(dossier.rundown[0]!, time)).toMatchObject({
      time,
      kind: "evenement",
      title: "Cérémonie",
      location: "Parc du domaine",
      durationMinutes: 45,
      status: "prepare",
      phase: "pendant",
      visibility: "audience",
      provenance: "integration",
    });
  });

  it("prépare l'ébauche d'un Monde neuf, devise normalisée", () => {
    const draft = dossierToProjectDraft(parseSample());
    expect(draft.title).toBe("Mariage de Léa & Hugo");
    expect(draft.universe).toBe("Mariage");
    expect(draft.currency).toBe("EUR");
    expect(draft.city).toEqual(fact("Bordeaux", "confirme"));
    expect(draft.venue).toEqual(fact("Domaine des Cèdres", "confirme"));
    expect(draft.budget).toEqual(fact(20000, "confirme"));
    expect(draft.logistics?.parking).toBe("Parking visiteurs à 250 m.");
    expect(draft.logistics?.accessibility).toBe("");
  });

  it("ne propose que les prestataires et Moments vraiment nouveaux", () => {
    const dossier = parseSample();
    const project = projectWith({
      providers: [{ name: "studio lumière" }],
      timeline: [{ title: "Cérémonie", time: dossierStepMs(dossier.rundown[0]!, dossierDayMs(dossier)!) }],
    });
    expect(newDossierProviders(dossier, null)).toHaveLength(3);
    expect(newDossierProviders(dossier, project).map(member => member.metier)).toEqual(["Traiteur", "DJ"]);
    expect(newDossierMoments(dossier, null)).toHaveLength(2);
    expect(newDossierMoments(dossier, project).map(moment => moment.step.title)).toEqual(["Dîner"]);
  });

  it("ne remplit que les blancs, sans écraser les textes du couple", () => {
    const dossier = parseSample();
    expect(dossierLogisticsFill(dossier, null)).toEqual({
      parking: "Parking visiteurs à 250 m.",
      weatherFallback: "Repli sous la verrière.",
    });
    const project = projectWith({
      logistics: { parking: "Notre texte", accessibility: "", weatherFallback: "" },
      city: fact("Lille", "confirme"),
    });
    expect(dossierLogisticsFill(dossier, project)).toEqual({ weatherFallback: "Repli sous la verrière." });
    const updates = dossierMergeUpdates(dossier, project);
    expect(updates.city).toBeUndefined();
    expect(updates.venue).toEqual(fact("Domaine des Cèdres", "confirme"));
    expect(updates.budget).toEqual(fact(20000, "confirme"));
    expect(updates.logistics).toMatchObject({ parking: "Notre texte", weatherFallback: "Repli sous la verrière." });
  });

  it("planifie la création complète, étape floue signalée", () => {
    const dossier = parseSample();
    const plan = planDossierPropagation(dossier, null);
    const groups = plan.map(item => item.group);
    expect(groups.filter(group => group === "providers")).toHaveLength(3);
    expect(groups.filter(group => group === "moments")).toHaveLength(2);
    expect(groups).toContain("identity");
    expect(groups).toContain("logistics");
    expect(groups).toContain("budget");
    const skipped = plan.filter(item => item.group === "skipped");
    expect(skipped).toHaveLength(1);
    expect(skipped[0]).toMatchObject({ label: "Étape floue", reason: "badTime" });
    const create = plan.find(item => item.group === "identity");
    expect(create).toMatchObject({ action: "create", name: "Mariage de Léa & Hugo" });
  });

  it("planifie la fusion : compléments, doublons ignorés, rien d'écrasé", () => {
    const dossier = parseSample();
    const project = projectWith({
      city: fact("Lille", "confirme"),
      budget: fact(15000, "confirme"),
      providers: [{ name: "Studio Lumière" }],
    });
    const plan = planDossierPropagation(dossier, project);
    const labels = plan.map(item => item.group);
    expect(labels).toContain("providers");
    expect(labels).not.toContain("budget");
    expect(plan.filter(item => item.group === "skipped")).toHaveLength(4);
    const fill = plan.find(item => item.group === "identity");
    expect(fill).toMatchObject({ action: "fill", field: "venue", value: "Domaine des Cèdres" });
  });
});

/* La Carte AIME v1, une fois normalisée par l'import (champs optionnels du dossier). */
const CARTE_DOSSIER = (): DispooDossierV1 => ({
  kind: "dispoo/dossier-jour-j",
  version: 1,
  identity: { name: "Camille & Léo", date: "2027-08-14", city: "Lyon", venue: "Domaine du Bois", guests: 120 },
  team: [],
  rundown: [],
  budget: { total: 20000, currency: "EUR" },
  subtitle: "Notre mariage, le 14 août 2027 à Lyon",
  visual: "https://premier-site.fr/photo.jpg",
  music: { title: "Sign of the Times", artist: "Harry Styles", url: "https://open.spotify.com/track/x" },
});

describe("Carte AIME v1", () => {
  it("l'ébauche créée depuis la carte porte sous-titre et visuel", () => {
    const dossier = CARTE_DOSSIER();
    const draft = dossierToProjectDraft(dossier);
    expect(draft.title).toBe("Camille & Léo");
    expect(draft.subtitle).toBe("Notre mariage, le 14 août 2027 à Lyon");
    expect(draft.heroVisual).toEqual({ kind: "image", url: "https://premier-site.fr/photo.jpg" });
    expect(dossierSubtitle(dossier)).toBe("Notre mariage, le 14 août 2027 à Lyon");
  });

  it("la musique de la carte devient une piste « intégration », validée car l'artiste est connu", () => {
    const [track] = dossierMusicTracks(CARTE_DOSSIER(), null);
    expect(track).toMatchObject({ title: "Sign of the Times", artist: "Harry Styles", status: "valide", provenance: "integration" });
    expect(track?.notes).toContain("open.spotify.com");

    /* Sans artiste : à choisir — le parcours iTunes existant prend le relais. */
    const sansArtiste: DispooDossierV1 = { ...CARTE_DOSSIER(), music: { title: "Entrée", url: "https://youtu.be/x" } };
    const [bare] = dossierMusicTracks(sansArtiste, null);
    expect(bare).toMatchObject({ artist: "", status: "a_choisir" });
    expect(bare?.notes).toContain("https://youtu.be/x");

    /* Doublon (même titre, casse ou accents près) : aucune piste de plus. */
    const project = projectWith({
      music: [{ id: "m9", moment: "M", title: "sign of the times", artist: "HS", status: "valide" } as unknown as MusicTrack],
    });
    expect(dossierMusicTracks(CARTE_DOSSIER(), project)).toHaveLength(0);
  });

  it("la fusion complète les blancs (sous-titre, visuel, devise) sans rien écraser", () => {
    const dossier = CARTE_DOSSIER();
    const dejaRaconte = projectWith({
      guestsCount: fact(null, "manquant"),
      subtitle: "Déjà raconté",
      heroVisual: { kind: "image", url: "https://deja.fr/a.jpg" },
      currency: "USD",
    });
    const rien = dossierMergeUpdates(dossier, dejaRaconte);
    expect(rien.subtitle).toBeUndefined();
    expect(rien.heroVisual).toBeUndefined();
    expect(rien.currency).toBeUndefined();

    const applied = dossierMergeUpdates(dossier, projectWith({ guestsCount: fact(null, "manquant") }));
    expect(applied.subtitle).toBe("Notre mariage, le 14 août 2027 à Lyon");
    expect(applied.heroVisual).toEqual({ kind: "image", url: "https://premier-site.fr/photo.jpg" });
    expect(applied.currency).toBe("EUR");
  });

  it("le plan montre accroche, visuel et musique — rien ne s'applique en silence", () => {
    const plan = planDossierPropagation(CARTE_DOSSIER(), null);
    const fills = plan.filter(item => item.group === "identity" && item.action === "fill");
    expect(fills.map(item => ("field" in item ? item.field : ""))).toEqual(expect.arrayContaining(["subtitle", "visual"]));
    expect(plan.some(item => item.group === "music" && item.title === "Sign of the Times")).toBe(true);

    /* Sur un Monde déjà complet : doublons et déjà-remplis sont signalés. */
    const complete = projectWith({
      guestsCount: fact(120, "confirme"),
      subtitle: "x",
      heroVisual: { kind: "image", url: "https://deja.fr/a.jpg" },
      music: [{ id: "m1", moment: "M", title: "Sign of the Times", artist: "HS", status: "valide" } as unknown as MusicTrack],
    });
    const planFusion = planDossierPropagation(CARTE_DOSSIER(), complete);
    expect(planFusion.filter(item => item.group === "music")).toHaveLength(0);
    expect(planFusion.some(item => item.group === "skipped" && item.label === "Sign of the Times")).toBe(true);
    expect(planFusion.filter(item => item.group === "skipped" && item.reason === "filled").length).toBeGreaterThanOrEqual(2);
  });
});
