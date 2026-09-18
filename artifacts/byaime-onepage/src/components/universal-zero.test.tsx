// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@clerk/react", () => {
  const passthrough = ({ children }: { children?: ReactNode }) => children ?? null;
  return {
    ClerkProvider: passthrough,
    Show: ({ when, children }: { when: string; children?: ReactNode }) => (when === "signed-in" ? (children ?? null) : null),
    SignIn: () => null,
    SignUp: () => null,
    useAuth: () => ({ isLoaded: true, isSignedIn: false, userId: null }),
    useUser: () => ({ isLoaded: true, isSignedIn: false, user: null }),
    useSession: () => ({ isLoaded: true, session: null }),
    useClerk: () => ({ addListener: () => () => {}, signOut: async () => {} }),
  };
});
vi.mock("@clerk/react/internal", () => ({
  publishableKeyFromHost: (_host: string, key?: string) => key,
}));

const store = vi.hoisted(() => ({
  createProjectFromWorld: vi.fn(),
  createProjectFromDraft: vi.fn(),
  project: null,
  hasProject: false,
}));

vi.mock("@/store/project-store", () => ({
  useProject: () => ({
    hasProject: store.hasProject,
    project: store.project,
    createProjectFromWorld: store.createProjectFromWorld,
    createProjectFromDraft: store.createProjectFromDraft,
    updateProject: vi.fn(),
  }),
}));

import { I18nProvider } from "@/lib/i18n";
import { Router } from "wouter";
import { UniversalZero } from "./UniversalZero";
import { UNIVERSAL_DRAFT_KEY } from "@/lib/universal-draft";

let root: ReturnType<typeof createRoot> | null = null;
let container: HTMLDivElement | null = null;

async function settle(times = 8) {
  for (let i = 0; i < times; i++) {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });
  }
}

async function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <I18nProvider initialLocale="fr">
        <Router>
          <UniversalZero />
        </Router>
      </I18nProvider>
    );
  });
  await settle();
}

function byTestId(id: string) {
  return container!.querySelector(`[data-testid="${id}"]`);
}
function text() {
  return container!.textContent ?? "";
}
async function click(el: Element | null) {
  if (!el) throw new Error(`élément absent: click`);
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await settle();
}

beforeEach(() => {
  store.createProjectFromWorld.mockClear();
  store.createProjectFromDraft.mockClear();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe("nouvelle expérience d’accueil — très blanche et minimale", () => {
  it("1. un nouvel utilisateur peut ouvrir un Monde depuis la page blanche", async () => {
    await mount();
    expect(byTestId("universal-zero")).not.toBeNull();
    expect(byTestId("zero-plus")).not.toBeNull();
    expect(byTestId("zero-plus")?.getAttribute("aria-label")).toBe("Commencer un Monde");
    // micro-libellé au hover/focus via group
    expect(text()).toContain("Commencer un Monde");
    expect(byTestId("zero-step-A")).not.toBeNull(); // progression A,I,M,E visible
    expect(text()).toContain("AIME");
  });

  it("2. le parcours A/I/M/E fonctionne uniquement avec des choix", async () => {
    await mount();
    await click(byTestId("zero-plus"));
    expect(byTestId("zero-step-A")).not.toBeNull();
    expect(text()).toContain("Qui êtes-vous dans ce Monde ?");
    // choisir acteur
    await click(byTestId("actor-person"));
    // préciser artiste / musicien
    await click(byTestId("actor-sub-artiste---musicien"));
    await click(byTestId("actor-detail-saxophoniste"));
    expect(byTestId("actor-detail-saxophoniste")).not.toBeNull();
    // continuer
    await click(byTestId("zero-next"));
    expect(byTestId("zero-step-I")).not.toBeNull();
    expect(text()).toContain("Qu’est-ce que vous voulez rendre possible ?");
    // I : choisir intention saxo
    await click(byTestId("intention-trouver-plus-de-prestations"));
    await click(byTestId("zero-next"));
    expect(byTestId("zero-step-M")).not.toBeNull();
    expect(text()).toContain("Qu’est-ce qui existe déjà aujourd’hui ?");
    await click(byTestId("situation-je-suis-auto-entrepreneur"));
    await click(byTestId("zero-next"));
    expect(byTestId("zero-step-E")).not.toBeNull();
    expect(text()).toContain("Avec qui ou quoi ce Monde existe-t-il ?");
    await click(byTestId("ecosystem-lieux"));
    await click(byTestId("zero-next"));
    expect(store.createProjectFromWorld).toHaveBeenCalledTimes(1);
    const world = store.createProjectFromWorld.mock.calls[0][0];
    expect(world.universal.actorDetail).toBe("saxophoniste");
    expect(world.universe).toBe("Saxophoniste");
  });

  it("3. il est possible de passer une question", async () => {
    await mount();
    await click(byTestId("zero-plus"));
    await click(byTestId("actor-person"));
    await click(byTestId("zero-next"));
    // I : passer
    await click(byTestId("zero-skip"));
    expect(byTestId("zero-step-M")).not.toBeNull();
    // M : passer
    await click(byTestId("zero-skip"));
    expect(byTestId("zero-step-E")).not.toBeNull();
    // E : passer (je continue seul)
    await click(byTestId("zero-skip"));
    expect(store.createProjectFromWorld).toHaveBeenCalled();
  });

  it("4. le parcours peut être repris plus tard (brouillon)", async () => {
    await mount();
    await click(byTestId("zero-plus"));
    await click(byTestId("actor-person"));
    await click(byTestId("zero-next"));
    // intention (générique car pas saxophoniste)
    await click(byTestId("intention-pr-senter-mon-univers"));
    // draft saved
    const draft = window.localStorage.getItem(UNIVERSAL_DRAFT_KEY);
    expect(draft).not.toBeNull();
    expect(JSON.parse(draft!).step).toBe("I");
    // simulate reload: unmount and remount, draft persists in localStorage
    await act(async () => {
      root?.unmount();
    });
    container?.remove();
    root = null;
    container = null;
    await new Promise(r => setTimeout(r, 30));
    await mount();
    // wait a bit more for useEffect to set hasDraft
    await settle(20);
    const resumeBtn = byTestId("zero-resume");
    expect(resumeBtn).not.toBeNull();
    await click(resumeBtn);
    expect(byTestId("zero-step-I")).not.toBeNull();
    // still has previous choice
    const btn = byTestId("intention-pr-senter-mon-univers") as HTMLButtonElement;
    expect(btn?.getAttribute("aria-pressed")).toBe("true");
  });

  it("5. un Monde peut être créé sans être un mariage", async () => {
    await mount();
    await click(byTestId("zero-plus"));
    await click(byTestId("actor-independent"));
    await click(byTestId("zero-next"));
    await click(byTestId("zero-skip"));
    await click(byTestId("zero-skip"));
    await click(byTestId("zero-skip"));
    const world = store.createProjectFromWorld.mock.calls[0][0];
    expect(world.universe).not.toBe("Mariage");
  });

  it("6. le saxophoniste auto-entrepreneur obtient une branche contextualisée", async () => {
    await mount();
    await click(byTestId("zero-plus"));
    await click(byTestId("actor-person"));
    await click(byTestId("actor-sub-artiste---musicien"));
    await click(byTestId("actor-detail-saxophoniste"));
    await click(byTestId("zero-next"));
    // I doit contenir les choix saxo spécifiques
    expect(byTestId("intention-explorer-le-r-gime-du-spectacle")).not.toBeNull();
    await click(byTestId("intention-explorer-le-r-gime-du-spectacle"));
    expect(text()).toContain("trajectoire à explorer");
    await click(byTestId("zero-next"));
    // M contient choix saxo
    expect(byTestId("situation-je-suis-auto-entrepreneur")).not.toBeNull();
    expect(byTestId("situation-je-donne-des-cours")).not.toBeNull();
    // E
    await click(byTestId("situation-je-suis-auto-entrepreneur"));
    const free = byTestId("situation-free") as HTMLTextAreaElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")!.set!;
      setter.call(free, "Je suis saxophoniste auto-entrepreneur, je joue dans des mariages et je donne des cours.");
      free.dispatchEvent(new Event("input", { bubbles: true }));
      free.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await settle();
    await click(byTestId("situation-analyze"));
    expect(byTestId("facts-preview")).not.toBeNull();
    expect(text()).toContain("Saxophoniste");
    await click(byTestId("zero-next"));
    await click(byTestId("ecosystem-lieux"));
    await click(byTestId("zero-next"));
    const world = store.createProjectFromWorld.mock.calls[0][0];
    expect(world.trajectory).toBeDefined();
    expect(world.trajectory.steps.length).toBe(8);
    expect(world.universal.nextQuestion).toContain("facturées");
  });

  it("6b. le restaurateur obtient une branche contextualisée générique", async () => {
    await mount();
    await click(byTestId("zero-plus"));
    await click(byTestId("actor-independent"));
    await click(byTestId("actor-sub-restaurateur"));
    await click(byTestId("actor-detail-restaurateur"));
    await click(byTestId("zero-next"));
    // I doit contenir choix restaurateur
    expect(byTestId("intention-trouver-un-lieu")).not.toBeNull();
    expect(byTestId("intention--laborer-une-carte")).not.toBeNull();
    await click(byTestId("intention--laborer-une-carte"));
    await click(byTestId("zero-next"));
    expect(byTestId("situation-j-ai-un-lieu")).not.toBeNull();
    await click(byTestId("situation-j-ai-un-lieu"));
    await click(byTestId("zero-next"));
    await click(byTestId("ecosystem-lieux"));
    await click(byTestId("zero-next"));
    const world = store.createProjectFromWorld.mock.calls[0][0];
    expect(world.universal.actorDetail).toBe("restaurateur");
    expect(world.trajectory).toBeDefined();
    expect(world.trajectory.steps.length).toBe(8);
    expect(world.universal.nextQuestion).toContain("lieu");
  });

  it("6c. le collectif / groupe obtient une branche générique", async () => {
    await mount();
    await click(byTestId("zero-plus"));
    await click(byTestId("actor-group"));
    await click(byTestId("actor-sub-groupe-musical"));
    await click(byTestId("actor-detail-groupe"));
    await click(byTestId("zero-next"));
    expect(byTestId("intention-organiser-des-dates")).not.toBeNull();
    await click(byTestId("intention-organiser-des-dates"));
    await click(byTestId("zero-next"));
    expect(byTestId("situation-nous-avons-un-r-pertoire")).not.toBeNull();
    await click(byTestId("situation-nous-avons-un-r-pertoire"));
    await click(byTestId("zero-next"));
    await click(byTestId("ecosystem-lieux"));
    await click(byTestId("zero-next"));
    const world = store.createProjectFromWorld.mock.calls[0][0];
    expect(world.universal.actorKind).toBe("group");
    expect(world.trajectory).toBeDefined();
    expect(world.trajectory.steps.length).toBe(8);
  });

  it("9. la Timeline s’ouvre après E — le Monde est posé", async () => {
    await mount();
    await click(byTestId("zero-plus"));
    await click(byTestId("actor-person"));
    await click(byTestId("zero-next"));
    await click(byTestId("zero-skip"));
    await click(byTestId("zero-skip"));
    await click(byTestId("zero-skip"));
    expect(store.createProjectFromWorld).toHaveBeenCalledTimes(1);
    // après E, le store a un monde avec timeline
    const world = store.createProjectFromWorld.mock.calls[0][0];
    expect(world.timeline.length).toBeGreaterThan(0);
    expect(world.timeline[0].title).toContain("Monde");
  });

  it("accessibilité clavier et lecteur d’écran", async () => {
    await mount();
    const plus = byTestId("zero-plus") as HTMLButtonElement;
    expect(plus.tagName).toBe("BUTTON");
    expect(plus.getAttribute("aria-label")).toBeTruthy();
    await click(plus);
    const back = byTestId("zero-back");
    expect(back?.tagName).toBe("BUTTON");
    const next = byTestId("zero-next");
    expect(next?.tagName).toBe("BUTTON");
    expect(byTestId("zero-step-A")?.getAttribute("aria-current")).toBe("step");
    // progression nav has aria-label
    expect(container!.querySelector('nav[aria-label="Progression du parcours"]')).not.toBeNull();
  });
});
