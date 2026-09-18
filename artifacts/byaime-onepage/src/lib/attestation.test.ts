import { describe, expect, it } from "vitest";
import {
  attestedDocumentStage,
  attestedDocuments,
  counterpartsOf,
  factState,
  factView,
  factViewFingerprint,
  isAttested,
  isSettledPaymentAttested,
} from "./attestation";
import type { Attestation, Document, Payment, Provider, TimelineEvent } from "./types";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 8, 18, 12);
const GIG = NOW - 40 * DAY;

const provider = (id: string, name: string): Provider => ({ id, category: "musique", role: "Musicien", name, status: "reserve", employment: "guso" });
const moment = (partial: Partial<TimelineEvent> & Pick<TimelineEvent, "id" | "time">): TimelineEvent => ({
  kind: "evenement", title: partial.id, status: "execute", confidence: "confirme", phase: "pendant", universe: "Mariage", provenance: "real", ...partial,
});
const document = (partial: Partial<Document> & Pick<Document, "id" | "kind">): Document => ({ title: partial.id, at: GIG, ...partial });
const payment = (partial: Partial<Payment> & Pick<Payment, "id" | "state">): Payment => ({ label: partial.id, amountCents: 15_000, at: GIG + DAY, ...partial });

const sax = provider("sax", "Léo");
const dj = provider("dj", "Nina");
const bal = moment({ id: "bal", time: GIG, durationMinutes: 180, location: "Orangerie", relations: [{ kind: "provider", id: "sax" }, { kind: "provider", id: "dj" }, { kind: "document", id: "f-sax" }] });
const documents = [
  document({ id: "f-sax", kind: "facture", providerId: "sax" }),
  document({ id: "f-dj", kind: "facture", providerId: "dj" }),
  document({ id: "photo", kind: "autre", providerId: "sax" }),
];
const payments = [
  payment({ id: "p-sax", state: "paye", providerId: "sax", documentId: "f-sax" }),
  payment({ id: "p-dj", state: "du", providerId: "dj", documentId: "f-dj" }),
];
const base = { timeline: [bal], providers: [sax, dj], documents, payments, attestations: [] as Attestation[] };

const sign = (status: Attestation["status"], hash: string, respondedAt = NOW): Attestation => ({
  id: `a-${respondedAt}`, eventId: "bal", providerId: "sax", status, hash, respondedAt, amountCents: 15_000, time: GIG,
});

describe("factView — ce que la contrepartie voit, donc ce qu'elle signe", () => {
  it("réunit le Moment, ses documents financiers du prestataire et les règlements", () => {
    const view = factView(bal, "sax", base);
    expect(view).toMatchObject({ eventId: "bal", providerId: "sax", title: "bal", time: GIG, endTime: GIG + 180 * 60_000, location: "Orangerie", amountCents: 15_000, documentIds: ["f-sax"], paymentIds: ["p-sax"] });
  });

  it("n'inclut ni les documents libres, ni ceux d'un autre prestataire, ni les paiements dus", () => {
    const view = factView(bal, "dj", base);
    expect(view.documentIds).toEqual(["f-dj"]);
    expect(view.paymentIds).toEqual([]);
    expect(view.amountCents).toBe(0);
  });

  it("retombe sur tous les documents financiers du prestataire quand aucun n'est relié au Moment", () => {
    const unlinked = moment({ id: "repet", time: GIG - 7 * DAY, relations: [{ kind: "provider", id: "sax" }] });
    expect(factView(unlinked, "sax", base).documentIds).toEqual(["f-sax"]);
  });

  it("a une empreinte qui suit la date, le lieu et les règlements, mais pas l'URL du fichier", () => {
    const hash = factViewFingerprint(factView(bal, "sax", base));
    expect(factViewFingerprint(factView(bal, "sax", { ...base, documents: [{ ...documents[0], url: "data:x" }, ...documents.slice(1)] }))).toBe(hash);
    expect(factViewFingerprint(factView({ ...bal, time: GIG + 60_000 }, "sax", base))).not.toBe(hash);
    expect(factViewFingerprint(factView({ ...bal, location: "Grange" }, "sax", base))).not.toBe(hash);
    expect(factViewFingerprint(factView(bal, "sax", { ...base, payments: [{ ...payments[0], amountCents: 16_000 }, payments[1]] }))).not.toBe(hash);
  });
});

describe("factState — déclaré, attesté, contesté, périmé", () => {
  const hash = factViewFingerprint(factView(bal, "sax", base));

  it("est déclaré tant que l'autre n'a rien écrit", () => {
    expect(factState(bal, "sax", base)).toBe("declare");
    expect(isAttested(bal, "sax", base)).toBe(false);
  });

  it("est attesté quand l'autre a signé ce fait tel qu'il est", () => {
    const project = { ...base, attestations: [sign("atteste", hash)] };
    expect(factState(bal, "sax", project)).toBe("atteste");
    /* Le DJ n'a rien signé : son côté reste déclaré. */
    expect(factState(bal, "dj", project)).toBe("declare");
  });

  it("est contesté quand la dernière écriture dit non à ce fait", () => {
    const project = { ...base, attestations: [sign("conteste", hash)] };
    expect(factState(bal, "sax", project)).toBe("conteste");
  });

  it("se périme quand le fait change après la signature, et se rétablit si l'autre re-signe", () => {
    const signed = { ...base, attestations: [sign("atteste", hash)] };
    const changed = { ...signed, payments: [{ ...payments[0], amountCents: 16_000 }, payments[1]] };
    expect(factState(bal, "sax", changed)).toBe("perime");
    const newHash = factViewFingerprint(factView(bal, "sax", changed));
    const resigned = { ...changed, attestations: [...signed.attestations, sign("atteste", newHash, NOW + DAY)] };
    expect(factState(bal, "sax", resigned)).toBe("atteste");
    /* L'ancienne écriture est toujours là : rien n'a été réécrit. */
    expect(resigned.attestations).toHaveLength(2);
  });

  it("une contestation puis une signature : la signature l'emporte sur le fait courant", () => {
    const project = { ...base, attestations: [sign("conteste", hash, NOW), sign("atteste", hash, NOW + DAY)] };
    expect(factState(bal, "sax", project)).toBe("atteste");
  });

  it("une signature sur un autre fait ne compte pas", () => {
    const project = { ...base, attestations: [sign("atteste", "deadbeef")] };
    expect(factState(bal, "sax", project)).toBe("perime");
  });
});

describe("counterpartsOf / attestedDocuments — la porte des preuves", () => {
  it("liste les prestataires reliés au Moment", () => {
    expect(counterpartsOf(bal, [sax, dj, provider("x", "X")]).map(p => p.id)).toEqual(["sax", "dj"]);
  });

  it("garde un fait au stade « fait » tant qu'il n'est pas contresigné, et le monte à « attesté » ensuite", () => {
    expect(attestedDocumentStage(documents[0], base)).toBe("fait");
    expect(attestedDocuments(base)).toEqual([]);
    const hash = factViewFingerprint(factView(bal, "sax", base));
    const signed = { ...base, attestations: [sign("atteste", hash)] };
    expect(attestedDocumentStage(documents[0], signed)).toBe("atteste");
    expect(attestedDocuments(signed).map(d => d.id)).toEqual(["f-sax"]);
    expect(isSettledPaymentAttested(payments[0], signed)).toBe(true);
    expect(isSettledPaymentAttested(payments[1], signed)).toBe(false);
  });

  it("ne monte jamais un document sans Moment : il n'y a rien que l'autre puisse signer", () => {
    const orphan = document({ id: "f-orphan", kind: "facture", providerId: "sax" });
    const project = { ...base, documents: [...documents, orphan], payments: [...payments, payment({ id: "p-orphan", state: "paye", providerId: "sax", documentId: "f-orphan" })] };
    expect(attestedDocumentStage(orphan, project)).toBe("fait");
  });

  it("n'exige jamais l'attestation en dessous : une facture due reste une échéance", () => {
    expect(attestedDocumentStage(documents[1], base)).toBe("echeance");
  });
});
