import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ProfileFrise } from "./ProfileFrise";
import { buildFrise } from "@/lib/frise";
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
  ],
  tasks: [{ id: "t1", title: "Relancer le traiteur", phase: "3-6m", status: "en_cours", priority: "haute", dueDate: NOW - DAY }],
  documents: [{ id: "d1", title: "Contrat salle", kind: "contrat", at: NOW - 5 * DAY }],
  payments: [
    { id: "pay1", label: "Acompte salle", amountCents: 100_000, at: NOW - 2 * DAY, state: "paye" },
    { id: "pay2", label: "Solde traiteur", amountCents: 620_000, at: NOW - DAY, state: "du", dueDate: NOW + 20 * DAY },
  ],
  providers: [{ id: "pr1", category: "traiteur", role: "Traiteur", status: "devis", amountCents: 620_000 }],
  guests: [{ id: "g1", name: "Camille", role: "invite", rsvp: "en_attente" }],
  memories: [{ id: "m1", kind: "message", title: "Merci", status: "a_faire" }],
  music: [],
  team: [],
} as unknown as WorldProject;

const noop = () => {};

const render = () =>
  renderToStaticMarkup(
    <ProfileFrise
      frise={buildFrise(project, [], NOW)}
      pivot={project.pivot.value}
      currency="EUR"
      onOpenEntity={noop}
      onOpenPanel={noop}
    />,
  );

describe("ProfileFrise (la frise « Tout voir »)", () => {
  it("ouvre un couloir par nature de chose, avec son compte", () => {
    const markup = render();

    expect(markup).toContain('data-testid="profile-frise"');
    for (const lane of ["moments", "invites", "taches", "documents", "argent"]) {
      expect(markup).toContain(`data-testid="profile-frise-lane-${lane}"`);
    }
    expect(markup).toContain("Dégustation");
    expect(markup).toContain("Cérémonie");
    expect(markup).toContain("Contrat salle");
    // Un couloir vide le dit, au lieu de disparaître silencieusement.
    expect(markup).toContain("Rien de daté ici pour l");
  });

  it("garde les agrégats dans un bandeau fixe, hors de l'axe", () => {
    const markup = render();

    expect(markup).toContain('data-testid="profile-frise-stats"');
    expect(markup).toContain("J-30");
    expect(markup).toContain("1 tâche en cours");
    // La fixture n'a qu'un invité, encore en attente.
    expect(markup).toContain("0 confirmé · 1 en attente");
    expect(markup).toContain("payés /");
  });

  it("matérialise le Jour J sur l'axe", () => {
    expect(render()).toContain('data-testid="profile-frise-pivot"');
  });

  it("range le non daté dans la gouttière, avec un accès au bon panneau", () => {
    const markup = render();

    expect(markup).toContain('data-testid="profile-frise-undated"');
    expect(markup).toContain("Non daté");
    expect(markup).toContain("Prestataires");
    expect(markup).toContain("Souvenirs");
    // Les trois couloirs vides ne produisent aucune entrée fantôme.
    expect(markup).not.toContain("Morceaux");
    expect(markup).not.toContain("Équipe");
  });
});
