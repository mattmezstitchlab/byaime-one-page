import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProfileIdentityHero, ProfilePracticalInfo } from "./PublicProfile";

describe("ProfileIdentityHero", () => {
  it("keeps identity metadata in a wrapped block below the title", () => {
    const markup = renderToStaticMarkup(
      <ProfileIdentityHero
        displayName="Alexandrine de La Très Longue Vallée du Nord"
        subtitle="Une description volontairement longue pour vérifier que le texte reste dans un flux vertical lisible sur les écrans étroits."
        city="Lille Métropole Européenne — Quartier historique particulièrement étendu"
        pivot={Date.UTC(2027, 8, 18)}
        isPrivatePreview={false}
        onEditIdentity={() => {}}
      />,
    );

    expect(markup).toContain('data-testid="profile-identity-hero"');
    expect(markup).toContain(">Identité<");
    expect(markup).toContain('data-testid="profile-identity-meta"');
    expect(markup).toContain("flex-wrap");
    expect(markup).toContain("[overflow-wrap:anywhere]");
  });
});

describe("ProfilePracticalInfo", () => {
  it("shows guests the venue, parking, access and rain plan", () => {
    const markup = renderToStaticMarkup(
      <ProfilePracticalInfo
        practical={{ venue: "Le Domaine", parking: "Entrée nord", accessibility: "Accès sans marche", weatherFallback: "Orangerie" }}
        isPrivatePreview={false}
        onEdit={() => {}}
      />,
    );

    expect(markup).toContain('data-testid="profile-practical"');
    expect(markup).toContain('data-testid="profile-practical-venue"');
    expect(markup).toContain("Le Domaine");
    expect(markup).toContain("Entrée nord");
    expect(markup).toContain("Accès sans marche");
    expect(markup).toContain("Orangerie");
    expect(markup).not.toContain('data-testid="profile-practical-edit"');
  });

  it("renders nothing for guests while the couple has published no practical info", () => {
    expect(renderToStaticMarkup(<ProfilePracticalInfo isPrivatePreview={false} onEdit={() => {}} />)).toBe("");
  });

  it("tells the couple what is missing and lets them open the logistics panel", () => {
    const markup = renderToStaticMarkup(<ProfilePracticalInfo practical={{ parking: " " }} isPrivatePreview onEdit={() => {}} />);

    expect(markup).toContain('data-testid="profile-practical-empty"');
    expect(markup).toContain('data-testid="profile-practical-edit"');
  });
});
