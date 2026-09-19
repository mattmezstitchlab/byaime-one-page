import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { TimelineEvent } from "@/lib/types";

const DAY = 86_400_000;
const now = Date.now();

const event = (id: string, phase: TimelineEvent["phase"], time: number, title: string): TimelineEvent => ({
  id,
  time,
  durationMinutes: 60,
  kind: "evenement",
  title,
  status: "prepare",
  confidence: "confirme",
  phase,
  universe: "vie",
  provenance: "real",
  visibility: "equipe",
  relations: [],
  dependencyIds: [],
  resources: [],
});

/* Une seule fixture de Monde : ce test ne vérifie pas les comptes (couverts par
   avant-overview et apres-overview), mais le branchement des trois têtes. */
vi.mock("@/store/project-store", () => ({
  useProject: () => ({
    project: {
      id: "p1",
      title: "Camille & Jules",
      universe: "vie",
      currency: "EUR",
      pivot: { value: now + 30 * DAY },
      city: { value: "Lille" },
      venue: { value: "Le Domaine" },
      timeline: [
        event("e1", "avant", now + 9 * DAY, "Dégustation"),
        event("e2", "pendant", now + 30 * DAY, "Cérémonie"),
        event("e3", "apres", now + 60 * DAY, "Album"),
      ],
      tasks: [{ id: "t1", title: "Relancer le traiteur", phase: "3-6m", status: "en_cours", priority: "haute", dueDate: now - DAY }],
      providers: [{ id: "pr1", category: "traiteur", role: "Traiteur", name: "Maison Leroy", status: "devis", amountCents: 620_000, nextAction: "Signer le devis" }],
      payments: [{ id: "pay1", label: "Acompte salle", amountCents: 100_000, at: now - DAY, state: "paye" }],
      guests: [{ id: "g1", name: "Camille", role: "invite", rsvp: "confirme" }],
      memories: [],
    },
    currentRole: "owner",
    canEdit: true,
    addEntity: () => {},
    updateEntity: () => {},
    updateProject: () => {},
    removeEntity: () => {},
  }),
}));

import { UniversalTimeline } from "./UniversalTimeline";

describe("UniversalTimeline — une tête par période", () => {
  it("montre l'état des préparations quand tous les Moments sont dans l'Avant", () => {
    const markup = renderToStaticMarkup(
      <UniversalTimeline events={[event("e1", "avant", now + 9 * DAY, "Dégustation")]} onMomentAction={() => undefined} capabilities={{ seeFinances: true, manageDocuments: true }} />,
    );

    expect(markup).toContain('data-testid="avant-overview"');
    expect(markup).not.toContain('data-testid="day-run"');
    expect(markup).not.toContain('data-testid="apres-overview"');
  });

  it("montre le déroulé du Jour J quand tous les Moments sont le jour même", () => {
    const markup = renderToStaticMarkup(
      <UniversalTimeline events={[event("e2", "pendant", now + 30 * DAY, "Cérémonie")]} onMomentAction={() => undefined} capabilities={{ seeFinances: true, manageDocuments: true }} />,
    );

    expect(markup).toContain('data-testid="day-run"');
    expect(markup).not.toContain('data-testid="avant-overview"');
    expect(markup).not.toContain('data-testid="apres-overview"');
  });

  it("donne une tête à l'Après : souvenirs, images, vidéos, remerciements", () => {
    const markup = renderToStaticMarkup(
      <UniversalTimeline events={[event("e3", "apres", now + 60 * DAY, "Album")]} onMomentAction={() => undefined} capabilities={{ seeFinances: true, manageDocuments: true }} />
    );

    expect(markup).toContain('data-testid="apres-overview"');
    expect(markup).not.toContain('data-testid="avant-overview"');
    expect(markup).not.toContain('data-testid="day-run"');
  });

  it("sur le fil qui mélange les périodes, chaque période a sa tête à son entrée", () => {
    const markup = renderToStaticMarkup(
      <UniversalTimeline
        events={[
          event("e1", "avant", now + 9 * DAY, "Dégustation"),
          event("e2", "pendant", now + 30 * DAY, "Cérémonie"),
          event("e3", "apres", now + 60 * DAY, "Album"),
        ]}
        onMomentAction={() => undefined}
        capabilities={{ seeFinances: true, manageDocuments: true }}
      />,
    );

    /* Une seule verticalité (19/09) : les têtes ne sont plus des modes, ce sont
       des chapitres. Chacune se pose UNE fois, à l'entrée de sa période. Le
       Jour J n'a pas de tête ici — sa régie est un écran à part, appelé depuis
       la barre de lecture, pas un habillage du déroulé. */
    expect(markup.split('data-testid="avant-overview"').length - 1).toBe(1);
    expect(markup.split('data-testid="apres-overview"').length - 1).toBe(1);
    expect(markup).not.toContain('data-testid="day-run"');
    // Les trois Moments restent listés, dans l'ordre du temps.
    expect(markup).toContain("Dégustation");
    expect(markup).toContain("Cérémonie");
    expect(markup).toContain("Album");
    expect(markup.indexOf("Dégustation")).toBeLessThan(markup.indexOf("Cérémonie"));
    expect(markup.indexOf("Cérémonie")).toBeLessThan(markup.indexOf("Album"));
  });

  it("ne propose aucune tête sur une vue vide", () => {
    const markup = renderToStaticMarkup(<UniversalTimeline events={[]} onMomentAction={() => undefined} capabilities={{ seeFinances: true, manageDocuments: true }} />);

    expect(markup).toContain("Aucun événement dans cette vue.");
    expect(markup).not.toContain('data-testid="avant-overview"');
  });
});
