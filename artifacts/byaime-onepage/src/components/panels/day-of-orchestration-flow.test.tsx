// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import { useSyncExternalStore } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialProject, parseIntention } from "@/lib/parser";
import { normalizeProject } from "@/lib/project-migration";
import { annotateDayRun } from "@/lib/day-run";
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

const dayEvents = () => current.timeline.filter(e => e.phase === "pendant").sort((a, b) => a.time - b.time);

/** Ouvre le Monde en Jour J, puis la Régie depuis un Moment du Jour J. */
async function openRunOfShow() {
  const { ProjectStage } = await import("@/components/ProjectStage");
  const { AimePanel } = await import("@/components/AimePanel");
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
  act(() => document.querySelector<HTMLElement>('[data-testid="world-phase-pendant"]')!.click());
  /* La Régie s'ouvre depuis un Moment du Jour J : c'est sa profondeur, plus
     une entrée de menu à chercher. */
  const regie = document.querySelector<HTMLButtonElement>('[data-testid="day-run-regie"]');
  expect(regie, "aucune entrée Régie sur la Timeline du Jour J").not.toBeNull();
  act(() => regie!.click());
  expect(document.querySelector('[data-testid="dayof-run"]'), "la Régie ne s'ouvre pas").not.toBeNull();
}

const delayButton = (minutes: number) =>
  [...document.querySelectorAll<HTMLButtonElement>('[data-testid="dayof-run"] button')]
    .find(button => button.textContent?.trim() === `+${minutes} min`);

/*
 * L'orchestration du Jour J, vérifiée sur le WorldProject lui-même : la Régie
 * ne doit pas avoir sa propre source de vérité. Chaque action est contrôlée
 * avant ET après dans `current.timeline`.
 */
describe("orchestration du Jour J", () => {
  it("lit le même WorldProject que la Timeline", async () => {
    current = createInitialProject(
      parseIntention("Notre mariage le 5 août 2027, près de Lille, 90 invités."),
      "Notre mariage le 5 août 2027, près de Lille, 90 invités.",
    );
    await openRunOfShow();

    const snapshot = annotateDayRun(dayEvents(), Date.now());
    const shown = document.querySelector('[data-testid="dayof-countdown"]')?.textContent ?? "";
    expect(shown.length).toBeGreaterThan(0);
    /* Le compteur « Moments terminés » vient bien du projet, pas d'un état local. */
    expect(document.querySelector('[data-testid="dayof-run"]')?.textContent)
      .toContain(`${snapshot.doneCount}/${snapshot.total}`);
  });

  it("+15 min décale le Moment ET toute la suite, puis « Annuler » restaure", async () => {
    current = createInitialProject(
      parseIntention("Notre mariage le 5 août 2027, près de Lille, 90 invités."),
      "Notre mariage le 5 août 2027, près de Lille, 90 invités.",
    );
    await openRunOfShow();

    const before = dayEvents().map(event => ({ id: event.id, time: event.time }));
    const source = before[2];

    /* Le bouton visé est celui du créneau « Ensuite », troisième carte. */
    const buttons = delayButton(15);
    expect(buttons, "aucun bouton +15 min").not.toBeUndefined();
    act(() => buttons!.click());

    const after = dayEvents().map(event => ({ id: event.id, time: event.time }));
    const shifted = after.filter((event, index) => event.time !== before[index].time);
    expect(shifted.length, "aucun Moment décalé").toBeGreaterThan(1);
    /* Le Moment source cumule le retard déclaré. */
    const moved = current.timeline.find(event => event.id === shifted[0].id);
    expect(moved?.delayMinutes ?? 0).toBeGreaterThan(0);
    expect(moved?.propagation?.state).toBe("applied");
    /* Ce qui précède ne bouge jamais. */
    const untouchedBefore = after.slice(0, after.findIndex(event => event.id === shifted[0].id));
    expect(untouchedBefore).toEqual(before.slice(0, untouchedBefore.length));

    const undo = document.querySelector<HTMLButtonElement>('[data-testid="dayof-undo-delay"]');
    expect(undo, "pas de bouton Annuler").not.toBeNull();
    act(() => undo!.click());
    expect(dayEvents().map(event => ({ id: event.id, time: event.time }))).toEqual(before);
    void source;
  });

  it("+30 et +60 min s'appliquent aussi, et se cumulent", async () => {
    current = createInitialProject(
      parseIntention("Notre mariage le 5 août 2027, près de Lille, 90 invités."),
      "Notre mariage le 5 août 2027, près de Lille, 90 invités.",
    );
    await openRunOfShow();
    const t0 = dayEvents()[2].time;

    for (const minutes of [30, 60]) {
      const button = delayButton(minutes);
      expect(button, `pas de bouton +${minutes} min`).not.toBeUndefined();
      act(() => button!.click());
    }
    /* Le troisième créneau a été décalé deux fois. */
    expect(dayEvents()[2].time).toBeGreaterThan(t0);
  });

  it("un déroulé vide propose de créer le premier Moment au lieu d'afficher un vide mort", async () => {
    current = createInitialProject(
      parseIntention("Notre mariage le 5 août 2027, près de Lille, 90 invités."),
      "Notre mariage le 5 août 2027, près de Lille, 90 invités.",
    );
    /* Projet sans aucun Moment le jour même. */
    commit({ ...current, timeline: current.timeline.filter(event => event.phase !== "pendant") });
    await openRunOfShow();

    expect(document.querySelector('[data-testid="dayof-create-first"]'), "pas de bouton de création").not.toBeNull();
    expect(document.querySelector('[data-testid="dayof-run"]')?.textContent).toContain("déroulé du Jour J est vide");
    act(() => document.querySelector<HTMLElement>('[data-testid="dayof-create-first"]')!.click());
    expect(current.timeline.filter(event => event.phase === "pendant").length).toBe(1);
  });
});
