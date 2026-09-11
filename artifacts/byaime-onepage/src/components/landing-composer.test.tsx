import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import type { ReactNode } from "react";

vi.mock("@/store/project-store", () => ({
  useProject: () => ({
    createProjectFromIntention: vi.fn(() => true),
    setIntentionText: vi.fn(),
  }),
}));

import { LandingComposer, composeIntention } from "./LandingComposer";
import { parseIntention } from "@/lib/parser";

const render = (node: ReactNode) =>
  renderToStaticMarkup(<Router hook={() => ["/", () => {}] as const}>{node}</Router>);

describe("LandingComposer", () => {
  it("ouvre l'accueil sur une capsule spécialisée mariage, une information à la fois", () => {
    const markup = render(<LandingComposer />);

    expect(markup).toContain('data-testid="landing-composer"');
    // Le seul univers que l'app sait accompagner est affiché, il n'est pas proposé au choix.
    expect(markup).toContain("Notre mariage");
    expect(markup).toContain("La date du mariage, même approximative ?");
    expect(markup).toContain("1/5");
    expect(markup).toContain("Raconter autrement, en une phrase");
  });

  it("ne promet aucun autre univers : pas de sélecteur, saisie immédiate", () => {
    const markup = render(<LandingComposer />);

    expect(markup).not.toContain("<select");
    expect(markup).not.toContain("Choisir l’univers");
    expect(markup).not.toContain("Anniversaire");
    expect(markup).not.toContain("Séminaire");
    // Le champ de la première question est atteignable au clavier sans étape préalable.
    expect(markup).toContain('aria-label="La date du mariage, même approximative ?"');
    expect(markup).toContain('aria-describedby="landing-intention-hint"');
  });

  it("propose la phrase libre et son retour aux questions", () => {
    const markup = render(<LandingComposer />);
    expect(markup).toContain('data-testid="landing-intention-mode"');
    // La zone de texte libre n'apparaît qu'après bascule.
    expect(markup).not.toContain('data-testid="landing-intention-free"');
  });

  it("compose une phrase que le parseur local du Monde comprend déjà", () => {
    const sentence = composeIntention({
      date: "14 août 2027",
      place: "Lille",
      guests: "120",
      budget: "20 000",
      tone: "champêtre",
    });

    expect(sentence).toBe("Notre mariage le 14 août 2027, près de Lille, 120 invités, 20 000 €, ambiance champêtre.");

    const draft = parseIntention(sentence);
    expect(draft.universe).toBe("Mariage");
    expect(draft.guestsCount?.value).toBe(120);
    expect(draft.budget?.value).toBe(20000);
    expect(draft.city?.value).toMatch(/Lille/);
    expect(new Date(draft.pivot!.value as number).getFullYear()).toBe(2027);
  });

  it("n'invente aucune information absente", () => {
    const sentence = composeIntention({});
    expect(sentence).toBe("Notre mariage.");

    const draft = parseIntention(sentence);
    expect(draft.guestsCount?.value).toBeNull();
    expect(draft.budget?.value).toBeNull();
    expect(draft.city?.value).toBeNull();
  });

  it("accepte une réponse déjà formulée avec sa préposition", () => {
    const sentence = composeIntention({ place: "près de Nantes" });
    expect(sentence).toContain("près de Nantes");
  });
});
