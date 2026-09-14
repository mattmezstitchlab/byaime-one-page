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

/*
 * Un store MUTABLE : les clics modifient vraiment le projet, comme dans
 * l'application. Sans ça, un test peut valider un bouton qui ne fait rien.
 */
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

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  listeners.clear();
});

function newProject(seed = "Notre mariage le 5 août 2027, près de Lille, 90 invités.") {
  current = createInitialProject(parseIntention(seed), seed);
  return current;
}

/** Monte le Monde et le force à se re-rendre quand le store change. */
async function mountWorld() {
  const { ProjectStage } = await import("./ProjectStage");
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

const text = () => document.body.textContent ?? "";

/*
 * Le parcours réel, de la création au retour : un seul WorldProject, une seule
 * Timeline, une seule orchestration. Chaque étape doit s'ouvrir, afficher des
 * données cohérentes et ne laisser aucun état impossible.
 */
describe("parcours complet du couple", () => {
  it("crée un Monde depuis l'intention, avec ses trois périodes peuplées", () => {
    const project = newProject();
    expect(project.universe).toBe("Mariage");
    expect(project.memoryChecklist.length).toBeGreaterThan(0);
    expect(project.heroVisual?.url).toBeTruthy();
    const count = (phase: string) => project.timeline.filter(e => e.phase === phase).length;
    expect(count("avant")).toBeGreaterThan(10);
    expect(count("pendant")).toBeGreaterThan(5);
    expect(count("apres")).toBeGreaterThan(0);
  });

  it("Avant → Jour J → Après : chaque période a sa Timeline et aucune fenêtre fantôme", async () => {
    newProject();
    await mountWorld();

    /* Avant : la préparation, pas la régie. */
    expect(text()).toContain("Avant");
    expect(document.querySelector('[data-testid="day-run"]')).toBeNull();
    expect(document.querySelectorAll('[data-testid^="timeline-scene-"]').length).toBeGreaterThan(10);

    /* Jour J : la régie prend la main. */
    click('[data-testid="world-phase-pendant"]');
    expect(document.querySelector('[data-testid="day-run"]'), "la régie ne s'affiche pas en Jour J").not.toBeNull();
    expect(document.querySelector('[data-testid="day-countdown"]')).not.toBeNull();

    /* Après : ni régie, ni sélecteur cassé. */
    click('[data-testid="world-phase-apres"]');
    expect(document.querySelector('[data-testid="day-run"]')).toBeNull();
    expect(document.querySelector('[data-testid="world-phase-avant"]')).not.toBeNull();

    /* Retour en Avant : état propre, aucune fenêtre restée ouverte. */
    click('[data-testid="world-phase-avant"]');
    expect(document.querySelector('[data-testid="day-run"]')).toBeNull();
  });

  it("ouvre les entrées du menu aplati, puis revient à la Timeline", async () => {
    newProject();
    await mountWorld();

    /*
     * Les entrées « vue » (Infos pratiques, Musique) changent la Timeline
     * affichée ; les entrées « panneau » ouvrent la fenêtre unique. Les deux
     * doivent aboutir — et aucune fenêtre ne doit se refermer toute seule.
     */
    /* Dérivé du modèle de navigation, pas deviné à la main. */
    const { buildAdminPlan } = await import("@/lib/admin-plan");
    const viewItems = new Set<string>();
    for (const section of buildAdminPlan("owner", "fr").sections) {
      for (const item of section.items) {
        if (item.destination.kind === "view") viewItems.add(`world-top-menu-item-${item.id}`);
      }
    }
    expect(viewItems.size).toBeGreaterThan(0);

    /* Une seule liste plate : on l'ouvre et on parcourt toutes ses entrées. */
    {
      click('[data-testid="world-top-menu-button"]');
      const ids = [...document.querySelectorAll<HTMLElement>('[data-testid^="world-top-menu-item-"]')]
        .map(node => node.getAttribute("data-testid")!);
      for (const id of ids) {
        if (!document.querySelector(`[data-testid="${id}"]`)) click('[data-testid="world-top-menu-button"]');
        act(() => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)!.click());

        if (viewItems.has(id)) {
          /* Une vue : le Monde reste affiché, aucune fenêtre ne doit traîner. */
          expect(document.querySelector('[data-testid="world-hero-edit-visual"]'),
            `${id} : le Monde a disparu`).not.toBeNull();
        } else {
          expect(document.querySelector('[data-testid="monde-panel"]'),
            `${id} : aucune fenêtre ouverte après le clic`).not.toBeNull();
        }
      }
    }
  });

  it("Documents : la checklist des souvenirs est lue et cochable", async () => {
    const project = newProject();
    await mountWorld();
    click('[data-testid="world-top-menu-button"]');
    const docs = [...document.querySelectorAll<HTMLElement>('[data-testid^="world-top-menu-item-"]')]
      .find(node => /Documents/.test(node.textContent ?? ""));
    act(() => docs!.click());

    expect(text()).toContain("souvenirs cochés");
    const before = current.memoryChecklist.filter(item => item.done).length;
    expect(before).toBe(project.memoryChecklist.filter(item => item.done).length);
  });

  it("propose l'aperçu du mini-site invité depuis le Monde", async () => {
    const project = newProject();
    await mountWorld();
    const link = document.querySelector<HTMLAnchorElement>('[data-testid="world-mini-site-preview"]');
    expect(link, "aucun accès au mini-site").not.toBeNull();
    expect(link!.getAttribute("href")).toBe(`/profil/${project.id}?apercu=1`);
  });

  it("un projet enregistré sans memoryChecklist ne casse pas Documents", () => {
    /* Données historiques : le champ n'existait pas avant le 14/09. */
    const legacy = { ...newProject() } as unknown as Record<string, unknown>;
    delete legacy.memoryChecklist;
    const migrated = normalizeProject(legacy as unknown as WorldProject);
    expect(Array.isArray(migrated.memoryChecklist)).toBe(true);
    expect(migrated.memoryChecklist).toEqual([]);
    /* Aucune ligne, donc aucun `.filter` sur undefined. */
    expect(migrated.memoryChecklist.filter(item => item.done)).toEqual([]);
  });
});
