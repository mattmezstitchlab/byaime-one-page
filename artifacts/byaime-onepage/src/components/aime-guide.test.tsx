import { readFileSync } from "node:fs";
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

import { AimeGuide, AimeScreenHint } from "./AimeGuide";
import { LandingPage } from "@/pages/Landing";

const render = (node: ReactNode) => renderToStaticMarkup(<Router hook={() => ["/", () => {}] as const}>{node}</Router>);

describe("panneau de guidage d'AIME", () => {
  it("décrit l'écran connu qu'il éclaire, avec les actions qui existent", () => {
    const markup = render(<AimeGuide project={null} fallbackScreen="panel:seating" />);

    expect(markup).toContain('data-testid="aime-guide"');
    expect(markup).toContain("Vous êtes ici : Plan de table");
    expect(markup).toContain("Ouvrir le plan de table");
    expect(markup).toContain("Ce qui débloque le plus maintenant");
    // Sans Monde, la seule étape réellement bloquante est la première phrase.
    expect(markup).toContain("Poser la première phrase du mariage");
    expect(markup).toContain("AIME, où je saisis les réponses");
  });

  it("ne devine pas d'écran quand aucun n'est déclaré", () => {
    const markup = render(<AimeGuide project={null} fallbackScreen={null} />);
    expect(markup).toContain("AIME vous oriente");
    expect(markup).not.toContain("Vous êtes ici");
  });

  it("chaque écran peut appeler l'aide depuis son chrome", () => {
    const markup = render(<AimeScreenHint />);
    expect(markup).toContain('data-testid="aime-guide-hint"');
    expect(markup).toContain("Expliquer cet écran");
  });

  it("l'accueil offre l'aide sans l'imposer", () => {
    const markup = render(<LandingPage />);
    expect(markup).toContain('data-testid="landing-guide-button"');
    expect(markup).toContain("Comment ça marche");
    // La modale de guidage ne s'ouvre que sur clic : rien d'ouvert au rendu.
    expect(markup).not.toContain('data-testid="aime-guide"');
  });

  it("les écrans publics sans compte ont aussi leur guide", () => {
    const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
    expect(app).toContain('<AimePublicGuide screen="rsvp"');
    expect(app).toContain('<AimePublicGuide screen="invite"');
  });

  /*
   * Le panneau de commande est le point d'entrée de l'agent sur tous les écrans
   * privés. On vérifie ici le branchement, sans simuler Clerk ni le store.
   */
  it("la barre de commande ouvre sur l'onglet de guidage", () => {
    const source = readFileSync(new URL("./CommandBar.tsx", import.meta.url), "utf8");
    expect(source).toContain('useState<"guide" | "command">("guide")');
    expect(source).toContain('role="tablist"');
    expect(source).toContain("Me guider");
    expect(source).toContain("Commander une action");
    expect(source).toContain("<AimeGuide");
  });
});
