import { describe, expect, it } from "vitest";
import { buildFrise } from "./frise";
import type { WorldProject } from "@/lib/types";

const DAY = 86_400_000;
const NOW = Date.UTC(2027, 5, 1, 12, 0, 0);

const project = {
  id: "p1",
  currency: "EUR",
  pivot: { value: NOW + 30 * DAY },
  timeline: [
    { id: "e1", title: "Dégustation", time: NOW + 9 * DAY, phase: "avant", kind: "evenement", status: "prepare", confidence: "confirme", universe: "vie", visibility: "equipe" },
    { id: "e2", title: "Cérémonie", time: NOW + 30 * DAY, phase: "pendant", kind: "evenement", status: "prepare", confidence: "confirme", universe: "vie", visibility: "audience" },
    { id: "sansDate", title: "Sans heure", time: Number.NaN, phase: "avant", kind: "evenement", status: "prepare", confidence: "confirme", universe: "vie", visibility: "equipe" },
  ],
  tasks: [
    { id: "t1", title: "Relancer le traiteur", phase: "3-6m", status: "en_cours", priority: "haute", dueDate: NOW - DAY },
    { id: "t2", title: "Sans échéance", phase: "6-12m", status: "a_faire", priority: "normale" },
    { id: "t3", title: "Fait", phase: "12m+", status: "termine", priority: "basse", dueDate: NOW - 10 * DAY },
  ],
  documents: [
    { id: "d1", title: "Contrat salle", kind: "contrat", at: NOW - 5 * DAY },
    { id: "d2", title: "Sans horodatage", kind: "autre", at: Number.NaN },
  ],
  payments: [
    { id: "pay1", label: "Acompte salle", amountCents: 100_000, at: NOW - 2 * DAY, state: "paye" },
    { id: "pay2", label: "Solde traiteur", amountCents: 620_000, at: NOW - DAY, state: "du", dueDate: NOW + 20 * DAY },
  ],
  providers: [{ id: "pr1", category: "traiteur", role: "Traiteur", status: "devis", amountCents: 620_000 }],
  guests: [
    { id: "g1", name: "Camille", role: "invite", rsvp: "confirme" },
    { id: "g2", name: "Jules", role: "invite", rsvp: "en_attente" },
  ],
  memories: [{ id: "m1", kind: "message", title: "Merci", status: "a_faire" }],
  music: [{ id: "mu1", moment: "cocktail", title: "Premier regard", artist: "X", status: "a_choisir" }],
  team: [{ id: "tm1", name: "Léa", role: "Témoin", responsibilities: [] }],
} as unknown as WorldProject;

const arrivals = [{ id: "rsvp-g1-1717243200000", guestId: "g1", guestName: "Camille", time: NOW - 3 * DAY, status: "confirme" }];

describe("buildFrise (une abscisse, aucune date inventée)", () => {
  it("place sur l'axe ce qui a une date réelle, dans le bon couloir", () => {
    const frise = buildFrise(project, arrivals, NOW);
    const byLane = (lane: string) => frise.items.filter(item => item.lane === lane).map(item => item.label);

    expect(byLane("moments")).toEqual(["Dégustation", "Cérémonie"]);
    expect(byLane("invites")).toEqual(["Camille"]);
    // Triées par échéance : « Fait » (J-10) précède « Relancer » (J-1).
    expect(byLane("taches")).toEqual(["Fait", "Relancer le traiteur"]);
    expect(byLane("documents")).toEqual(["Contrat salle"]);
    expect(byLane("argent")).toEqual(["Acompte salle", "Solde traiteur"]);
  });

  it("n'invente jamais d'abscisse : le non daté part dans la gouttière", () => {
    const frise = buildFrise(project, arrivals, NOW);
    const labels = frise.items.map(item => item.label);

    expect(labels).not.toContain("Sans heure");
    expect(labels).not.toContain("Sans échéance");
    expect(labels).not.toContain("Sans horodatage");
    expect(frise.items.every(item => Number.isFinite(item.time))).toBe(true);

    const gutter = Object.fromEntries(frise.undated.map(entry => [entry.id, entry.count]));
    expect(gutter["tasks-undated"]).toBe(1);
    expect(gutter.providers).toBe(1);
    expect(gutter.memories).toBe(1);
    expect(gutter.music).toBe(1);
    expect(gutter.team).toBe(1);
    // Camille a répondu : elle ne compte pas parmi les invités sans réponse.
    expect(gutter.guests).toBe(1);
  });

  it("place un paiement dû à son échéance, pas à sa date de saisie", () => {
    const frise = buildFrise(project, arrivals, NOW);
    const due = frise.items.find(item => item.label === "Solde traiteur");

    expect(due?.time).toBe(NOW + 20 * DAY);
    expect(due?.state).toBe("du");
  });

  it("garde les agrégats dans les stats, pas sur l'axe", () => {
    const { stats, items } = buildFrise(project, arrivals, NOW);

    expect(stats.daysLeft).toBe(30);
    expect(stats.openTasks).toBe(2);
    expect(stats.engagedCents).toBe(620_000);
    expect(stats.paidCents).toBe(100_000);
    expect(stats.confirmedGuests).toBe(1);
    expect(stats.waitingGuests).toBe(1);
    // Aucun agrégat ne s'est glissé parmi les repères.
    expect(items.some(item => item.lane === ("stats" as never))).toBe(false);
  });

  it("trie par date et se passe de réponses RSVP", () => {
    const frise = buildFrise(project, [], NOW);
    const times = frise.items.map(item => item.time);

    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(frise.items.filter(item => item.lane === "invites")).toEqual([]);
  });
});
