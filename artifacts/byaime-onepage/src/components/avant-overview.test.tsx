import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { formatCents } from "@/lib/money";

/* Le rôle change d'un test à l'autre : la fixture est hoistée pour que le mock
   du store puisse la lire sans tomber dans la zone morte temporaire. */
const ctx = vi.hoisted(() => {
  const DAY = 86_400_000;
  const now = Date.now();
  return {
    role: "owner",
    project: {
      id: "p1",
      currency: "EUR",
      pivot: { value: now + 30 * DAY },
      tasks: [
        { id: "t1", title: "Relancer le traiteur", phase: "3-6m", status: "en_cours", priority: "haute", dueDate: now - 2 * DAY },
        { id: "t2", title: "Choisir les faire-part", phase: "6-12m", status: "a_faire", priority: "normale", dueDate: now + 5 * DAY },
        { id: "t3", title: "Réserver la salle", phase: "12m+", status: "termine", priority: "haute" },
      ],
      providers: [
        { id: "pr1", category: "traiteur", role: "Traiteur", name: "Maison Leroy", status: "devis", amountCents: 620_000, nextAction: "Signer le devis" },
        { id: "pr2", category: "photo", role: "Photographe", name: "Studio Nord", status: "reserve", amountCents: 180_000 },
      ],
      payments: [
        { id: "pay1", label: "Acompte salle", amountCents: 100_000, at: now - DAY, state: "paye" },
        { id: "pay2", label: "Solde traiteur", amountCents: 620_000, at: now, state: "du" },
      ],
      guests: [
        { id: "g1", name: "Camille", role: "invite", rsvp: "confirme" },
        { id: "g2", name: "Jules", role: "invite", rsvp: "en_attente" },
        { id: "g3", name: "Ana", role: "invite", rsvp: "en_attente" },
      ],
      timeline: [
        { id: "e1", title: "Essayage", time: now - DAY, phase: "avant", kind: "evenement", status: "execute", confidence: "confirme", universe: "vie", visibility: "equipe" },
        { id: "e2", title: "Dégustation", time: now + 9 * DAY, phase: "avant", kind: "evenement", status: "prepare", confidence: "confirme", universe: "vie", visibility: "equipe" },
      ],
      memories: [],
    },
  };
});

vi.mock("@/store/project-store", () => ({
  useProject: () => ({ project: ctx.project, currentRole: ctx.role }),
}));

import { AvantOverview } from "./AvantOverview";

describe("AvantOverview (tête du mode Avant)", () => {
  beforeEach(() => {
    ctx.role = "owner";
  });

  it("résume les préparations avec les comptes réels et leurs accès directs", () => {
    const markup = renderToStaticMarkup(<AvantOverview />);

    expect(markup).toContain('data-testid="avant-overview"');
    expect(markup).toContain("J-30");
    // Le jalon passé ne revient pas : seul le prochain est annoncé.
    expect(markup).toContain("Prochain jalon : Dégustation");
    expect(markup).not.toContain("Essayage");
    // 2 tâches ouvertes (la troisième est terminée), dont 1 en retard.
    expect(markup).toContain("2 tâches en cours, dont 1 en retard");
    expect(markup).toContain("Relancer le traiteur");
    expect(markup).toContain("1 à réserver · 1 réservé");
    expect(markup).toContain("Maison Leroy : Signer le devis");
    expect(markup).toContain("Ouvrir le planning");
    expect(markup).toContain("Ouvrir les prestataires");
  });

  it("montre l'argent engagé et déjà payé, sans inventer de solde", () => {
    const markup = renderToStaticMarkup(<AvantOverview />);

    expect(markup).toContain(`${formatCents(100_000, "EUR")} payés sur ${formatCents(800_000, "EUR")} engagés`);
    expect(markup).toContain("1 paiement dû");
    expect(markup).toContain("Ouvrir le budget");
  });

  it("remplace l'argent par les réponses des invités quand le rôle n'y a pas accès", () => {
    ctx.role = "family";
    const markup = renderToStaticMarkup(<AvantOverview />);

    expect(markup).not.toContain('data-testid="avant-overview-budget"');
    expect(markup).toContain('data-testid="avant-overview-guests"');
    expect(markup).toContain("1 confirmé · 2 en attente");
    expect(markup).not.toContain("Ouvrir le budget");
  });
});
