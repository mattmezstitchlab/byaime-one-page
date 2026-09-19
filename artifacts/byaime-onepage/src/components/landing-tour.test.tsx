import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import type { ReactNode } from "react";

vi.mock("@/store/project-store", () => ({
  useProject: () => ({
    createProjectFromIntention: vi.fn(() => true),
    setIntentionText: vi.fn(),
  }),
}));

import { I18nProvider } from "@/lib/i18n";
import { TOUR_CHAPTERS, TOUR_FILM, LandingTour, tourPosterUrl, tourVideoUrl } from "./LandingTour";
import { LandingPage } from "@/pages/Landing";

const render = (node: ReactNode) =>
  renderToStaticMarkup(
    <Router hook={() => ["/", () => {}] as const}>
      <I18nProvider>{node}</I18nProvider>
    </Router>,
  );

const publicDir = join(__dirname, "..", "..", "public", "videos");
const audioDir = join(__dirname, "..", "..", "tour", "audio");
const manifest = JSON.parse(readFileSync(join(publicDir, "tour.manifest.json"), "utf8")) as {
  film: { file: string; duration: string };
  chapters: Array<{ id: string; duration: string }>;
};

describe("LandingTour (la visite guidée filmée)", () => {
  it("présente les huit chapitres, dans l'ordre de l'enregistrement", () => {
    const markup = render(<LandingTour />);

    expect(markup).toContain('data-testid="landing-tour"');
    expect(TOUR_CHAPTERS.map(chapter => chapter.id)).toEqual([
      "concept", "inscription", "monde", "ouverture", "timeline", "invites", "prestataires", "partage",
    ]);
    const positions = TOUR_CHAPTERS.map(chapter => markup.indexOf(`data-testid="landing-tour-tab-${chapter.id}"`));
    expect(positions.every(position => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("embarque de vrais MP4 avec affiche, sans préchargement et sans autoplay", () => {
    const markup = render(<LandingTour />);

    /* Les huit chapitres ont leur fichier ; un seul lecteur est monté à la
       fois — la vidéo ne pèse sur la page qu'une fois le chapitre choisi. */
    for (const chapter of TOUR_CHAPTERS) {
      expect(tourVideoUrl(chapter.id), chapter.id).toContain(`/videos/tour-${chapter.id}.mp4`);
      expect(tourPosterUrl(chapter.id), chapter.id).toContain(`/videos/tour-${chapter.id}.jpg`);
    }
    expect(markup).toContain("/videos/tour-concept.mp4");
    expect(markup).toContain("/videos/tour-concept.jpg");
    /* Un seul lecteur monté à la fois : la vidéo ne se télécharge qu'au clic. */
    expect(markup.match(/<video/g)).toHaveLength(1);
    expect(markup).toContain('preload="none"');
    expect(markup).toContain('type="video/mp4"');
    /* Les commandes natives n'apparaissent qu'au premier clic : sur la
       balise elle-même, pas de `controls` (les onglets, eux, portent un
       `aria-controls` — d'où la balise extraite plutôt que la page entière). */
    const videoTag = markup.slice(markup.indexOf("<video"), markup.indexOf(">", markup.indexOf("<video")));
    expect(videoTag).not.toMatch(/\scontrols/);
    expect(markup.toLowerCase()).toContain("playsinline");
    /* La voix porte le chapitre : le son n'est pas coupé à la source — et
       `text-muted-foreground` n'est pas un attribut du lecteur. */
    expect(videoTag).not.toContain("muted");
  });

  it("reste un carrousel : onglets, sélection courante et annonce", () => {
    const markup = render(<LandingTour />);

    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('role="tabpanel"');
    expect(markup).toContain('aria-selected="true"');
    expect(markup.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain("Chapitre 1 sur 8");
    expect(markup).toContain('data-testid="landing-tour-prev"');
    expect(markup).toContain('data-testid="landing-tour-next"');
    expect(markup).toContain('data-testid="landing-tour-film"');
    expect(markup).toContain('href="/creation"');
  });

  it("annonce la durée réelle de chaque chapitre, telle qu'encodée", () => {
    for (const chapter of TOUR_CHAPTERS) {
      const recorded = manifest.chapters.find(entry => entry.id === chapter.id);
      expect(recorded, `le manifeste ne connaît pas « ${chapter.id} »`).toBeDefined();
      expect(chapter.duration, chapter.id).toBe(recorded!.duration);
    }
    expect(TOUR_FILM.duration).toBe(manifest.film.duration);
  });

  it("garde les fichiers vidéo, les affiches et la voix sous le dépôt", () => {
    for (const chapter of TOUR_CHAPTERS) {
      expect(existsSync(join(publicDir, `tour-${chapter.id}.mp4`)), `tour-${chapter.id}.mp4`).toBe(true);
      expect(existsSync(join(publicDir, `tour-${chapter.id}.jpg`)), `tour-${chapter.id}.jpg`).toBe(true);
      /* La voix est une source de l'enregistrement : sans elle, pas de remake. */
      expect(existsSync(join(audioDir, `${chapter.id}.mp3`)), `tour/audio/${chapter.id}.mp3`).toBe(true);
    }
    expect(existsSync(join(publicDir, manifest.film.file)), manifest.film.file).toBe(true);
    expect(existsSync(join(publicDir, "tour-complet.jpg")), "tour-complet.jpg").toBe(true);
  });

  it("se place dans l'accueil juste sous le hero, avant la vitrine", () => {
    const markup = renderToStaticMarkup(
      <Router hook={() => ["/", () => {}] as const}>
        <LandingPage />
      </Router>,
    );

    const hero = markup.indexOf('data-testid="landing-hero"');
    const tour = markup.indexOf('data-testid="landing-tour"');
    const product = markup.indexOf('data-testid="landing-product"');
    expect(hero).toBeGreaterThanOrEqual(0);
    expect(tour).toBeGreaterThan(hero);
    expect(product).toBeGreaterThan(tour);
    /* Les anciens guides ont été remplacés, pas doublonnés. */
    expect(markup).not.toContain("landing-videos");
    expect(markup).not.toContain("guide-mariee");
  });
});
