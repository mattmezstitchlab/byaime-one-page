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
  it("ouvre l'accueil sur deux choix — Couple ou Wedding planner — avant toute question", () => {
    const markup = render(<LandingComposer />);

    expect(markup).toContain('data-testid="landing-composer"');
    expect(markup).toContain('data-testid="landing-persona"');
    expect(markup).toContain("Vous préparez ce mariage en tant que…");
    expect(markup).toContain('data-testid="landing-persona-couple" aria-pressed="false"');
    expect(markup).toContain('data-testid="landing-persona-pro" aria-pressed="false"');
    expect(markup).toContain("Couple");
    expect(markup).toContain("Wedding planner");
    // Aucune question, aucun champ, aucun bouton de création avant le choix.
    expect(markup).not.toContain('data-testid="landing-intention-form"');
    expect(markup).not.toContain('data-testid="landing-intention-input"');
    expect(markup).not.toContain('data-testid="landing-intention-submit"');
    expect(markup).not.toContain('data-testid="landing-intention-skip"');
    expect(markup).not.toContain('data-testid="landing-intention-finish"');
  });

  it("ne propose qu'un seul parcours : plus aucun champ libre alternatif", () => {
    const markup = render(<LandingComposer />);

    // Pas de bascule « une phrase », pas de textarea libre, pas de sélecteur
    // d'univers : les deux choix sont l'unique entrée.
    expect(markup).not.toContain("Raconter autrement");
    expect(markup).not.toContain('data-testid="landing-intention-mode"');
    expect(markup).not.toContain('data-testid="landing-intention-free"');
    expect(markup).not.toContain("<select");
    expect(markup).not.toContain("Choisir l’univers");
    expect(markup).not.toContain("Anniversaire");
    expect(markup).not.toContain("Séminaire");
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

  it("compose une phrase « mariage client » pour le persona professionnel", () => {
    const sentence = composeIntention(
      { date: "14 août 2027", place: "Lyon", guests: "80", budget: "15000", tone: "élégant" },
      { persona: "pro", currency: "EUR", locale: "fr" },
    );
    expect(sentence.startsWith("Le mariage client")).toBe(true);
    const draft = parseIntention(sentence);
    expect(draft.universe).toBe("Mariage");
    expect(draft.budget?.value).toBe(15000);
  });

  it("compose et fait comprendre une intention en anglais, en dollars", () => {
    const sentence = composeIntention(
      { date: "August 14, 2027", place: "Austin, Texas", guests: "120", budget: "25000", tone: "intimate" },
      { persona: "couple", currency: "USD", locale: "en" },
    );
    expect(sentence).toContain("Our wedding on August 14, 2027, near Austin");
    expect(sentence).toContain("120 guests");
    expect(sentence).toContain("$25,000");
    expect(sentence).toContain("intimate mood");

    const draft = parseIntention(sentence);
    expect(draft.universe).toBe("Mariage");
    expect(draft.guestsCount?.value).toBe(120);
    expect(draft.budget?.value).toBe(25000);
    expect(draft.currency).toBe("USD");
    expect(draft.city?.value).toMatch(/Austin/);
    expect(new Date(draft.pivot!.value as number).getFullYear()).toBe(2027);
  });

  it("respecte la devise choisie dans la phrase et le parseur", () => {
    const gbp = composeIntention({ budget: "20000" }, { currency: "GBP", locale: "en" });
    expect(gbp).toContain("£20,000");
    expect(parseIntention(gbp).currency).toBe("GBP");

    const mad = composeIntention({ budget: "200000" }, { currency: "MAD", locale: "fr" });
    expect(mad).toContain("200 000 DH");
    expect(parseIntention(mad).currency).toBe("MAD");
  });
});
