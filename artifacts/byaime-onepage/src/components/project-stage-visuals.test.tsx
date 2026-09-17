// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialProject, parseIntention } from "@/lib/parser";
import { I18nProvider } from "@/lib/i18n";
import { DEFAULT_HERO_VISUAL, visualSourceUrl } from "@/lib/world-visuals";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/* jsdom n'implémente pas IntersectionObserver, que `whileInView` (framer-motion)
   utilise pour révéler chaque scène au scroll. Un stub suffit : ce test regarde
   le DOM produit, pas l'animation. */
class IntersectionObserverStub {
  constructor(private callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    this.callback([{ target, isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
  root = null;
  rootMargin = "";
  thresholds = [];
}
(globalThis as { IntersectionObserver?: unknown }).IntersectionObserver ??= IntersectionObserverStub;

/*
 * Ce que voit le couple en ouvrant son Monde Mariage, monté pour de vrai :
 *  - le hero porte TOUJOURS un grand visuel (même sans photo importée),
 *  - le visuel se change là où on le voit, pas dans un panneau caché,
 *  - chaque scène de la Timeline verticale a un fond, et chaque chapitre aussi.
 */

vi.mock("@clerk/react", () => ({
  useClerk: () => ({ openUserProfile: vi.fn() }),
  useUser: () => ({ user: null }),
  useAuth: () => ({ isSignedIn: true, isLoaded: true, userId: "user_1" }) }));

const SEED = "Notre mariage le 5 août 2027, près de Lille, 90 invités.";
/* Un store MUTABLE, comme le vrai : le visuel choisi doit vraiment s'écrire. */
let project = createInitialProject(parseIntention(SEED), SEED);

vi.mock("@/store/project-store", () => ({
  useProject: () => ({
    project,
    projects: [project],
    currentRole: "owner",
    canEdit: true,
    isHydrated: true,
    hasProject: true,
    syncStatus: "saved",
    syncError: null,
    apiAvailable: false,
    participantLinks: [],
    selectProject: vi.fn(),
    refreshParticipantLinks: vi.fn(async () => undefined),
    updateProject: (patch: Record<string, unknown>) => {
      project = { ...project, ...patch } as typeof project;
    },
    updateEntity: vi.fn(),
    addEntity: vi.fn(() => "new-id"),
    removeEntity: vi.fn() }) }));

let root: ReturnType<typeof createRoot> | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  project = createInitialProject(parseIntention(SEED), SEED);
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

async function mountWorld() {
  const { ProjectStage } = await import("./ProjectStage");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(
      <Router hook={() => ["/user-portal", () => undefined] as const}>
        <I18nProvider initialLocale="fr">
          <ProjectStage />
        </I18nProvider>
      </Router>,
    );
  });
  return container!;
}

describe("le Monde Mariage s'ouvre sur des visuels", () => {
  it("montre le grand visuel du hero même sans photo importée", async () => {
    const el = await mountWorld();
    const media = el.querySelector<HTMLImageElement>('[data-testid="world-hero-media"]');
    expect(media, "le hero n'a pas de visuel").not.toBeNull();
    expect(media!.getAttribute("src")).toContain(visualSourceUrl(DEFAULT_HERO_VISUAL));
  });

  it("propose de changer le visuel là où on le voit, et ouvre l'éditeur", async () => {
    const el = await mountWorld();
    const edit = el.querySelector<HTMLButtonElement>('[data-testid="world-hero-edit-visual"]');
    expect(edit, "bouton « Changer le visuel » absent du hero").not.toBeNull();
    expect(edit!.textContent, "le bouton nomme le mode réglé").toContain("Visuel du mode Avant");

    act(() => edit!.click());
    const panel = document.querySelector('[data-testid="world-hero-visual-panel"]');
    expect(panel, "l'éditeur de visuel ne s'ouvre pas").not.toBeNull();
    // Les vignettes du Monde : un clic suffit, aucun fichier à importer.
    expect(document.querySelectorAll('[data-testid^="visual-choice-"]').length).toBeGreaterThan(8);
  });

  it("un visuel par mode : changer en Avant ne change pas le Jour J", async () => {
    const el = await mountWorld();
    /* La vignette donne l'URL brute ; le héro l'affiche normalisée. */
    const shown = (url: string) => visualSourceUrl({ kind: "image", url });
    const heroSrc = () => el.querySelector('[data-testid="world-hero-media"]')!.getAttribute("src");
    const phase = (id: string) => act(() => el.querySelector<HTMLButtonElement>(`[data-testid="world-phase-${id}"]`)!.click());
    const worldVisual = heroSrc();

    /* Le bouton dit de quel mode on règle le visuel. */
    const edit = el.querySelector<HTMLButtonElement>('[data-testid="world-hero-edit-visual"]')!;
    expect(edit.textContent, "le bouton nomme le mode Avant").toContain("Avant");

    act(() => edit.click());
    const choices = [...document.querySelectorAll<HTMLButtonElement>('[data-testid^="visual-choice-"]')];
    expect(choices.length).toBeGreaterThan(8);
    /* Une vignette qui n'est PAS le visuel du Monde. */
    const away = choices.find(choice => choice.querySelector("img")!.getAttribute("src") !== worldVisual)!;
    const awayUrl = away.querySelector("img")!.getAttribute("src")!;
    act(() => away.click());
    expect(project.heroVisuals?.avant?.url, "le choix est écrit dans la case du mode").toBe(awayUrl);
    expect(
      visualSourceUrl(project.heroVisual!),
      "le visuel du Monde n'est pas écrasé",
    ).toBe(worldVisual);

    /* Le Jour J n'a rien choisi : il garde le visuel du Monde (repli). */
    phase("pendant");
    expect(heroSrc(), "le Jour J garde le visuel du Monde").toBe(worldVisual);
    expect(
      el.querySelector<HTMLButtonElement>('[data-testid="world-hero-edit-visual"]')!.textContent,
      "le bouton dit Jour J",
    ).toContain("Jour J");

    /* L'Avant, lui, affiche le sien. */
    phase("avant");
    expect(heroSrc(), "l'Avant affiche le visuel qu'on vient de lui donner").toBe(shown(awayUrl));

    /* Deuxième mode : on règle le Jour J, l'Avant ne bouge pas. */
    phase("pendant");
    act(() => el.querySelector<HTMLButtonElement>('[data-testid="world-hero-edit-visual"]')!.click());
    const dayChoices = [...document.querySelectorAll<HTMLButtonElement>('[data-testid^="visual-choice-"]')];
    const dayChoice = dayChoices.find(choice => {
      const url = choice.querySelector("img")!.getAttribute("src");
      return url !== awayUrl && url !== worldVisual;
    })!;
    const dayUrl = dayChoice.querySelector("img")!.getAttribute("src")!;
    act(() => dayChoice.click());
    expect(project.heroVisuals?.pendant?.url).toBe(dayUrl);
    /* Un vrai changement de mode : le store simulé n'est pas réactif. */
    phase("apres");
    phase("pendant");
    expect(heroSrc(), "le Jour J a le sien").toBe(shown(dayUrl));
    phase("avant");
    expect(heroSrc(), "l'Avant garde le sien").toBe(shown(awayUrl));
  });

  it("un Monde d'avant garde son visuel dans les trois modes (repli)", async () => {
    const el = await mountWorld();
    const heroSrc = () => el.querySelector('[data-testid="world-hero-media"]')!.getAttribute("src");
    const worldVisual = heroSrc();
    for (const phase of ["pendant", "apres", "avant"] as const) {
      act(() => el.querySelector<HTMLButtonElement>(`[data-testid="world-phase-${phase}"]`)!.click());
      expect(heroSrc(), `le mode ${phase} retombe sur le visuel du Monde`).toBe(worldVisual);
    }
  });

  it("donne un fond à chaque scène et à chaque chapitre de la Timeline", async () => {
    const el = await mountWorld();
    const scenes = [...el.querySelectorAll<HTMLElement>('[data-testid^="timeline-scene-"]')];
    expect(scenes.length).toBeGreaterThan(5);
    for (const scene of scenes) {
      /* Un fond par scène : la vidéo réelle quand le manifeste en a une pour la
         zone, sinon la photo. Jamais de scène nue. */
      const img = scene.querySelector("img");
      const video = scene.querySelector("video");
      expect(img ?? video, `scène « ${scene.textContent?.slice(0, 40)} » sans visuel de fond`).not.toBeNull();
      if (img) expect(img.getAttribute("src")).toMatch(/\/images\/wedding\/.+\.jpg/);
      if (video) {
        expect(video!.getAttribute("src")).toMatch(/\/videos\/wedding-.+\.mp4/);
        expect(video!.getAttribute("poster")).toMatch(/\/images\/wedding\/.+\.jpg/);
        /* React pose `muted` en propriété, pas en attribut : on lit la propriété. */
        expect((video as HTMLVideoElement).muted, "une vidéo d'ambiance doit être muette").toBe(true);
        expect(video!.hasAttribute("playsinline"), "lecture inline sur mobile").toBe(true);
      }
    }
    /* Les trois vidéos réelles servent vraiment : au moins une scène en joue une. */
    expect(el.querySelectorAll("video").length).toBeGreaterThan(0);
    // La zone logique est nommée, pour que le couple sache d'où vient le fond.
    const zones = [...el.querySelectorAll('[data-testid="timeline-zone"]')].map(zone => zone.textContent?.trim());
    expect(new Set(zones).size).toBeGreaterThan(1);
  });
});
