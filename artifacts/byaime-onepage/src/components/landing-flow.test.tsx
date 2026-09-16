// @vitest-environment jsdom
/*
 * Le parcours d'entrée validé, de bout en bout, avec une carte réelle :
 * PORTE → IMPORT → « Voici ce que nous avons compris » → CONFIRMATION → RÔLE.
 * Aucune question du compositeur n'est posée quand une carte répond déjà.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n";
import type { WorldProject } from "@/lib/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

const store = vi.hoisted(() => {
  const state: { project: WorldProject | null; drafted: WorldProject | null } = {
    project: null,
    drafted: null,
  };
  return {
    state,
    createProjectFromIntention: vi.fn(() => true),
    setIntentionText: vi.fn(),
    createProjectFromDraft: vi.fn((draft: WorldProject) => {
      state.project = draft;
      state.drafted = draft;
      return draft;
    }),
    addEntity: vi.fn((_collection: string, _entity?: unknown) => "new-id"),
    updateProject: vi.fn(),
  };
});

vi.mock("@/store/project-store", () => ({
  useProject: () => ({
    project: store.state.project,
    canEdit: true,
    createProjectFromIntention: store.createProjectFromIntention,
    setIntentionText: store.setIntentionText,
    createProjectFromDraft: store.createProjectFromDraft,
    addEntity: store.addEntity,
    updateProject: store.updateProject,
  }),
}));

import { LandingComposer } from "@/components/LandingComposer";

const CARTE = JSON.stringify({
  kind: "carte-aime",
  version: 1,
  name: "Camille & Léo",
  headline: "Notre mariage, le 14 août 2027 à Lyon",
  image_url: "https://premier-site.fr/photo.jpg",
  city: "Lyon",
  wedding_date: "2027-08-14",
  venue: "Domaine du Bois",
  guests: 120,
  currency: "EUR",
  music: { title: "Sign of the Times", artist: "Harry Styles" },
});

let root: ReturnType<typeof createRoot> | null = null;
let container: HTMLDivElement | null = null;

const mount = async (component: ReactNode = <LandingComposer />) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <I18nProvider initialLocale="fr">
        <Router>
          {component}
        </Router>
      </I18nProvider>,
    );
  });
};

const click = async (testId: string) => {
  const button = document.querySelector(`[data-testid="${testId}"]`) as HTMLButtonElement | null;
  if (!button) throw new Error(`introuvable : ${testId}`);
  await act(async () => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
};

const typePaste = async (value: string) => {
  const area = document.querySelector('[data-testid="carte-import-paste"]') as HTMLTextAreaElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
  await act(async () => {
    setter.call(area, value);
    area.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
  store.state.project = null;
  store.state.drafted = null;
  store.createProjectFromDraft.mockClear();
  store.addEntity.mockClear();
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe("Parcours d'entrée : une seule porte", () => {
  it("ouvre sur une seule action, jamais sur le choix d'un tunnel", async () => {
    await mount();
    expect(document.querySelector('[data-testid="oneboarding-entry"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="landing-create-primary"]')).not.toBeNull();
    expect(document.body.textContent).toContain("Votre carte BYAIME");
    expect(document.body.textContent).toContain("Votre identité. Une seule fois.");
    /* L'architecture ne se choisit pas avant d'avoir commencé : ni seconde
       porte « Créer un mariage », ni choix Couple / Wedding planner, ni
       formulaire de questions affiché d'emblée. */
    expect(document.querySelector('[data-testid="landing-start-blank"]')).toBeNull();
    expect(document.querySelector('[data-testid="landing-persona"]')).toBeNull();
    expect(document.querySelector('[data-testid="landing-intention-form"]')).toBeNull();
    expect(document.body.textContent).not.toContain("Créer un mariage");
  });

  it("« Créer ma carte » ouvre le Oneboarding sur la personne, en Question 1 sur 5", async () => {
    await mount();
    await click("landing-create-primary");

    const step = document.querySelector('[data-testid="oneboarding-step-person"]');
    expect(step, "première étape absente").not.toBeNull();
    expect(document.body.textContent).toContain("Question 1 sur 5");
    expect(document.body.textContent).toContain("Commençons par vous");
    /* Le mariage n'est jamais créé à cette étape : la carte d'abord. */
    expect(document.querySelector('[data-testid="oneboarding-wedding-create"]')).toBeNull();
    expect(store.createProjectFromDraft).not.toHaveBeenCalled();
  });

  it("visiteur : carte importée → comprise → en attente du compte, puis retour au parcours", async () => {
    await mount();
    await click("landing-import-advanced");
    await typePaste(CARTE);
    await click("carte-import-analyse");

    /* « Voici ce que nous avons compris » : le plan, pas une exécution. */
    expect(document.querySelector('[data-testid="dossier-import"]')).not.toBeNull();
    expect(document.body.textContent).toContain("Voici ce que nous avons compris");
    expect(document.body.textContent).toContain("Créer le Monde « Camille & Léo »");
    expect(document.body.textContent).toContain("Lyon");
    expect(document.body.textContent).toContain("Domaine du Bois");
    expect(document.body.textContent).toContain("Sous-titre");
    expect(document.body.textContent).toContain("Notre mariage, le 14 août 2027 à Lyon");
    expect(document.body.textContent).toContain("Sign of the Times");

    await click("dossier-import-confirm");

    /* Sans compte, rien n'est écrit dans un Monde éphémère : la carte attend
       l'inscription — le même cycle de vie que la phrase d'intention. */
    expect(store.createProjectFromDraft).not.toHaveBeenCalled();
    const pending = window.localStorage.getItem("aime-carte-pending");
    expect(pending).not.toBeNull();
    expect(pending).toContain("Camille & Léo");

    /* L'import n'est plus un parcours parallèle : il ramène dans le Oneboarding,
       au même endroit que tout le monde. Le rôle y est demandé, il ne route plus
       vers quatre destinations différentes. */
    expect(document.querySelector('[data-testid="oneboarding"]')).not.toBeNull();
    expect(document.body.textContent).toContain("Question 1 sur 5");
    expect(document.querySelector('[data-testid="role-choice"]')).toBeNull();
  });

  it("connecté : carte importée → comprise → le Monde est créé depuis la carte", async () => {
    await mount(<LandingComposer signedIn />);
    await click("landing-import-advanced");
    await typePaste(CARTE);
    await click("carte-import-analyse");
    await click("dossier-import-confirm");

    expect(store.createProjectFromDraft).toHaveBeenCalledTimes(1);
    expect(store.state.drafted?.subtitle).toBe("Notre mariage, le 14 août 2027 à Lyon");
    expect(store.state.drafted?.heroVisual).toEqual({ kind: "image", url: "https://premier-site.fr/photo.jpg" });
    const musicAdd = store.addEntity.mock.calls.find(([collection]) => collection === "music");
    expect(musicAdd?.[1]).toMatchObject({ title: "Sign of the Times", artist: "Harry Styles", status: "valide" });
    expect(window.localStorage.getItem("aime-carte-pending")).toBeNull();

    /* Retour dans le Oneboarding — pas dans un écran de routage séparé. */
    expect(document.querySelector('[data-testid="oneboarding"]')).not.toBeNull();
  });

  it("un code illisible affiche une erreur, sans écran « compris »", async () => {
    await mount();
    await click("landing-import-advanced");
    await typePaste("ceci n'est pas une carte");
    await click("carte-import-analyse");
    expect(document.querySelector('[data-testid="carte-import-error"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="dossier-import"]')).toBeNull();
  });
});
