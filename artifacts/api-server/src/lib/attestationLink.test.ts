import { describe, expect, it } from "vitest";
import { buildFactView, factViewFingerprint } from "@workspace/aime-domain";
import { attestationResponseSchema, buildAttestationPortal, checkCounterpart, decideResponse, isDuplicateResponse } from "./attestationLink";

const GIG = Date.UTC(2026, 7, 1, 20);
const data = {
  timeline: [
    { id: "bal", time: GIG, durationMinutes: 180, title: "Bal", location: "Orangerie", provenance: "real", relations: [{ kind: "provider", id: "sax" }, { kind: "document", id: "f-sax" }] },
    { id: "idee", time: GIG + 86_400_000, title: "Idée", provenance: "suggested", relations: [{ kind: "provider", id: "sax" }] },
    { id: "diner", time: GIG - 3_600_000, title: "Dîner", provenance: "real", relations: [{ kind: "provider", id: "traiteur" }] },
  ],
  providers: [{ id: "sax", role: "Saxophoniste", name: "Léo" }, { id: "traiteur", role: "Traiteur" }],
  documents: [
    { id: "f-sax", kind: "facture", providerId: "sax", title: "Cachet", at: GIG, url: "data:application/pdf;base64,AAAA" },
    { id: "photo", kind: "autre", providerId: "sax", title: "Photo", at: GIG },
  ],
  payments: [
    { id: "p1", state: "paye", providerId: "sax", documentId: "f-sax", amountCents: 15_000, at: GIG + 86_400_000 },
    { id: "p2", state: "du", providerId: "sax", amountCents: 5_000, at: GIG },
  ],
};

describe("checkCounterpart — on ne demande qu'à une contrepartie réelle", () => {
  it("accepte un prestataire relié à un Moment réel", () => {
    expect(checkCounterpart(data, "bal", "sax")).toEqual({ ok: true, providerName: "Léo" });
    expect(checkCounterpart(data, "diner", "traiteur")).toEqual({ ok: true, providerName: "Traiteur" });
  });

  it("refuse un Moment inconnu, un prestataire inconnu, une relation absente, une suggestion", () => {
    expect(checkCounterpart(data, "nope", "sax")).toEqual({ ok: false, reason: "event" });
    expect(checkCounterpart(data, "bal", "nope")).toEqual({ ok: false, reason: "provider" });
    expect(checkCounterpart(data, "bal", "traiteur")).toEqual({ ok: false, reason: "relation" });
    expect(checkCounterpart(data, "idee", "sax")).toEqual({ ok: false, reason: "suggested" });
  });
});

describe("buildFactView (partagé) — la même vue que le client", () => {
  it("montre le Moment, la facture reliée et le règlement, sans l'URL ni les documents libres", () => {
    const view = buildFactView(data, "bal", "sax")!;
    expect(view).toEqual({
      eventId: "bal", providerId: "sax", title: "Bal", time: GIG, endTime: GIG + 180 * 60_000, location: "Orangerie",
      amountCents: 15_000, documentIds: ["f-sax"], paymentIds: ["p1"],
    });
    expect(JSON.stringify(view)).not.toContain("base64");
  });
});

describe("buildAttestationPortal — ce que voit la contrepartie", () => {
  it("livre le fait, son empreinte et l'état de signature", () => {
    const portal = buildAttestationPortal(data, "Mariage de A & B", "bal", "sax", [])!;
    expect(portal.projectTitle).toBe("Mariage de A & B");
    expect(portal.providerName).toBe("Léo");
    expect(portal.hash).toBe(factViewFingerprint(portal.fact));
    expect(portal.attested).toBe(false);
    const signed = buildAttestationPortal(data, "M", "bal", "sax", [{ status: "atteste", hash: portal.hash, respondedAt: "2026-09-18T00:00:00Z", amountCents: 15_000 }])!;
    expect(signed.attested).toBe(true);
    const stale = buildAttestationPortal(data, "M", "bal", "sax", [{ status: "atteste", hash: "00000000", respondedAt: "2026-09-18T00:00:00Z", amountCents: 15_000 }])!;
    expect(stale.attested).toBe(false);
  });

  it("n'existe pas pour une contrepartie non reliée", () => {
    expect(buildAttestationPortal(data, "M", "bal", "traiteur", [])).toBeUndefined();
  });
});

describe("decideResponse — on ne signe jamais à l'aveugle", () => {
  const hash = factViewFingerprint(buildFactView(data, "bal", "sax")!);

  it("accepte une réponse sur le fait actuel et recalcule l'empreinte côté serveur", () => {
    const decision = decideResponse(data, "bal", "sax", { status: "atteste", hash });
    expect(decision.ok).toBe(true);
    if (decision.ok) expect(decision.hash).toBe(hash);
  });

  it("refuse (409) si le fait a changé depuis l'affichage", () => {
    const changed = { ...data, payments: [{ ...data.payments[0], amountCents: 16_000 }, data.payments[1]] };
    const decision = decideResponse(changed, "bal", "sax", { status: "atteste", hash });
    expect(decision).toMatchObject({ ok: false, status: 409 });
  });

  it("refuse (404) si le Moment a disparu ou ne relie plus ce prestataire", () => {
    expect(decideResponse({ ...data, timeline: [] }, "bal", "sax", { status: "atteste", hash })).toMatchObject({ ok: false, status: 404 });
    const unlinked = { ...data, timeline: [{ ...data.timeline[0], relations: [] }] };
    expect(decideResponse(unlinked, "bal", "sax", { status: "atteste", hash })).toMatchObject({ ok: false, status: 404 });
  });

  it("valide strictement l'entrée : pas d'avis, une note courte", () => {
    expect(attestationResponseSchema.safeParse({ status: "atteste", hash }).success).toBe(true);
    expect(attestationResponseSchema.safeParse({ status: "conteste", hash, note: "Le cachet était de 200 €." }).success).toBe(true);
    expect(attestationResponseSchema.safeParse({ status: "atteste", hash, rating: 5 }).success).toBe(false);
    expect(attestationResponseSchema.safeParse({ status: "atteste", hash: "zzz" }).success).toBe(false);
    expect(attestationResponseSchema.safeParse({ status: "conteste", hash, note: "x".repeat(281) }).success).toBe(false);
  });

  it("n'écrit pas deux fois la même réponse sur le même fait", () => {
    expect(isDuplicateResponse([{ status: "atteste", hash }], { status: "atteste", hash })).toBe(true);
    expect(isDuplicateResponse([{ status: "conteste", hash }], { status: "atteste", hash })).toBe(false);
    expect(isDuplicateResponse([], { status: "atteste", hash })).toBe(false);
  });
});
