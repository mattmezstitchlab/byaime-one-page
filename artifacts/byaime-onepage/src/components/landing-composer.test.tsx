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
  it("ouvre l'accueil sur le champ de saisie : univers d'abord, puis une information à la fois", () => {
    const markup = render(<LandingComposer />);

    expect(markup).toContain('data-testid="landing-composer"');
    expect(markup).toContain("Choisir l’univers");
    expect(markup).toContain("L’univers d’abord");
    expect(markup).toContain("1/6");
    expect(markup).toContain("Choisissez d’abord l’univers de votre projet.");
    expect(markup).toContain("Raconter autrement, en une phrase");
  });

  it("garde le select et le champ accessibles hors souris", () => {
    const markup = render(<LandingComposer />);

    expect(markup).toContain('aria-label="Univers du projet"');
    expect(markup).toContain('aria-label="Quelle date, même approximative ?"');
    expect(markup).toContain('aria-describedby="landing-intention-hint"');
    // Aucune question ne peut être saisie avant l'univers : le champ est désactivé.
    expect(markup).toContain("disabled");
  });

  it("propose la phrase libre et son retour aux questions", () => {
    const markup = render(<LandingComposer />);
    expect(markup).toContain('data-testid="landing-intention-mode"');
  });

  it("compose une phrase que le parseur local du Monde comprend déjà", () => {
    const sentence = composeIntention("Mariage", {
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
    const sentence = composeIntention("Autre événement", {});
    expect(sentence).toBe("Notre événement.");

    const draft = parseIntention(sentence);
    expect(draft.guestsCount?.value).toBeNull();
    expect(draft.budget?.value).toBeNull();
    expect(draft.city?.value).toBeNull();
  });

  it("accepte une réponse déjà formulée avec sa préposition", () => {
    const sentence = composeIntention("Mariage", { place: "près de Nantes" });
    expect(sentence).toContain("près de Nantes");
  });
});
