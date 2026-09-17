// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import { useSyncExternalStore } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialProject, parseIntention } from "@/lib/parser";
import { normalizeProject } from "@/lib/project-migration";
import { I18nProvider } from "@/lib/i18n";
import { MOMENT_PRIMARY_COUNT } from "@/lib/moment-context";
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

let current: WorldProject;
const listeners = new Set<() => void>();
const commit = (next: WorldProject) => {
  current = normalizeProject(next);
  listeners.forEach(fn => fn());
};

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
    updateProject: (patch: Partial<WorldProject>) => commit({ ...current, ...patch } as WorldProject),
    updateEntity: (collection: string, id: string, patch: Record<string, unknown>) => {
      const list = (current as unknown as Record<string, { id: string }[]>)[collection] ?? [];
      commit({ ...current, [collection]: list.map(item => (item.id === id ? { ...item, ...patch } : item)) } as WorldProject);
    },
    addEntity: (collection: string, entity: Record<string, unknown>) => {
      const id = `added-${Math.random().toString(36).slice(2, 8)}`;
      const list = (current as unknown as Record<string, unknown[]>)[collection] ?? [];
      commit({ ...current, [collection]: [...list, { id, ...entity }] } as unknown as WorldProject);
      return id;
    },
    removeEntity: (collection: string, id: string) => {
      const list = (current as unknown as Record<string, { id: string }[]>)[collection] ?? [];
      commit({ ...current, [collection]: list.filter(item => item.id !== id) } as unknown as WorldProject);
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

const INTENTION = "Notre mariage le 5 août 2027, près de Lille, 90 invités.";

function newProject() {
  current = createInitialProject(parseIntention(INTENTION), INTENTION);
  return current;
}

async function mountWorld() {
  const { ProjectStage } = await import("./ProjectStage");
  const { AimePanel } = await import("./AimePanel");
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
          {/* Le Panneau AIME est monté dans PrivateLayout en production ;
              ici on le monte à côté du Monde, comme elle le fait. */}
          <AimePanel />
        </I18nProvider>
      </Router>,
    );
  });
  return container!;
}

const click = (el: Element | null, label = "élément") => {
  expect(el, `introuvable : ${label}`).not.toBeNull();
  act(() => (el as HTMLElement).click());
};

const sceneOf = (titleFragment: string) =>
  [...document.querySelectorAll<HTMLElement>('[data-testid^="timeline-scene-"]')]
    .find(scene => scene.textContent?.includes(titleFragment));

/*
 * UN MOMENT = UN CONTEXTE = SES ACTIONS.
 *
 * Le produit s'organise dans la Timeline : chaque Moment porte ses repères et
 * une courte sélection d'actions, et chaque action ouvre la profondeur
 * correspondante ANCRÉE sur ce Moment. Plus aucun panneau à chercher dans un
 * menu pour retrouver son contexte.
 */
describe("les Moments portent leur contexte et leurs actions", () => {
  it("affiche repères et actions dans chaque scène, sans grille de boutons", async () => {
    newProject();
    await mountWorld();

    const scenes = [...document.querySelectorAll<HTMLElement>('[data-testid^="timeline-scene-"]')];
    expect(scenes.length).toBeGreaterThan(10);

    for (const scene of scenes) {
      const actions = [...scene.querySelectorAll<HTMLElement>('[data-testid^="moment-action-"]')]
        .filter(node => node.getAttribute("data-testid") !== "moment-action-more");
      /* Jamais plus que la sélection primaire visible d'un coup. */
      expect(actions.length, `${scene.getAttribute("data-testid")} : trop d'actions visibles`)
        .toBeLessThanOrEqual(MOMENT_PRIMARY_COUNT);
      expect(scene.getAttribute("data-moment-intent")).toBeTruthy();
    }
  });

  it("montre le professionnel relié au Moment, dans la scène comme dans le panneau", async () => {
    newProject();
    await mountWorld();

    const scene = sceneOf("découverte du lieu");
    expect(scene, "Moment du lieu introuvable").toBeTruthy();
    /* Le repère vient du WorldProject : même nom que dans le panneau. */
    expect(scene!.textContent).toContain("Château de la Tour");

    click(scene!.querySelector('[data-testid="moment-action-providers"]'), "action Rechercher");
    expect(document.querySelector('[data-testid="monde-panel"]'), "aucune profondeur ouverte").not.toBeNull();
    /* La profondeur est ancrée : elle dit d'où elle vient et comment revenir. */
    expect(document.querySelector('[data-testid="monde-panel-moment"]')?.textContent)
      .toContain("découverte du lieu");
    expect(document.querySelector('[data-moment-linked="true"]'), "le professionnel du Moment n'est pas signalé")
      .not.toBeNull();

    click(document.querySelector('[data-testid="monde-panel-back-moment"]'), "retour au Moment");
    expect(document.querySelector('[data-testid="monde-panel"]'), "la profondeur reste ouverte").toBeNull();
    expect(document.querySelector('[data-testid^="timeline-scene-"]'), "la Timeline a disparu").not.toBeNull();
  });

  it("ouvre les Documents sur le périmètre du Moment", async () => {
    newProject();
    await mountWorld();

    const scene = sceneOf("découverte du lieu");
    click(scene!.querySelector('[data-testid="moment-action-documents"]'), "action Documents");

    expect(document.querySelector('[data-testid="documents-moment-scope"]'), "aucun ancrage du Moment dans Documents")
      .not.toBeNull();
    /* Le document du prestataire relié est là — et le périmètre le dit. */
    const panel = document.querySelector('[data-testid="monde-panel"]')?.textContent ?? "";
    expect(panel).toContain("Contrat de location");
    expect(panel).toContain("1 lié(s) à ce Moment");
    /* Les documents des autres postes ne polluent pas ce Moment. */
    expect(panel).not.toContain("Devis Traiteur");
    expect(panel).not.toContain("Brochure Photographe");
  });

  it("replie les actions secondaires sous « Plus »", async () => {
    newProject();
    await mountWorld();

    const scene = sceneOf("Choix du photographe");
    const more = scene!.querySelector('[data-testid="moment-action-more"]');
    expect(more, "aucun repli « Plus » sur un Moment riche").not.toBeNull();
    expect(more!.textContent).toContain("Plus");

    const before = scene!.querySelectorAll('[data-testid^="moment-action-"]').length;
    click(more, "Plus");
    const after = sceneOf("Choix du photographe")!.querySelectorAll('[data-testid^="moment-action-"]').length;
    expect(after).toBeGreaterThan(before);
  });

  it("donne au Jour J la Régie comme profondeur, pas comme entrée de menu", async () => {
    newProject();
    await mountWorld();

    act(() => document.querySelector<HTMLElement>('[data-testid="world-phase-pendant"]')!.click());
    expect(document.querySelector('[data-testid="day-run"]'), "la régie ne s'affiche pas").not.toBeNull();

    /* La Régie n'est pas une entrée de menu dédiée : elle s'ouvre depuis le
       Jour J. La colonne du panneau n'en propose pas. */
    act(() => window.dispatchEvent(new Event("aime:open-ai")));
    const column = document.querySelector('[data-testid="aime-panel"]');
    expect(column, "le panneau ne s'ouvre pas").not.toBeNull();
    expect(column!.textContent).not.toContain("Régie du Jour J");
    act(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));

    click(document.querySelector('[data-testid="day-run-regie"]'), "entrée Régie du Jour J");
    expect(document.querySelector('[data-testid="dayof-run"]'), "la Régie ne s'ouvre pas").not.toBeNull();
  });

  it("donne à l'Après ses gestes : galerie, remerciements, partage", async () => {
    newProject();
    await mountWorld();

    act(() => document.querySelector<HTMLElement>('[data-testid="world-phase-apres"]')!.click());
    expect(document.querySelector('[data-testid="apres-overview"]'), "aucune tête Après").not.toBeNull();

    const thanks = sceneOf("mots doux");
    expect(thanks, "Moment des remerciements introuvable").toBeTruthy();
    click(thanks!.querySelector('[data-testid="moment-action-thanks"]'), "action Remerciements");
    expect(document.querySelector('[data-testid="monde-panel"]'), "aucune profondeur ouverte").not.toBeNull();
  });
});
