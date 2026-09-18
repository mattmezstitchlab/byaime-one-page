import { describe, expect, it } from "vitest";
import {
  appendExport,
  buildExportCsv,
  exportHistoryFor,
  factAmountCents,
  factFingerprint,
  fingerprint,
  isAppendOnly,
  lastExportFor,
  pendingExports,
} from "./export-journal";
import type { Document, ExportEntry, Payment, Provider } from "./types";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 8, 18, 12);

const document = (partial: Partial<Document> & Pick<Document, "id" | "kind">): Document => ({ title: partial.id, at: NOW - 30 * DAY, ...partial });
const payment = (partial: Partial<Payment> & Pick<Payment, "id" | "state">): Payment => ({ label: partial.id, amountCents: 100_000, at: NOW - DAY, ...partial });
const provider = (id: string, name: string): Provider => ({ id, category: "traiteur", role: "Traiteur", name, status: "reserve" });

let counter = 0;
const makeId = () => `entry-${++counter}`;

const documents = [
  document({ id: "devis", kind: "devis", providerId: "p1" }),
  document({ id: "f1", kind: "facture", providerId: "p1", title: "Facture traiteur ; solde" }),
  document({ id: "f2", kind: "facture", providerId: "p2" }),
];
const payments = [
  payment({ id: "pay-1", state: "paye", providerId: "p1", amountCents: 60_000, at: NOW - 3 * DAY }),
  payment({ id: "pay-2", state: "paye", providerId: "p1", amountCents: 40_000, at: NOW - DAY }),
  payment({ id: "pay-3", state: "du", providerId: "p2" }),
];

describe("fingerprint — un témoin d'état déterministe", () => {
  it("est stable et sensible au contenu", () => {
    expect(fingerprint("aime")).toBe(fingerprint("aime"));
    expect(fingerprint("aime")).not.toBe(fingerprint("aimé"));
    expect(fingerprint("")).toMatch(/^[0-9a-f]{8}$/);
  });

  it("ignore l'URL du fichier mais suit les paiements réglés", () => {
    const invoice = documents[1];
    const base = factFingerprint(invoice, payments);
    expect(factFingerprint({ ...invoice, url: "data:application/pdf;base64,AAAA" }, payments)).toBe(base);
    expect(factFingerprint(invoice, [payments[0], { ...payments[1], amountCents: 45_000 }, payments[2]])).not.toBe(base);
    expect(factFingerprint(invoice, [payments[0], payments[2]])).not.toBe(base);
  });

  it("somme les paiements réglés qui couvrent le fait", () => {
    expect(factAmountCents(documents[1], payments)).toBe(100_000);
    expect(factAmountCents(documents[2], payments)).toBe(0);
  });
});

describe("pendingExports / appendExport — seul le passé sort, une fois par état", () => {
  it("n'attend que les faits jamais exportés vers cette destination", () => {
    expect(pendingExports({ documents, payments, exportLog: [] }, "csv").map(item => item.id)).toEqual(["f1"]);
  });

  it("n'écrit que des entrées nouvelles et devient silencieux au second passage", () => {
    counter = 0;
    const first = appendExport({ documents, payments, exportLog: [] }, "csv", NOW, { makeId });
    expect(first.added.map(entry => entry.documentId)).toEqual(["f1"]);
    expect(first.added[0]).toMatchObject({ id: "entry-1", destination: "csv", exportedAt: NOW, amountCents: 100_000, providerId: "p1", paymentIds: ["pay-1", "pay-2"] });

    const second = appendExport({ documents, payments, exportLog: first.exportLog }, "csv", NOW + DAY, { makeId });
    expect(second.added).toEqual([]);
    expect(second.exportLog).toEqual(first.exportLog);
  });

  it("journalise chaque destination séparément", () => {
    const csv = appendExport({ documents, payments, exportLog: [] }, "csv", NOW, { makeId });
    expect(pendingExports({ documents, payments, exportLog: csv.exportLog }, "pennylane").map(item => item.id)).toEqual(["f1"]);
  });

  it("écrit une nouvelle entrée quand le fait change, sans toucher à l'ancienne", () => {
    const first = appendExport({ documents, payments, exportLog: [] }, "pennylane", NOW, { makeId });
    const corrected = [payments[0], { ...payments[1], amountCents: 45_000 }, payments[2]];
    const second = appendExport({ documents, payments: corrected, exportLog: first.exportLog }, "pennylane", NOW + DAY, { makeId });
    expect(second.added).toHaveLength(1);
    expect(second.exportLog).toHaveLength(2);
    expect(second.exportLog[0]).toEqual(first.exportLog[0]);
    expect(exportHistoryFor("f1", second.exportLog, "pennylane").map(entry => entry.amountCents)).toEqual([100_000, 105_000]);
    expect(lastExportFor("f1", second.exportLog, "pennylane")?.exportedAt).toBe(NOW + DAY);
  });

  it("peut se limiter à certains documents sans jamais franchir la porte des faits", () => {
    const attempt = appendExport({ documents, payments, exportLog: [] }, "csv", NOW, { makeId, documentIds: ["devis", "f2"] });
    expect(attempt.added).toEqual([]);
  });
});

describe("isAppendOnly — le journal ne se prolonge que par la fin", () => {
  const entry = (id: string, hash: string): ExportEntry => ({ id, documentId: "f1", destination: "csv", exportedAt: NOW, hash, amountCents: 1, paymentIds: [] });

  it("accepte une extension et refuse une réécriture ou une suppression", () => {
    const previous = [entry("a", "1"), entry("b", "2")];
    expect(isAppendOnly(previous, [...previous, entry("c", "3")])).toBe(true);
    expect(isAppendOnly(previous, previous)).toBe(true);
    expect(isAppendOnly(previous, [entry("a", "1")])).toBe(false);
    expect(isAppendOnly(previous, [entry("a", "9"), entry("b", "2")])).toBe(false);
    expect(isAppendOnly(previous, [entry("b", "2"), entry("a", "1")])).toBe(false);
  });
});

describe("buildExportCsv — un fichier que l'on tient en main est déjà une destination", () => {
  it("écrit une ligne par fait, en euros, avec le tiers et les paiements", () => {
    const { added } = appendExport({ documents, payments, exportLog: [] }, "csv", NOW, { makeId });
    const csv = buildExportCsv(added, { documents, payments, providers: [provider("p1", "Maison Dupont")] });
    const [header, row] = csv.split("\n");
    expect(header).toBe("date;libelle;montant;tiers;reference;paiements;empreinte");
    expect(row).toContain("2026-09-17;");
    expect(row).toContain("\"Facture traiteur ; solde\"");
    expect(row).toContain(";1000.00;Maison Dupont;f1;");
    expect(row).toContain("2026-09-15 pay-1 + 2026-09-17 pay-2");
    expect(csv.split("\n")).toHaveLength(2);
  });
});
