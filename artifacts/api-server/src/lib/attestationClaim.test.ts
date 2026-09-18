import { describe, expect, it } from "vitest";
import { buildFactView, factViewFingerprint } from "@workspace/aime-domain";
import { attestationClaimEligibility, countersignedMoments, profileProof, type ClaimableLink } from "./attestationClaim";

const link = (partial: Partial<ClaimableLink> = {}): ClaimableLink => ({
  id: "l1", projectId: "w1", providerId: "sax", revoked: false, claimEmail: "leo@example.com", claimedCardUserId: null, claimedAt: null, ...partial,
});
const base = { userId: "u-leo", hasCard: true, verifiedEmails: ["Leo@Example.com"], providerExists: true, closed: false };

describe("attestationClaimEligibility — la possession du lien ne prouve rien", () => {
  it("accepte une adresse confirmée par l'organisateur ET vérifiée dans le compte", () => {
    expect(attestationClaimEligibility({ ...base, link: link(), siblings: [link()] })).toBeNull();
  });

  it("refuse sans carte, sans adresse confirmée, ou avec une adresse non vérifiée", () => {
    expect(attestationClaimEligibility({ ...base, hasCard: false, link: link(), siblings: [link()] })).toMatch(/Carte Universelle/);
    expect(attestationClaimEligibility({ ...base, link: link({ claimEmail: null }), siblings: [link({ claimEmail: null })] })).toMatch(/refusé/);
    expect(attestationClaimEligibility({ ...base, verifiedEmails: ["autre@example.com"], link: link(), siblings: [link()] })).toMatch(/refusé/);
  });

  it("refuse une adresse partagée entre deux prestataires du même Monde", () => {
    const other = link({ id: "l2", providerId: "dj" });
    expect(attestationClaimEligibility({ ...base, link: link(), siblings: [link(), other] })).toMatch(/adresse personnelle unique/);
  });

  it("tolère plusieurs liens du MÊME prestataire avec la même adresse (un Moment par lien)", () => {
    const second = link({ id: "l2" });
    expect(attestationClaimEligibility({ ...base, link: link(), siblings: [link(), second] })).toBeNull();
  });

  it("une Carte n'est qu'une contrepartie par Monde", () => {
    const claimedAsDj = link({ id: "l2", providerId: "dj", claimedCardUserId: "u-leo", claimedAt: new Date() });
    expect(attestationClaimEligibility({ ...base, link: link(), siblings: [link(), claimedAsDj] })).toMatch(/autre professionnel/);
  });

  it("est idempotent pour la même carte, fermé pour une autre", () => {
    const mine = link({ claimedCardUserId: "u-leo", claimedAt: new Date() });
    expect(attestationClaimEligibility({ ...base, link: mine, siblings: [mine] })).toBeNull();
    const theirs = link({ claimedCardUserId: "u-nina", claimedAt: new Date() });
    expect(attestationClaimEligibility({ ...base, link: theirs, siblings: [theirs] })).toMatch(/autre carte/);
  });

  it("refuse un Monde clôturé ou un lien révoqué", () => {
    expect(attestationClaimEligibility({ ...base, closed: true, link: link(), siblings: [link()] })).toMatch(/clôturé/);
    expect(attestationClaimEligibility({ ...base, link: link({ revoked: true }), siblings: [] })).toMatch(/révoqué/);
  });
});

describe("countersignedMoments — ce que le Profil lit, et rien de plus", () => {
  const GIG = Date.UTC(2026, 7, 1, 20);
  const data = {
    title: "secret",
    budget: { value: 30000 },
    guests: [{ id: "g1", name: "Tante Odile" }],
    timeline: [
      { id: "bal", time: GIG, durationMinutes: 180, title: "Bal", location: "Orangerie", relations: [{ kind: "provider", id: "sax" }, { kind: "document", id: "f-sax" }] },
      { id: "repet", time: GIG - 86_400_000, title: "Répétition", relations: [{ kind: "provider", id: "sax" }] },
    ],
    providers: [{ id: "sax", role: "Saxophoniste", name: "Léo" }, { id: "traiteur", role: "Traiteur", amountCents: 900000 }],
    documents: [{ id: "f-sax", kind: "facture", providerId: "sax", title: "Cachet", at: GIG }],
    payments: [{ id: "p1", state: "paye", providerId: "sax", documentId: "f-sax", amountCents: 15_000, at: GIG + 86_400_000 }],
  };
  const project = { id: "w1", title: "Mariage de C & J", data };
  const links = [{ eventId: "bal", providerId: "sax", revoked: false }, { eventId: "repet", providerId: "sax", revoked: false }, { eventId: "bal", providerId: "traiteur", revoked: false }];
  const hash = factViewFingerprint(buildFactView(data, "bal", "sax")!);

  it("liste les Moments du prestataire, du plus récent au plus ancien, avec leur état", () => {
    const moments = countersignedMoments(project, links.filter(l => l.providerId === "sax"), [
      { eventId: "bal", providerId: "sax", status: "atteste", hash, respondedAt: "2026-09-18T10:00:00Z" },
    ]);
    expect(moments.map(m => [m.eventId, m.state])).toEqual([["bal", "atteste"], ["repet", "declare"]]);
    expect(moments[0]).toMatchObject({ projectTitle: "Mariage de C & J", providerRole: "Saxophoniste", amountCents: 15_000, location: "Orangerie", attestedAt: "2026-09-18T10:00:00.000Z" });
  });

  it("ne laisse rien filtrer du Monde au-delà du fait signé", () => {
    const text = JSON.stringify(countersignedMoments(project, links, []));
    expect(text).not.toContain("Odile");
    expect(text).not.toContain("30000");
    expect(text).not.toContain("900000");
  });

  it("marque périmée une signature dont le fait a bougé", () => {
    const changed = { ...project, data: { ...data, payments: [{ ...data.payments[0], amountCents: 20_000 }] } };
    const [bal] = countersignedMoments(changed, [links[0]], [{ eventId: "bal", providerId: "sax", status: "atteste", hash, respondedAt: "2026-09-18T10:00:00Z" }]);
    expect(bal.state).toBe("perime");
    expect(bal.attestedAt).toBeUndefined();
  });

  it("résume la preuve : seuls les Moments attestés comptent", () => {
    const moments = countersignedMoments(project, links.filter(l => l.providerId === "sax"), [
      { eventId: "bal", providerId: "sax", status: "atteste", hash, respondedAt: "2026-09-18T10:00:00Z" },
    ]);
    expect(profileProof(moments)).toEqual({ moments: 2, attested: 1, worlds: 1, amountCents: 15_000, since: GIG });
    expect(profileProof([])).toEqual({ moments: 0, attested: 0, worlds: 0, amountCents: 0, since: undefined });
  });
});
