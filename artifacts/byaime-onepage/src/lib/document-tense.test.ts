import { describe, expect, it } from "vitest";
import {
  documentStage,
  documentTense,
  exportableDocuments,
  groupMomentsByTense,
  momentEnd,
  PRESENT_WINDOW_MS,
  readDocuments,
  tenseOf,
} from "./document-tense";
import type { Document, Payment, TimelineEvent } from "./types";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 18, 12); // 18 septembre 2026, midi

function moment(partial: Partial<TimelineEvent> & Pick<TimelineEvent, "id" | "time">): TimelineEvent {
  return {
    kind: "jalon",
    title: partial.id,
    status: "prepare",
    confidence: "confirme",
    phase: "avant",
    universe: "mariage",
    ...partial,
  };
}

function document(partial: Partial<Document> & Pick<Document, "id" | "kind">): Document {
  return { title: partial.id, at: NOW - 30 * DAY, ...partial };
}

function payment(partial: Partial<Payment> & Pick<Payment, "id" | "state">): Payment {
  return { label: partial.id, amountCents: 100_000, at: NOW - DAY, ...partial };
}

describe("tenseOf — le temps est une propriété du regard", () => {
  it("place au futur un Moment qui commence après la fenêtre du présent", () => {
    expect(tenseOf(moment({ id: "m", time: NOW + 2 * DAY }), NOW)).toBe("futur");
  });

  it("place au passé un Moment terminé avant la fenêtre du présent", () => {
    expect(tenseOf(moment({ id: "m", time: NOW - 3 * DAY }), NOW)).toBe("passe");
  });

  it("garde au présent un Moment à moins d'une journée, avant comme après", () => {
    expect(tenseOf(moment({ id: "m", time: NOW + 6 * 60 * 60 * 1000 }), NOW)).toBe("present");
    expect(tenseOf(moment({ id: "m", time: NOW - 6 * 60 * 60 * 1000 }), NOW)).toBe("present");
  });

  it("garde au présent un Moment en cours, même commencé il y a longtemps", () => {
    const longRunning = moment({ id: "m", time: NOW - 10 * DAY, endTime: NOW + 10 * DAY });
    expect(tenseOf(longRunning, NOW)).toBe("present");
  });

  it("utilise la durée quand il n'y a pas de fin explicite", () => {
    const event = moment({ id: "m", time: NOW - 2 * DAY, durationMinutes: 3 * 24 * 60 });
    expect(momentEnd(event)).toBe(NOW + DAY);
    expect(tenseOf(event, NOW)).toBe("present");
  });

  it("change de temps quand le regard change, sans que le Moment change", () => {
    const wedding = moment({ id: "jour-j", time: Date.UTC(2027, 5, 12), phase: "pendant" });
    expect(tenseOf(wedding, NOW)).toBe("futur");
    expect(tenseOf(wedding, Date.UTC(2027, 5, 12, 15))).toBe("present");
    expect(tenseOf(wedding, Date.UTC(2027, 6, 1))).toBe("passe");
    expect(wedding.phase).toBe("pendant");
  });

  it("accepte une fenêtre du présent personnalisée", () => {
    const soon = moment({ id: "m", time: NOW + 2 * DAY });
    expect(tenseOf(soon, NOW, 3 * DAY)).toBe("present");
    expect(tenseOf(soon, NOW, PRESENT_WINDOW_MS)).toBe("futur");
  });
});

describe("groupMomentsByTense — une timeline, trois lectures", () => {
  it("répartit chaque Moment dans un seul groupe, trié par temps", () => {
    const timeline = [
      moment({ id: "c", time: NOW + 5 * DAY }),
      moment({ id: "a", time: NOW - 5 * DAY }),
      moment({ id: "b", time: NOW }),
      moment({ id: "d", time: NOW + 2 * DAY }),
      moment({ id: "z", time: NOW - 40 * DAY }),
    ];
    const groups = groupMomentsByTense(timeline, NOW);
    expect(groups.passe.map(event => event.id)).toEqual(["z", "a"]);
    expect(groups.present.map(event => event.id)).toEqual(["b"]);
    expect(groups.futur.map(event => event.id)).toEqual(["d", "c"]);
    expect(groups.passe.length + groups.present.length + groups.futur.length).toBe(timeline.length);
  });
});

describe("documentStage — un document a un stade, pas un temps", () => {
  it("lit le cycle devis → contrat → facture", () => {
    expect(documentStage(document({ id: "d", kind: "devis", providerId: "p1" }), [])).toBe("proposition");
    expect(documentStage(document({ id: "c", kind: "contrat", providerId: "p1" }), [])).toBe("engagement");
    expect(documentStage(document({ id: "f", kind: "facture", providerId: "p1" }), [])).toBe("echeance");
  });

  it("fait d'une facture un fait dès qu'un paiement effectué la rapproche", () => {
    const invoice = document({ id: "f", kind: "facture", providerId: "p1" });
    expect(documentStage(invoice, [payment({ id: "due", state: "du", providerId: "p1" })])).toBe("echeance");
    expect(documentStage(invoice, [payment({ id: "paid", state: "paye", providerId: "p1" })])).toBe("fait");
  });

  it("ne rapproche jamais un paiement d'un autre prestataire", () => {
    const invoice = document({ id: "f", kind: "facture", providerId: "p1" });
    expect(documentStage(invoice, [payment({ id: "paid", state: "paye", providerId: "p2" })])).toBe("echeance");
  });

  it("laisse en échéance une facture sans prestataire, même avec des paiements", () => {
    const orphan = document({ id: "f", kind: "facture" });
    expect(documentStage(orphan, [payment({ id: "paid", state: "paye", providerId: "p1" })])).toBe("echeance");
  });

  it("garde hors cycle un document libre", () => {
    expect(documentStage(document({ id: "x", kind: "autre", providerId: "p1" }), [payment({ id: "paid", state: "paye", providerId: "p1" })])).toBe("libre");
  });
});

describe("documentTense — le temps d'un document se lit sur ses Moments", () => {
  it("retombe sur la date de dépôt sans Moment relié", () => {
    expect(documentTense(document({ id: "d", kind: "devis", at: NOW - 30 * DAY }), [], NOW)).toBe("passe");
    expect(documentTense(document({ id: "d", kind: "devis", at: NOW + 30 * DAY }), [], NOW)).toBe("futur");
  });

  it("suit le Moment le plus tardif : un vieux contrat relié à une échéance future reste au futur", () => {
    const contract = document({ id: "c", kind: "contrat", at: NOW - 200 * DAY });
    const timeline = [
      moment({ id: "signature", time: NOW - 200 * DAY, relations: [{ kind: "document", id: "c" }] }),
      moment({ id: "solde", time: NOW + 90 * DAY, relations: [{ kind: "document", id: "c" }] }),
    ];
    expect(documentTense(contract, timeline, NOW)).toBe("futur");
  });

  it("ignore les relations vers d'autres documents", () => {
    const contract = document({ id: "c", kind: "contrat", at: NOW - 200 * DAY });
    const timeline = [moment({ id: "autre", time: NOW + 90 * DAY, relations: [{ kind: "document", id: "z" }] })];
    expect(documentTense(contract, timeline, NOW)).toBe("passe");
  });
});

describe("exportableDocuments — seul le passé sort du Monde", () => {
  const payments = [payment({ id: "paid", state: "paye", providerId: "p1" }), payment({ id: "due", state: "du", providerId: "p2" })];
  const documents = [
    document({ id: "devis-1", kind: "devis", providerId: "p1" }),
    document({ id: "contrat-1", kind: "contrat", providerId: "p1" }),
    document({ id: "facture-1", kind: "facture", providerId: "p1" }),
    document({ id: "facture-2", kind: "facture", providerId: "p2" }),
    document({ id: "plan", kind: "autre" }),
  ];

  it("ne laisse sortir que les factures rapprochées d'un paiement effectué", () => {
    expect(exportableDocuments({ documents, payments }).map(item => item.id)).toEqual(["facture-1"]);
  });

  it("ne laisse jamais sortir un devis, un contrat ou une facture due", () => {
    const ids = exportableDocuments({ documents, payments }).map(item => item.id);
    expect(ids).not.toContain("devis-1");
    expect(ids).not.toContain("contrat-1");
    expect(ids).not.toContain("facture-2");
    expect(ids).not.toContain("plan");
  });

  it("aligne l'exportabilité de la lecture complète sur le stade « fait »", () => {
    const readings = readDocuments({ documents, payments, timeline: [] }, NOW);
    expect(readings.map(reading => reading.document.id)).toHaveLength(documents.length);
    for (const reading of readings) {
      expect(reading.exportable).toBe(reading.stage === "fait");
    }
  });

  it("ne dépend pas de l'horloge : même projet, même résultat quel que soit le regard", () => {
    const early = exportableDocuments({ documents, payments }).map(item => item.id);
    const late = readDocuments({ documents, payments, timeline: [] }, NOW + 365 * DAY)
      .filter(reading => reading.exportable)
      .map(reading => reading.document.id);
    expect(late).toEqual(early);
  });
});
