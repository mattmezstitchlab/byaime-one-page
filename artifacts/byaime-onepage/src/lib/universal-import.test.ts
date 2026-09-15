import { describe, expect, it } from "vitest";
import { normalizeUniversalJson, parseCarteText } from "./universal-import";
import { dossierDayMs, dossierToProjectDraft, planDossierPropagation } from "./dispoo-dossier";

/* La Carte AIME v1 telle que le premier site l'exportera (schéma flat validé). */
const CARTE_AIME = {
  kind: "carte-aime",
  version: 1,
  name: "Camille Dupont & Léo Martin",
  headline: "Notre mariage, le 14 août 2027 à Lyon",
  bio: "Deux rencontres, une histoire.",
  image_url: "https://premier-site.fr/photo.jpg",
  category: "couple",
  skills: [],
  city: "Lyon",
  wedding_date: "2027-08-14",
  venue: "Domaine du Bois",
  guests: 120,
  budget: 20000,
  currency: "EUR",
  music: { title: "Sign of the Times", artist: "Harry Styles", url: "https://open.spotify.com/track/x" },
};

const FRENCH_SITE = {
  mariage: {
    nom: "Léa & Hugo",
    date: "14/08/2027",
    ville: "Bordeaux",
    lieu: "Domaine des Cèdres",
    invites: 120,
    prestataires: [
      { role: "Photographe", nom: "Studio Lumière", email: "bonjour@studio-lumiere.fr", statut: "Confirmé" },
      { metier: "Traiteur", prix: 9000 },
    ],
    programme: [
      { heure: "14:00", titre: "Cérémonie", lieu: "Parc" },
      { heure: "20:30", titre: "Dîner" },
    ],
    budget_total: 24000,
  },
};

const ENGLISH_FLAT = {
  title: "Emma & James",
  weddingDate: "2028-06-10",
  city: "London",
  vendors: [{ category: "photo", company: "Bright Studio", priceCents: 150000 }],
  schedule: [{ time: "2028-06-10T16:00:00", title: "Ceremony" }],
};

describe("import universel", () => {
  it("reconnaît un JSON de site français imbriqué", () => {
    const result = normalizeUniversalJson(FRENCH_SITE, "export.json");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.dossier.identity).toMatchObject({ name: "Léa & Hugo", date: "2027-08-14", city: "Bordeaux", venue: "Domaine des Cèdres", guests: 120 });
    expect(result.dossier.team).toHaveLength(2);
    expect(result.dossier.team[0]).toMatchObject({ metier: "Photographe", name: "Studio Lumière", contact: "bonjour@studio-lumiere.fr", status: "reserve" });
    expect(result.dossier.rundown.map(step => step.title)).toEqual(["Cérémonie", "Dîner"]);
    expect(result.dossier.budget).toEqual({ total: 24000 });
  });

  it("ignore un prix ambigu au lieu de l'inventer, en le signalant", () => {
    const result = normalizeUniversalJson(FRENCH_SITE, "export.json");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.dossier.team[1]).not.toHaveProperty("priceCents");
    expect(result.dropped).toContainEqual({ label: "prix de Traiteur", reason: "unmapped" });
  });

  it("reconnaît un JSON anglais à plat, centimes explicites repris", () => {
    const result = normalizeUniversalJson(ENGLISH_FLAT, "export.json");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.dossier.identity.name).toBe("Emma & James");
    expect(result.dossier.team[0]).toMatchObject({ name: "Bright Studio", priceCents: 150000 });
    expect(result.dossier.rundown).toHaveLength(1);
    expect(result.dropped).toHaveLength(0);
  });

  it("repère les tableaux par leur structure, sans clé connue", () => {
    const result = normalizeUniversalJson(
      { titre: "Sara & Louis", date: "2027-09-04", moments_cles: [{ heure: "11:00", titre: "Mairie" }] },
      "export.json",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.dossier.rundown.map(step => step.title)).toEqual(["Mairie"]);
  });

  it("prend le nom du fichier quand le JSON n'a pas de nom", () => {
    const result = normalizeUniversalJson({ date: "2027-10-02", programme: [{ heure: "12:00", titre: "Vin d'honneur" }] }, "领衔.json");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.dossier.identity.name).toBe("领衔");
  });

  it("lit les timestamps et les statuts inconnus sans broncher", () => {
    const result = normalizeUniversalJson(
      {
        nom: "Nora & Adam",
        date: 1785758400,
        prestataires: [{ metier: "DJ", statut: "en pourparlers" }],
      },
      "export.json",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.dossier.identity.date).toBe("2026-08-03");
    expect(result.dossier.team[0]).not.toHaveProperty("status");
  });

  it("refuse sans date, sans rien de reconnaissable, ou hors objet", () => {
    expect(normalizeUniversalJson({ nom: "Sans date", prestataires: [{ metier: "DJ" }] }, "x.json").ok).toBe(false);
    expect(normalizeUniversalJson({ date: "2027-08-14", divers: { a: 1 } }, "x.json").ok).toBe(false);
    expect(normalizeUniversalJson([{ heure: "12:00" }], "x.json").ok).toBe(false);
    expect(normalizeUniversalJson("chaine", "x.json").ok).toBe(false);
  });

  it("produit un dossier qui suit le chemin standard (plan + ébauche)", () => {
    const result = normalizeUniversalJson(FRENCH_SITE, "export.json");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(dossierDayMs(result.dossier)).not.toBeNull();
    const plan = planDossierPropagation(result.dossier, null);
    expect(plan.filter(item => item.group === "providers")).toHaveLength(2);
    expect(plan.filter(item => item.group === "moments")).toHaveLength(2);
    const draft = dossierToProjectDraft(result.dossier);
    expect(draft.title).toBe("Léa & Hugo");
    expect(draft.guestsCount).toEqual({ value: 120, confidence: "confirme" });
    expect(draft.budget).toEqual({ value: 24000, confidence: "confirme" });
  });
});

describe("Carte AIME v1", () => {
  it("lit la carte complète : identité, accroche, visuel, devise, musique", () => {
    const result = normalizeUniversalJson(CARTE_AIME, "carte-aime.json");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.dossier.identity).toMatchObject({
      name: "Camille Dupont & Léo Martin",
      date: "2027-08-14",
      city: "Lyon",
      venue: "Domaine du Bois",
      guests: 120,
    });
    expect(result.dossier.budget).toEqual({ total: 20000, currency: "EUR" });
    expect(result.dossier.subtitle).toBe("Notre mariage, le 14 août 2027 à Lyon");
    expect(result.dossier.visual).toBe("https://premier-site.fr/photo.jpg");
    expect(result.dossier.music).toMatchObject({ title: "Sign of the Times", artist: "Harry Styles", url: "https://open.spotify.com/track/x" });
    /* L'enveloppe (kind/version) et le contexte sans destination v1
       (category, skills) sont ignorés proprement, jamais inventés. */
    expect(result.dropped).toEqual([]);
  });

  it("l'accroche seule suffit, et la bio prend le relais sans headline", () => {
    const bio = normalizeUniversalJson({ name: "N&A", wedding_date: "2027-08-14", bio: "Notre histoire." }, "carte.json");
    expect(bio.ok).toBe(true);
    if (bio.ok) expect(bio.dossier.subtitle).toBe("Notre histoire.");
  });

  it("l'accroche ne devient jamais le nom, même seule", () => {
    const result = normalizeUniversalJson({ headline: "Une accroche", wedding_date: "2027-08-14" }, "carte.json");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.dossier.identity.name).toBe("carte");
    expect(result.dossier.subtitle).toBe("Une accroche");
  });

  it("le sous-titre ne prend pas la place du titre", () => {
    /* « subtitle » contient « title » : sans filtre, il éclipserait le nom. */
    const result = normalizeUniversalJson(
      { title: "Le vrai nom", subtitle: "Un sous-titre", wedding_date: "2027-08-14" },
      "carte.json",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.dossier.identity.name).toBe("Le vrai nom");
    expect(result.dossier.subtitle).toBe("Un sous-titre");
  });

  it("une devise racine sans budget voyage quand même jusqu'au Monde", () => {
    const result = normalizeUniversalJson({ name: "N&A", wedding_date: "2027-08-14", headline: "Bonjour", currency: "chf" }, "carte.json");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.dossier.budget).toEqual({ currency: "chf" });
  });

  it("ni nom ni signal reconnaissable : la carte est refusée, rien n'est inventé", () => {
    const result = normalizeUniversalJson({ wedding_date: "2027-08-14", category: "couple", skills: ["photo"] }, "carte.json");
    expect(result.ok).toBe(false);
  });
});

describe("parseCarteText — une seule lecture, tous transports", () => {
  it("lit la carte collée comme le fichier : même résultat, même source", () => {
    const pasted = parseCarteText(JSON.stringify(CARTE_AIME), "carte-aime.json");
    expect(pasted.ok).toBe(true);
    if (!pasted.ok) return;
    expect(pasted.source).toBe("universal");
    expect(pasted.dossier.identity.name).toBe("Camille Dupont & Léo Martin");

    /* Un vrai Dossier Jour J reste reconnu comme tel (source « dispoo »). */
    const dossier = JSON.stringify({ kind: "dispoo/dossier-jour-j", version: 1, identity: { name: "L&A", date: "2027-08-14" } });
    const strict = parseCarteText(dossier, "dossier.json");
    expect(strict.ok).toBe(true);
    if (strict.ok) expect(strict.source).toBe("dispoo");
  });

  it("un texte vide ou illisible est refusé sans lever", () => {
    expect(parseCarteText("", "carte.json").ok).toBe(false);
    expect(parseCarteText("   ", "carte.json").ok).toBe(false);
    expect(parseCarteText("pas du json", "carte.json").ok).toBe(false);
  });
});
