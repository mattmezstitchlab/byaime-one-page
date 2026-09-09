import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProfileIdentityHero } from "./PublicProfile";

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
