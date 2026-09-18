import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import type { ReactNode } from "react";
import { existsSync } from "node:fs";
import { join } from "node:path";

vi.mock("@/store/project-store", () => ({
  useProject: () => ({
    createProjectFromIntention: vi.fn(() => true),
    setIntentionText: vi.fn(),
  }),
}));

import { I18nProvider } from "@/lib/i18n";
import { GUIDES, LandingGuides } from "./LandingGuides";
import { LandingPage } from "@/pages/Landing";

const render = (node: ReactNode) =>
  renderToStaticMarkup(
    <Router hook={() => ["/", () => {}] as const}>
      <I18nProvider>{node}</I18nProvider>
    </Router>,
  );

describe("LandingGuides (vidéos-guides)", () => {
  it("présente les trois parcours, dans l'ordre : prestataire, mariée, invité", () => {
    const markup = render(<LandingGuides />);

    expect(markup).toContain('data-testid="landing-videos"');
    expect(GUIDES.map((guide) => guide.id)).toEqual(["prestataire", "mariee", "invite"]);
    const positions = GUIDES.map((guide) => markup.indexOf(`data-testid="landing-video-${guide.id}"`));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);

    expect(markup).toContain("Un prestataire crée son Monde");
    expect(markup).toContain("Une mariée crée son Monde Mariage");
    expect(markup).toContain("Un invité rejoint un Monde Mariage");
  });

  it("embarque de vraies vidéos MP4 avec affiche, sans préchargement", () => {
    const markup = render(<LandingGuides />);

    for (const guide of GUIDES) {
      expect(markup).toContain(`/videos/guide-${guide.id}.mp4`);
      expect(markup).toContain(`/videos/guide-${guide.id}.jpg`);
      expect(markup).toContain(`data-testid="landing-video-${guide.id}-play"`);
    }
    expect(markup).toContain('preload="none"');
    expect(markup).toContain('type="video/mp4"');
    /* Avant lecture : l'affiche et notre bouton, pas les commandes natives
       (elles se superposeraient au bouton). */
    expect(markup).toContain("<video");
    expect(markup).not.toContain("controls=");
    expect(markup.toLowerCase()).toContain("playsinline");
  });

  it("garde les fichiers vidéo sous public/videos — le script d'enregistrement les produit", () => {
    const publicDir = join(__dirname, "..", "..", "public", "videos");
    for (const guide of GUIDES) {
      expect(existsSync(join(publicDir, `guide-${guide.id}.mp4`)), `guide-${guide.id}.mp4`).toBe(true);
      expect(existsSync(join(publicDir, `guide-${guide.id}.jpg`)), `guide-${guide.id}.jpg`).toBe(true);
    }
  });

  it("se place dans l'accueil juste sous le hero, avant la vitrine", () => {
    const markup = renderToStaticMarkup(
      <Router hook={() => ["/", () => {}] as const}>
        <LandingPage />
      </Router>,
    );

    const hero = markup.indexOf('data-testid="landing-hero"');
    const videos = markup.indexOf('data-testid="landing-videos"');
    const product = markup.indexOf('data-testid="landing-product"');
    expect(hero).toBeGreaterThanOrEqual(0);
    expect(videos).toBeGreaterThan(hero);
    expect(product).toBeGreaterThan(videos);
  });
});
