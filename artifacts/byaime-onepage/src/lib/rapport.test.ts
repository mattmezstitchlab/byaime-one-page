import { describe, expect, it } from "vitest";
import { buildRapport } from "./rapport";
import type { WorldProject } from "@/lib/types";

const DAY = 86_400_000;
const NOW = Date.UTC(2027, 5, 1, 12, 0, 0);

const project = {
  id: "p1",
  title: "Camille et Jules",
  currency: "EUR",
  pivot: { value: NOW + 30 * DAY },
  timeline: [
    { id: "e2", title: "Cérémonie", time: NOW + 30 * DAY, phase: "pendant", kind: "evenement", status: "prepare", confidence: "confirme", universe: "vie", visibility: "audience", location: "Salle des fêtes" },
    { id: "e1", title: "Dégustation", time: NOW + 9 * DAY, phase: "avant", kind: "evenement", status: "prepare", confidence: "confirme", universe: "vie", visibility: "equipe" },
    { id: "sansDate", title: "Sans heure", time: Number.NaN, phase: "avant", kind: "evenement", status: "prepare", confidence: "confirme", universe: "vie", visibility: "equipe" },
  ],
  tasks: [
    { id: "t1", title: "Relancer le traiteur", phase: "3-6m", status: "en_cours", priority: "haute", dueDate: NOW - DAY },
    { id: "t2", title: "Sans échéance", phase: "6-12m", status: "a_faire", priority: "normale" },
    { id: "t3", title: "Fait", phase: "12m+", status: "termine", priority: "basse", dueDate: NOW - 10 * DAY },
  ],
  documents: [
    { id: "d2", title: "Facture acompte", kind: "facture", at: NOW - 1 * DAY },
    { id: "d1", title: "Contrat salle", kind: "contrat", at: NOW - 5 * DAY },
    { id: "d3", title: "Sans horodatage", kind: "autre", at: Number.NaN },
  ],
  payments: [
    { id: "pay1", label: "Acompte salle", amountCents: 100_000, at: NOW - 2 * DAY, state: "paye" },
    { id: "pay2", label: "Solde traiteur", amountCents: 620_000, at: NOW - DAY, state: "du", dueDate: NOW + 20 * DAY },
  ],
  providers: [
    { id: "pr1", category: "traiteur", role: "Traiteur", status: "devis", amountCents: 620_000 },
    { id: "pr2", category: "lieu", role: "Salle", name: "Salle des fêtes", status: "reserve", amountCents: 200_000 },
  ],
  guests: [
    { id: "g1", name: "Camille", role: "invite", rsvp: "confirme" },
    { id: "g2", name: "Jules", role: "invite", rsvp: "en_attente" },
  ],
} as unknown as WorldProject;

describe("buildRapport (présenté automatiquement, rien de ressaisi)", () => {
  it("déroule le Jour J trié par heure réelle, sans le non daté", () => {
    const rapport = buildRapport(project, NOW);

    expect(rapport.moments.map(m => m.title)).toEqual(["Dégustation", "Cérémonie"]);
    expect(rapport.moments[1].location).toBe("Salle des fêtes");
  });

  it("additionne l'argent : engagé, payé, échu, restant", () => {
    const rapport = buildRapport(project, NOW);

    expect(rapport.budget?.engagedCents).toBe(820_000);
    expect(rapport.budget?.paidCents).toBe(100_000);
    expect(rapport.budget?.dueCents).toBe(620_000);
    expect(rapport.budget?.remainingCents).toBe(720_000);
  });

  it("liste les prestataires du plus engagé au moins engagé", () => {
    const rapport = buildRapport(project, NOW);

    expect(rapport.budget?.rows.map(r => r.name)).toEqual(["Traiteur", "Salle des fêtes"]);
  });

  it("compte invités et tâches tels que posés, le retard sur échéance réelle", () => {
    const rapport = buildRapport(project, NOW);

    expect(rapport.invites).toEqual({ total: 2, confirmed: 1, waiting: 1, declined: 0 });
    expect(rapport.tasks).toEqual({ total: 3, done: 1, open: 2, late: 1 });
  });

  it("trie les documents par date réelle", () => {
    const rapport = buildRapport(project, NOW);

    expect(rapport.documents.map(d => d.title)).toEqual(["Contrat salle", "Facture acompte"]);
  });

  it("fait disparaître les sections vides", () => {
    const vide = {
      ...project,
      timeline: [],
      tasks: [],
      guests: [],
      documents: [],
      payments: [],
      providers: [],
    } as unknown as WorldProject;
    const rapport = buildRapport(vide, NOW);

    expect(rapport.moments).toEqual([]);
    expect(rapport.budget).toBeNull();
    expect(rapport.invites).toBeNull();
    expect(rapport.tasks).toBeNull();
    expect(rapport.documents).toEqual([]);
  });
});
