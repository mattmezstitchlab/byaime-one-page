import { describe, expect, it } from "vitest";
import { normalizeUniversalJson } from "./universal-import";
import { dossierDayMs, dossierToProjectDraft, planDossierPropagation } from "./dispoo-dossier";

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
