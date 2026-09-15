import { describe, expect, it } from "vitest";
import { worldAlerts, WORLD_ALERT_MIN_CENTS_PER_GUEST } from "./world-alerts";
import type { TimelineEvent, WorldProject } from "./types";

/*
 * Les alertes de cohérence sont des faits, pas des opinions : chaque règle est
 * verrouillée ici pour que le guidage puisse les dire sans les inventer. Une
 * suggestion jamais adoptée ne peut pas être « en retard », un Monde vide ne
 * doit rien produire, et la même entrée donne toujours la même sortie.
 */

const NOW = Date.UTC(2026, 8, 15, 10); // 15 septembre 2026, 10 h — fixe
const PIVOT = Date.UTC(2027, 7, 14, 12); // 14 août 2027

const event = (overrides: Partial<TimelineEvent>): TimelineEvent => ({
  id: "m1",
  time: PIVOT,
  kind: "jalon",
  title: "Moment",
  status: "prepare",
  confidence: "confirme",
  phase: "avant",
  universe: "Mariage",
  provenance: "real",
  ...overrides,
});

const world = (patch: Partial<WorldProject> = {}): WorldProject => ({
  id: "w1",
  title: "Mariage d'Élise et de Paul",
  pivot: { value: PIVOT, confidence: "confirme" },
  universe: "Mariage",
  timeline: [],
  guests: [],
  providers: [],
  payments: [],
  documents: [],
  tasks: [],
  tables: [],
  communications: [],
  logistics: { emergencyContacts: [] } as unknown as WorldProject["logistics"],
  ceremony: {} as unknown as WorldProject["ceremony"],
  music: [],
  team: [],
  memoryChecklist: [],
  memories: [],
  messageTemplates: [],
  messageLogs: [],
  media: [],
  messages: [],
  missing: [],
  ...patch,
} as unknown as WorldProject);

describe("moteur d'alertes de cohérence du Monde", () => {
  it("un Monde vide ne produit aucune alerte", () => {
    expect(worldAlerts(world(), { now: NOW })).toEqual([]);
  });

  it("signale un engagement Avant réel dont la date est passée", () => {
    const alerts = worldAlerts(world({
      timeline: [event({ id: "e1", title: "Réserver le traiteur", time: NOW - 86400000 })],
    }), { now: NOW });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].kind).toBe("retard");
    expect(alerts[0].severity).toBe("critique");
    expect(alerts[0].title).toBe("« Réserver le traiteur » est en retard");
    expect(alerts[0].eventIds).toEqual(["e1"]);
  });

  it("ne compte pas comme retard : une suggestion jamais adoptée, un Moment terminé, un Moment du Jour J", () => {
    const alerts = worldAlerts(world({
      timeline: [
        event({ id: "s1", title: "Suggestion jamais adoptée", time: NOW - 86400000, provenance: "suggested" }),
        event({ id: "d1", title: "Déjà fait", time: NOW - 86400000, status: "execute" }),
        event({ id: "j1", title: "Moment du Jour J passé", time: NOW - 3600000, phase: "pendant", status: "prepare" }),
      ],
    }), { now: NOW });
    expect(alerts.filter(alert => alert.kind === "retard")).toHaveLength(0);
  });

  it("dit combien d'éléments dépendent d'un retard", () => {
    const alerts = worldAlerts(world({
      timeline: [
        event({ id: "e1", title: "Réserver le traiteur", time: NOW - 86400000 }),
        event({ id: "e2", title: "Dégustation", time: PIVOT, dependencyIds: ["e1"] }),
      ],
    }), { now: NOW });
    const retard = alerts.find(alert => alert.kind === "retard");
    expect(retard?.detail).toContain("1 élément");
  });

  it("regroupe les statuts en attente sous « à confirmer »", () => {
    const alerts = worldAlerts(world({
      timeline: [
        event({ id: "c1", title: "Menu à valider", status: "a_valider" }),
        event({ id: "c2", title: "Réponse du lieu", status: "en_attente" }),
      ],
    }), { now: NOW });
    const confirmations = alerts.filter(alert => alert.kind === "a_confirmer");
    expect(confirmations).toHaveLength(2);
    expect(confirmations.map(alert => alert.severity)).toEqual(["attention", "attention"]);
  });

  it("relève un devis invraisemblable face à la jauge d'invités", () => {
    const alerts = worldAlerts(world({
      guests: Array.from({ length: 120 }, (_, index) => ({ id: `g${index}`, name: `Invité ${index}`, role: "invite", rsvp: "en_attente", attendance: { ceremony: true, cocktail: true, dinner: true, brunch: false } })),
      timeline: [
        event({ id: "d1", kind: "devis", title: "Devis traiteur", amountCents: 50000 }), // 500 € pour 120 invités
        event({ id: "d2", kind: "devis", title: "Devis lieu", amountCents: 450000 }),   // 4 500 € : au-dessus du seuil
        event({ id: "d3", kind: "paiement", title: "Acompte symbolique", amountCents: 500 }), // un paiement n'est pas un devis
      ],
    }), { now: NOW });
    const incoherences = alerts.filter(alert => alert.kind === "incoherence_jauge");
    expect(incoherences).toHaveLength(1);
    expect(incoherences[0].eventIds).toEqual(["d1"]);
    expect(incoherences[0].detail).toContain("120");
  });

  it("ignore la jauge quand la liste d'invités est vide ou le montant absent", () => {
    const alerts = worldAlerts(world({
      timeline: [event({ id: "d1", kind: "devis", title: "Devis sans montant" })],
    }), { now: NOW });
    expect(alerts.filter(alert => alert.kind === "incoherence_jauge")).toHaveLength(0);
  });

  it("respecte le seuil de vraisemblance exporté", () => {
    expect(WORLD_ALERT_MIN_CENTS_PER_GUEST).toBe(1000); // 10 € par invité
  });

  it("signale un prestataire présent sur plusieurs Moments, lui seul", () => {
    const alerts = worldAlerts(world({
      timeline: [
        event({ id: "m1", title: "Cocktail", phase: "pendant", relations: [{ kind: "provider", id: "p2" }] }),
        event({ id: "m2", title: "Dîner", phase: "pendant", relations: [{ kind: "provider", id: "p2" }] }),
        event({ id: "m3", title: "Photos", phase: "pendant", relations: [{ kind: "provider", id: "p3" }] }),
      ],
    }), { now: NOW });
    const impacts = alerts.filter(alert => alert.kind === "impact");
    expect(impacts).toHaveLength(1);
    expect(impacts[0].providerId).toBe("p2");
    expect(impacts[0].eventIds).toEqual(["m1", "m2"]);
  });

  it("propose une relance pour les premiers contacts nommés, avec un message prêt", () => {
    const alerts = worldAlerts(world({
      providers: [
        { id: "p1", category: "traiteur", role: "Traiteur", name: "Maison Bernard", status: "contacte" },
        { id: "p2", category: "photo", role: "Photographe", name: "Studio Lumière", status: "contacte" },
        { id: "p3", category: "musique", role: "DJ", name: "DJ Nova", status: "contacte" }, // au-delà de la limite
        { id: "p4", category: "lieu", role: "Lieu", status: "contacte" },                    // sans nom : pas de relance
        { id: "p5", category: "fleuriste", role: "Fleuriste", name: "Herbier", status: "reserve" },
      ],
    }), { now: NOW });
    const relances = alerts.filter(alert => alert.kind === "relance");
    expect(relances.map(alert => alert.providerId)).toEqual(["p1", "p2"]);
    expect(relances[0].title).toBe("Préparer une relance pour Maison Bernard");
    expect(relances[0].detail).toContain("Bonjour Maison Bernard");
    expect(relances[0].detail).toContain("Mariage d'Élise et de Paul");
  });

  it("désigne la prochaine action : le premier élément non terminé à venir", () => {
    const alerts = worldAlerts(world({
      timeline: [
        event({ id: "p1", title: "Lointain", time: PIVOT + 86400000 }),
        event({ id: "p2", title: "Proche", time: NOW + 86400000 }),
        event({ id: "p3", title: "Passé et fait", time: NOW - 86400000, status: "execute" }),
      ],
    }), { now: NOW });
    const next = alerts.filter(alert => alert.kind === "prochaine_action");
    expect(next).toHaveLength(1);
    expect(next[0].title).toBe("Prochaine action : Proche");
    expect(next[0].eventIds).toEqual(["p2"]);
    expect(next[0].time).toBe(NOW + 86400000);
  });

  it("est déterministe : même Monde, mêmes alertes, dans le même ordre", () => {
    const monde = world({
      guests: [{ id: "g1", name: "Camille", role: "invite", rsvp: "en_attente", attendance: { ceremony: true, cocktail: true, dinner: true, brunch: false } }],
      providers: [{ id: "p1", category: "traiteur", role: "Traiteur", name: "Maison Bernard", status: "contacte" }],
      timeline: [
        event({ id: "e2", title: "Valider le menu", status: "a_valider" }),
        event({ id: "e1", title: "Réserver le traiteur", time: NOW - 86400000 }),
      ],
    });
    expect(worldAlerts(monde, { now: NOW })).toEqual(worldAlerts(monde, { now: NOW }));
  });
});
