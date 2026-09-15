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

const mount = async () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
        <I18nProvider initialLocale="fr">
        <Router>
          <LandingComposer />
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

describe("Parcours d'entrée : carte d'abord", () => {
  it("ouvre sur deux portes, jamais sur le choix Couple / Wedding planner", async () => {
    await mount();
    expect(document.querySelector('[data-testid="landing-entry"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="landing-import-primary"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="landing-start-blank"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="landing-persona"]')).toBeNull();
    expect(document.querySelector('[data-testid="landing-intention-form"]')).toBeNull();
  });

  it("« Commencer sans carte » ouvre directement les cinq questions", async () => {
    await mount();
    await click("landing-start-blank");
    const form = document.querySelector('[data-testid="landing-intention-form"]');
    expect(form).not.toBeNull();
    const input = document.querySelector('[data-testid="landing-intention-input"]') as HTMLInputElement;
    expect(input.placeholder).toContain("14 août 2027");
  });

  it("importe une carte collée : compris → confirmé → rôle mariés → création", async () => {
    await mount();
    await click("landing-import-primary");
    await typePaste(CARTE);
    await click("carte-import-analyse");

    /* « Voici ce que nous avons compris » : le plan, pas une exécution. */
    expect(document.querySelector('[data-testid="dossier-import"]')).not.toBeNull();
    expect(document.body.textContent).toContain("Voici ce que nous avons compris");
    expect(document.body.textContent).toContain("Créer le Monde « Camille & Léo »");
    expect(document.body.textContent).toContain("Lyon");
    expect(document.body.textContent).toContain("Domaine du Bois");
    /* Les champs carte : accroche, visuel et musique montrés, jamais appliqués en silence. */
    expect(document.body.textContent).toContain("Sous-titre");
    expect(document.body.textContent).toContain("Notre mariage, le 14 août 2027 à Lyon");
    expect(document.body.textContent).toContain("Sign of the Times");

    await click("dossier-import-confirm");

    /* Le rôle arrive APRÈS la confirmation, et route vers l'existant. */
    expect(document.querySelector('[data-testid="role-choice"]')).not.toBeNull();
    expect(document.body.textContent).toContain("Qui êtes-vous dans ce mariage ?");
    await click("role-couple");
    expect(store.createProjectFromDraft).toHaveBeenCalledTimes(1);
    expect(store.state.drafted?.subtitle).toBe("Notre mariage, le 14 août 2027 à Lyon");
    expect(store.state.drafted?.heroVisual).toEqual({ kind: "image", url: "https://premier-site.fr/photo.jpg" });
    const musicAdd = store.addEntity.mock.calls.find(([collection]) => collection === "music");
    expect(musicAdd?.[1]).toMatchObject({ title: "Sign of the Times", artist: "Harry Styles", status: "valide" });
    expect(window.location.pathname).toBe("/creation");
  });

  it("route le planner vers la connexion agence, et dit la vérité aux invités", async () => {
    await mount();
    await click("landing-import-primary");
    await typePaste(CARTE);
    await click("carte-import-analyse");
    await click("dossier-import-confirm");

    await click("role-planner");
    expect(window.location.search).toContain("returnTo=%2Fadmin");

    await click("role-guest");
    expect(document.querySelector('[data-testid="role-note"]')?.textContent).toContain("lien personnel");
  });

  it("un code illisible affiche une erreur, sans écran « compris »", async () => {
    await mount();
    await click("landing-import-primary");
    await typePaste("ceci n'est pas une carte");
    await click("carte-import-analyse");
    expect(document.querySelector('[data-testid="carte-import-error"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="dossier-import"]')).toBeNull();
  });
});
