import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GuidesPage } from "./Guides";
import { Router } from "wouter";

describe("GuidesPage", () => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Router hook={() => ["/guides", () => {}]}>{children}</Router>
  );

  it("renders the main title and all four demo concepts", () => {
    const markup = renderToStaticMarkup(<Wrapper><GuidesPage /></Wrapper>);
    expect(markup).toContain('data-testid="guides-page"');
    
    // Check main conceptual headers
    expect(markup).toContain("Un seul système, plusieurs réalités");
    expect(markup).toContain("Créer un Monde");
    expect(markup).toContain("Les Rôles et Frontières");
    expect(markup).toContain("AI · + · ME");
  });

  it("renders desktop and mobile demo selectors with data-testids", () => {
    const markup = renderToStaticMarkup(<Wrapper><GuidesPage /></Wrapper>);
    expect(markup).toContain('data-testid="demo-select-roles-desktop"');
    expect(markup).toContain('data-testid="demo-select-creation-mobile"');
  });

  it("renders player controls with correct aria-labels", () => {
    const markup = renderToStaticMarkup(<Wrapper><GuidesPage /></Wrapper>);
    expect(markup).toContain('data-testid="demo-play-pause"');
    expect(markup).toContain('aria-label="Mettre en pause"');
    expect(markup).toContain('data-testid="demo-replay"');
    expect(markup).toContain('aria-label="Rejouer la démonstration"');
  });

  it("describes only the role boundaries enforced by the server", () => {
    const markup = renderToStaticMarkup(<Wrapper><GuidesPage /></Wrapper>);
    expect(markup).toContain(
      "Quatre rôles font varier les actions disponibles et masquent les informations d’organisation sensibles.",
    );
    expect(markup).not.toContain("chiffré");
    expect(markup).not.toContain("les autres invités");
  });
});
