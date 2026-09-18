import { describe, expect, it } from "vitest";
import { worldAlerts } from "./world-alerts";
import { factView, factViewFingerprint } from "./attestation";
import { createInitialProject, parseIntention } from "./parser";
import {
  attestedCachets,
  deadlineMomentId,
  deadlinesForPrestation,
  employedProviders,
  HOURS_PER_CACHET,
  HOURS_THRESHOLD,
  hoursProjection,
  legalDeadlines,
  pendingDeadlineMoments,
  POST_DECLARATION_DELAY_MS,
  PRIOR_DECLARATION_WINDOW_MS,
  referenceWindowStart,
} from "./intermittent";
import type { Document, Payment, Provider, TimelineEvent, WorldProject } from "./types";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 8, 18, 12);
const GIG = Date.UTC(2027, 5, 12, 20); // 12 juin 2027, 20 h

const provider = (partial: Partial<Provider> & Pick<Provider, "id">): Provider => ({ category: "musique", role: "Saxophoniste", name: "Léo", status: "reserve", ...partial });
const moment = (partial: Partial<TimelineEvent> & Pick<TimelineEvent, "id" | "time">): TimelineEvent => ({
  kind: "evenement", title: partial.id, status: "prepare", confidence: "confirme", phase: "pendant", universe: "Mariage", provenance: "real", ...partial,
});
const document = (partial: Partial<Document> & Pick<Document, "id" | "kind">): Document => ({ title: partial.id, at: NOW - DAY, ...partial });
const payment = (partial: Partial<Payment> & Pick<Payment, "id" | "state">): Payment => ({ label: partial.id, amountCents: 15_000, at: NOW - DAY, ...partial });

const sax = provider({ id: "sax", employment: "guso" });
const dj = provider({ id: "dj", role: "DJ", name: "Nina" });
const gig = moment({ id: "bal", time: GIG, durationMinutes: 180, relations: [{ kind: "provider", id: "sax" }, { kind: "provider", id: "dj" }] });

describe("employedProviders / prestationsFor — qui est employé, et pour quels Moments", () => {
  it("ne retient que les prestataires en cachet", () => {
    expect(employedProviders({ providers: [sax, dj, provider({ id: "s", employment: "structure" }), provider({ id: "f", employment: "facture" })] }).map(p => p.id)).toEqual(["sax", "s"]);
  });

  it("ignore les Moments suggérés : une prestation non adoptée n'a pas d'échéance", () => {
    const suggested = moment({ id: "idee", time: GIG + 30 * DAY, provenance: "suggested", relations: [{ kind: "provider", id: "sax" }] });
    expect(legalDeadlines({ providers: [sax], timeline: [gig, suggested] }).map(d => d.eventId)).toEqual(["bal", "bal"]);
  });
});

describe("deadlinesForPrestation — le calendrier légal découle du Moment", () => {
  const [prior, post] = deadlinesForPrestation("sax", gig);

  it("place la déclaration préalable avant le début, ouverte un mois avant", () => {
    expect(prior.kind).toBe("declaration_prealable");
    expect(prior.dueAt).toBe(GIG);
    expect(prior.opensAt).toBe(GIG - PRIOR_DECLARATION_WINDOW_MS);
    expect(prior.suggestedAt).toBe(GIG - DAY);
  });

  it("place la déclaration unique quinze jours après la FIN de la prestation", () => {
    const end = GIG + 180 * 60_000;
    expect(post.kind).toBe("declaration_unique");
    expect(post.opensAt).toBe(end);
    expect(post.dueAt).toBe(end + POST_DECLARATION_DELAY_MS);
  });

  it("trie toutes les échéances du Monde par date butoir, sans en créer pour le DJ facturé", () => {
    const all = legalDeadlines({ providers: [sax, dj], timeline: [gig] });
    expect(all.map(d => d.providerId)).toEqual(["sax", "sax"]);
    expect(all[0].dueAt).toBeLessThan(all[1].dueAt);
  });
});

describe("pendingDeadlineMoments — des Moments suggérés, jamais imposés, jamais dupliqués", () => {
  const project = { providers: [sax, dj], timeline: [gig] };

  it("propose deux Moments reliés à la prestation et au prestataire", () => {
    const pending = pendingDeadlineMoments(project);
    expect(pending).toHaveLength(2);
    for (const item of pending) {
      expect(item.provenance).toBe("suggested");
      expect(item.status).toBe("a_valider");
      expect(item.visibility).toBe("prive");
      expect(item.dependencyIds).toEqual(["bal"]);
      expect(item.relations).toEqual([{ kind: "provider", id: "sax", role: "employe" }]);
      expect(item.detail).toContain("2026-09-18");
    }
    expect(pending.map(item => item.phase)).toEqual(["avant", "apres"]);
  });

  it("a un identifiant stable : une fois adopté, le Moment n'est plus proposé", () => {
    const [first] = pendingDeadlineMoments(project);
    expect(first.id).toBe(deadlineMomentId({ kind: "declaration_prealable", providerId: "sax", eventId: "bal" }));
    const adopted = { ...project, timeline: [gig, first] };
    expect(pendingDeadlineMoments(adopted).map(item => item.kind === "tache" && item.id)).toEqual([deadlineMomentId({ kind: "declaration_unique", providerId: "sax", eventId: "bal" })]);
  });

  it("n'est jamais « en retard » tant qu'il n'est pas adopté (world-alerts)", () => {
    const base = createInitialProject(parseIntention("Notre mariage le 12 juin 2027 à Lyon, 80 invités."), "Notre mariage le 12 juin 2027 à Lyon, 80 invités.");
    const pastGig = moment({ id: "passe", time: NOW - 40 * DAY, durationMinutes: 120, relations: [{ kind: "provider", id: "sax" }] });
    const full: WorldProject = { ...base, providers: [sax], timeline: [pastGig], guests: [] };
    const pending = pendingDeadlineMoments(full);
    expect(pending.every(item => item.time < NOW)).toBe(true);
    const alerts = worldAlerts({ ...full, timeline: [pastGig, ...pending] }, { now: NOW });
    expect(alerts.filter(alert => alert.kind === "retard")).toEqual([]);
    /* Mais ils demandent bien une décision. */
    expect(alerts.filter(alert => alert.kind === "a_confirmer").map(alert => alert.eventIds[0])).toEqual(pending.map(item => item.id));
  });
});

describe("attestedCachets / hoursProjection — le compteur est une projection du passé", () => {
  const documents = [
    document({ id: "f-sax-1", kind: "facture", providerId: "sax", at: NOW - 200 * DAY }),
    document({ id: "f-sax-2", kind: "facture", providerId: "sax", at: NOW - 100 * DAY }),
    document({ id: "f-sax-due", kind: "facture", providerId: "sax", at: NOW - 10 * DAY }),
    document({ id: "f-dj", kind: "facture", providerId: "dj", at: NOW - 50 * DAY }),
    document({ id: "devis-sax", kind: "devis", providerId: "sax" }),
  ];
  const payments = [
    payment({ id: "p1", state: "paye", providerId: "sax", documentId: "f-sax-1", at: NOW - 199 * DAY }),
    payment({ id: "p2", state: "paye", providerId: "sax", documentId: "f-sax-2", at: NOW - 99 * DAY }),
    payment({ id: "p3", state: "du", providerId: "sax", documentId: "f-sax-due" }),
    payment({ id: "p4", state: "paye", providerId: "dj", documentId: "f-dj", at: NOW - 49 * DAY }),
  ];
  const project = { providers: [sax, dj], documents, payments };

  it("ne compte que les factures réglées des prestataires en cachet", () => {
    const cachets = attestedCachets(project);
    expect(cachets.map(c => c.documentId)).toEqual(["f-sax-1", "f-sax-2"]);
    expect(cachets[0].at).toBe(NOW - 199 * DAY);
    expect(cachets[0].amountCents).toBe(15_000);
  });

  it("distingue les cachets déclarés des cachets contresignés (partie double)", () => {
    const gig1 = moment({ id: "gig1", time: NOW - 199 * DAY, relations: [{ kind: "provider", id: "sax" }, { kind: "document", id: "f-sax-1" }] });
    const view = factView(gig1, "sax", project);
    const signed = { ...project, timeline: [gig1], attestations: [{ id: "a", eventId: "gig1", providerId: "sax", status: "atteste" as const, hash: factViewFingerprint(view), respondedAt: NOW, amountCents: view.amountCents, time: gig1.time }] };
    const cachets = attestedCachets(signed);
    expect(cachets.map(c => [c.documentId, c.attested])).toEqual([["f-sax-1", true], ["f-sax-2", false]]);
    const projection = hoursProjection(cachets, NOW);
    expect(projection.hours).toBe(24);
    expect(projection.attestedHours).toBe(12);
    expect(projection.attestedCachets).toBe(1);
  });

  it("crédite douze heures par cachet dans la fenêtre de douze mois", () => {
    const projection = hoursProjection(attestedCachets(project), NOW);
    expect(projection.cachets).toBe(2);
    expect(projection.hours).toBe(2 * HOURS_PER_CACHET);
    expect(projection.attestedHours).toBe(0);
    expect(projection.remainingHours).toBe(HOURS_THRESHOLD - 24);
    expect(projection.remainingCachets).toBe(Math.ceil((HOURS_THRESHOLD - 24) / HOURS_PER_CACHET));
    expect(projection.disclaimer).toContain("ne garantit aucune ouverture de droits");
  });

  it("fait sortir un cachet de la fenêtre quand le regard avance", () => {
    const later = NOW + 200 * DAY;
    expect(referenceWindowStart(later)).toBeLessThan(later);
    expect(hoursProjection(attestedCachets(project), later).cachets).toBe(1);
    expect(hoursProjection(attestedCachets(project), NOW - 150 * DAY).cachets).toBe(1);
  });

  it("ne compte jamais le futur ni une facture due", () => {
    const withFuture = { ...project, payments: [...payments, payment({ id: "p5", state: "paye", providerId: "sax", documentId: "f-sax-due", at: NOW + 5 * DAY })] };
    expect(hoursProjection(attestedCachets(withFuture), NOW).cachets).toBe(2);
    expect(hoursProjection(attestedCachets(withFuture), NOW + 6 * DAY).cachets).toBe(3);
  });
});
