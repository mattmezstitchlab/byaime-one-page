import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DayOfGuestEntry } from "./DayOfGuestEntry";

const noop = () => {};

describe("DayOfGuestEntry", () => {
  it("gives the couple the mini-site link and its state once published", () => {
    const markup = renderToStaticMarkup(
      <DayOfGuestEntry
        published
        profileUrl="/profil/project-1"
        canPublish
        practicalReady
        onPublish={noop}
        onHide={noop}
        onCopy={noop}
        onEditPractical={noop}
      />,
    );

    expect(markup).toContain('data-testid="dayof-guest-entry"');
    expect(markup).toContain('data-testid="dayof-guest-link"');
    expect(markup).toContain('href="/profil/project-1"');
    expect(markup).toContain('data-testid="dayof-guest-copy"');
    expect(markup).toContain(">En ligne<");
    expect(markup).toContain("Lieu, accès et plan B sont publiés");
  });

  it("offers publication while the mini-site is hidden, and hides it again afterwards", () => {
    const hidden = renderToStaticMarkup(
      <DayOfGuestEntry
        published={false}
        profileUrl="/profil/project-1"
        canPublish
        practicalReady={false}
        onPublish={noop}
        onHide={noop}
        onCopy={noop}
        onEditPractical={noop}
      />,
    );

    expect(hidden).toContain('data-testid="dayof-guest-publish"');
    expect(hidden).not.toContain('data-testid="dayof-guest-link"');
    expect(hidden).toContain(">Masqué<");
    expect(hidden).toContain("Aucune info pratique publiée");

    const published = renderToStaticMarkup(
      <DayOfGuestEntry
        published
        profileUrl="/profil/project-1"
        canPublish
        practicalReady
        onPublish={noop}
        onHide={noop}
        onCopy={noop}
        onEditPractical={noop}
      />,
    );
    expect(published).toContain('data-testid="dayof-guest-hide"');
  });

  it("tells non-owners the publication belongs to the owner", () => {
    const markup = renderToStaticMarkup(
      <DayOfGuestEntry
        published={false}
        profileUrl="/profil/project-1"
        canPublish={false}
        practicalReady={false}
        onPublish={noop}
        onHide={noop}
        onCopy={noop}
        onEditPractical={noop}
      />,
    );

    expect(markup).toContain('data-testid="dayof-guest-locked"');
    expect(markup).not.toContain('data-testid="dayof-guest-publish"');
    expect(markup).not.toContain('data-testid="dayof-guest-hide"');
  });
});
