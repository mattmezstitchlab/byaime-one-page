// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialProject, parseIntention } from "@/lib/parser";
import { normalizeProject } from "@/lib/project-migration";
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

vi.mock("@clerk/react", () => ({
  useClerk: () => ({ openUserProfile: vi.fn(), signOut: vi.fn() }),
  useUser: () => ({ user: null }),
  useAuth: () => ({ isSignedIn: true, isLoaded: true, userId: "user_1" }),
}));

/* Un store MUTABLE, comme le parcours réel. */
let current: WorldProject;
const listeners = new Set<() => void>();

vi.mock("@/store/project-store", () => ({
  useProject: () => ({
    project: current,
    projects: [current],
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
    updateProject: (patch: Partial<WorldProject>) => {
      current = normalizeProject({ ...current, ...patch } as WorldProject);
      listeners.forEach(fn => fn());
    },
    updateEntity: (collection: string, id: string, patch: Record<string, unknown>) => {
      const list = (current as unknown as Record<string, { id: string }[]>)[collection] ?? [];
      (current as unknown as Record<string, unknown>)[collection] = list.map(item =>
        item.id === id ? { ...item, ...patch } : item,
      );
      current = normalizeProject(current);
      listeners.forEach(fn => fn());
    },
    addEntity: (collection: string, entity: Record<string, unknown>) => {
      const id = `added-${Math.random().toString(36).slice(2, 8)}`;
      const list = (current as unknown as Record<string, unknown[]>)[collection] ?? [];
      (current as unknown as Record<string, unknown>)[collection] = [...list, { id, ...entity }];
      current = normalizeProject(current);
      listeners.forEach(fn => fn());
      return id;
    },
    removeEntity: (collection: string, id: string) => {
      const list = (current as unknown as Record<string, { id: string }[]>)[collection] ?? [];
      (current as unknown as Record<string, unknown>)[collection] = list.filter(item => item.id !== id);
      current = normalizeProject(current);
      listeners.forEach(fn => fn());
    },
  }),
}));

let root: ReturnType<typeof createRoot> | null = null;
let container: HTMLDivElement | null = null;

function newProject(seed = "Notre mariage le 5 août 2027, près de Lille, 90 invités.") {
  current = createInitialProject(parseIntention(seed), seed);
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  window.sessionStorage.clear();
});

/** Le Monde + le Panneau AIME monté à côté, comme PrivateLayout le fait. */
async function mountWorld() {
  const { ProjectStage } = await import("./ProjectStage");
  const { AimePanel } = await import("./AimePanel");
  const { useSyncExternalStore } = await import("react");
  function Harness() {
    useSyncExternalStore(
      subscribe => { listeners.add(subscribe); return () => listeners.delete(subscribe); },
      () => current,
    );
    return <ProjectStage />;
  }
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(
      <Router hook={() => ["/user-portal", () => undefined] as const}>
        <I18nProvider initialLocale="fr">
          <Harness />
          <AimePanel />
        </I18nProvider>
      </Router>,
    );
  });
  return container!;
}

const click = (selector: string) => {
  const el = document.querySelector<HTMLElement>(selector);
  expect(el, `introuvable : ${selector}`).not.toBeNull();
  act(() => el!.click());
};

const openPanel = () => act(() => window.dispatchEvent(new Event("aime:open-ai")));
const typeSearch = (value: string) => {
  const input = document.querySelector<HTMLInputElement>('input[data-testid="aime-panel-search"]');
  expect(input, "la recherche du panneau").not.toBeNull();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(input!, value);
    input!.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

/*
 * LE PANNEAU UNIQUE (17/09) : l'orbe « + » est la seule porte d'entrée.
 * Une colonne (Le Monde, les outils, l'aide), une zone de contenu, une seule
 * fenêtre — plus de CommandBar, plus de seconde fenêtre, plus de menu.
 */
describe("le Panneau AIME, la seule porte d'entrée", () => {
  it("s'ouvre par l'orbe sur trois sections, avec les sept dossiers nommés", async () => {
    newProject();
    await mountWorld();
    expect(document.querySelector('[data-testid="aime-panel"]'), "le panneau est fermé au départ").toBeNull();

    openPanel();
    const panel = document.querySelector('[data-testid="aime-panel"]');
    expect(panel, "l'orbe ouvre le panneau unique").not.toBeNull();
    expect(panel!.querySelector('[data-section="monde"]')?.textContent).toContain("Le Monde");
    expect(panel!.querySelector('[data-section="outils"]')?.textContent).toContain("Les outils");
    expect(panel!.querySelector('[data-section="aide"]')?.textContent).toContain("Aide");
    expect(panel!.textContent).toContain("Le programme");
    for (const folder of ["Invités & RSVP", "Budget & devis", "Contrats", "Prestataires", "Programme Jour J", "Photos & souvenirs", "Messages"]) {
      expect(panel!.textContent, `dossier « ${folder} » absent de la colonne`).toContain(folder);
    }
    /* Contenu : l'accueil du panneau, pas de seconde fenêtre. */
    expect(document.querySelector('[data-testid="aime-panel-intro"]')).not.toBeNull();
    expect(document.querySelectorAll('[role="dialog"]').length, "une seule fenêtre").toBe(1);
  });

  it("un dossier s'ouvre dans la même fenêtre, avec son compteur", async () => {
    newProject();
    await mountWorld();
    openPanel();
    click('[data-testid="aime-panel-item-folder:guests"]');

    const windowEl = document.querySelector('[data-testid="monde-panel"]');
    expect(windowEl, "le contenu du dossier s'ouvre").not.toBeNull();
    expect(windowEl!.getAttribute("data-panel")).toBe("guests");
    expect(document.querySelectorAll('[role="dialog"]').length, "toujours une seule fenêtre").toBe(1);
    /* Le compteur honnête est dans la colonne. */
    const count = document.querySelector('[data-testid="aime-panel-count-folder:guests"]');
    expect(count, "compteur du dossier Invités").not.toBeNull();
    expect(Number(count!.textContent), "compteur cohérent avec le store").toBeGreaterThan(0);
  });

  it("la bascule FR/EN traduit la colonne en place", async () => {
    newProject();
    await mountWorld();
    openPanel();
    click('[data-testid="aime-panel-locale"]');
    const panel = document.querySelector('[data-testid="aime-panel"]')!;
    expect(panel.textContent).toContain("Guests & RSVP");
    expect(panel.querySelector('[data-section="outils"]')?.textContent).toContain("Tools");
    click('[data-testid="aime-panel-locale"]');
    expect(document.querySelector('[data-testid="aime-panel"]')!.textContent).toContain("Invités & RSVP");
  });

  it("Escape referme le panneau, et le Monde reste intact", async () => {
    newProject();
    await mountWorld();
    openPanel();
    act(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(document.querySelector('[data-testid="aime-panel"]')).toBeNull();
    expect(document.querySelector('[data-testid="world-hero"]'), "le Monde n'a pas bougé").not.toBeNull();
  });

  it("le miroir des périodes change la période sans quitter le panneau", async () => {
    newProject();
    await mountWorld();
    openPanel();
    click('[data-testid="aime-panel-phase-pendant"]');
    expect(document.querySelector('[data-testid="day-run"]'), "la régie apparaît en Jour J").not.toBeNull();
    expect(document.querySelector('[data-testid="aime-panel"]'), "le panneau reste ouvert").not.toBeNull();
  });

  it("la recherche filtre la colonne, sans jargon de résultat vide", async () => {
    newProject();
    await mountWorld();
    openPanel();
    typeSearch("bud");
    const panel = document.querySelector('[data-testid="aime-panel"]')!;
    expect(panel.querySelector('[data-testid="aime-panel-item-folder:budget"]'), "Budget reste").not.toBeNull();
    expect(panel.querySelector('[data-testid="aime-panel-item-folder:guests"]'), "Invités sort").toBeNull();
    typeSearch("zzzz");
    expect(panel.textContent).toContain("Rien ne correspond");
  });

  it("« Créer » diffuse l'événement de création et referme le panneau", async () => {
    newProject();
    await mountWorld();
    const created = vi.fn();
    window.addEventListener("aime:open-create", created);
    openPanel();
    click('[data-testid="aime-panel-item-create"]');
    expect(created, "l'événement de création part au centre existant").toHaveBeenCalled();
    expect(document.querySelector('[data-testid="aime-panel"]'), "le panneau se referme").toBeNull();
    window.removeEventListener("aime:open-create", created);
  });

  it("« Poser une question » ouvre le chat AIME dans la zone de contenu", async () => {
    newProject();
    await mountWorld();
    openPanel();
    click('[data-testid="aime-panel-item-ask"]');
    expect(document.querySelector('[data-testid="aime-panel-ask"]'), "le chat s'ouvre dans le panneau").not.toBeNull();
    expect(document.querySelector('[data-testid="assistant-chat"]'), "le chat AIME est là").not.toBeNull();
    expect(document.querySelector('[data-testid="assistant-chat-input"]'), "on peut poser la question").not.toBeNull();
  });

  it("la recherche unifiée : trouver (Moments), demander (AIME), aller (colonne)", async () => {
    newProject();
    await mountWorld();
    openPanel();
    typeSearch("photographe");
    const panel = document.querySelector('[data-testid="aime-panel"]')!;
    expect(panel.querySelector('[data-testid="aime-panel-search-results"]')).not.toBeNull();
    /* Demander : la question est reprise telle quelle. */
    const ask = panel.querySelector<HTMLElement>('[data-testid="aime-panel-search-ask"]');
    expect(ask, "aucune suggestion de question").not.toBeNull();
    expect(ask!.textContent).toContain("photographe");
    /* Trouver : le Moment du photographe remonte de l'index de la Timeline. */
    expect(panel.textContent).toContain("Choix du photographe");
    /* Aller : la colonne se filtre (le Budget n'a rien à voir). */
    expect(panel.querySelector('[data-testid="aime-panel-item-folder:budget"]')).toBeNull();

    /* La question s'ouvre sur le chat, dans le même panneau. */
    act(() => ask!.click());
    expect(document.querySelector('[data-testid="assistant-chat"]')).not.toBeNull();
  });

  it("une demande de recherche (action de l'assistant) place le curseur dans la case", async () => {
    newProject();
    await mountWorld();
    act(() => window.dispatchEvent(new CustomEvent("aime:open-ai", { detail: { search: true } })));
    const input = document.querySelector<HTMLInputElement>('[data-testid="aime-panel-search"]');
    expect(input, "le panneau s'ouvre").not.toBeNull();
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });
    expect(document.activeElement, "le curseur est dans la case de recherche").toBe(input);
  });

  it("l'aperçu invité filtre la colonne : le Monde vu d'un invité", async () => {
    newProject();
    await mountWorld();
    openPanel();
    expect(document.querySelector('[data-testid="aime-panel-item-folder:budget"]'), "budget visible pour l'owner").not.toBeNull();

    /* L'aperçu se passe dans le Monde : le panneau cède la place. */
    click('[data-testid="aime-panel-item-guest-preview"]');
    expect(document.querySelector('[data-testid="aime-panel"]'), "le panneau se referme").toBeNull();

    openPanel();
    const column = document.querySelector('[data-testid="aime-panel"]')!;
    expect(column.querySelector('[data-testid="aime-panel-item-folder:budget"]'), "budget masqué à l'invité").toBeNull();
    expect(column.querySelector('[data-testid="aime-panel-item-folder:contracts"]'), "contrats masqués à l'invité").toBeNull();
    expect(column.querySelector('[data-testid="aime-panel-item-tasks"]'), "tâches masquées à l'invité").toBeNull();
    expect(column.querySelector('[data-testid="aime-panel-item-folder:guests"]'), "les Invités restent visibles").not.toBeNull();
  });

  it("le retour au Moment referme la profondeur et rappelle la Timeline", async () => {
    newProject();
    await mountWorld();
    const scene = [...document.querySelectorAll<HTMLElement>('[data-testid^="timeline-scene-"]')]
      .find(element => element.textContent?.includes("découverte du lieu"));
    expect(scene, "Moment du lieu introuvable").toBeTruthy();
    const action = scene!.querySelector<HTMLElement>('[data-testid="moment-action-providers"]');
    expect(action, "action Invités du Moment").not.toBeNull();
    act(() => action!.click());

    expect(document.querySelector('[data-testid="monde-panel-moment"]')?.textContent).toContain("découverte du lieu");
    click('[data-testid="monde-panel-back-moment"]');
    expect(document.querySelector('[data-testid="monde-panel"]'), "la profondeur se referme").toBeNull();
    expect(document.querySelector('[data-testid^="timeline-scene-"]'), "la Timeline est de retour").not.toBeNull();
  });
});
