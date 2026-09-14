// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialProject, parseIntention } from "@/lib/parser";
import { I18nProvider } from "@/lib/i18n";

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
  useClerk: () => ({ openUserProfile: vi.fn() }),
  useUser: () => ({ user: null }),
  useAuth: () => ({ isSignedIn: true, isLoaded: true, userId: "user_1" }) }));

const project = createInitialProject(
  parseIntention("Notre mariage le 5 août 2027, près de Lille, 90 invités."),
  "Notre mariage le 5 août 2027, près de Lille, 90 invités.",
);

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
    updateProject: vi.fn(),
    updateEntity: vi.fn(),
    addEntity: vi.fn(() => "new-id"),
    removeEntity: vi.fn() }) }));

let root: ReturnType<typeof createRoot> | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
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

/*
 * Non-régression du 14/09 : « Documents » est une entrée du rail, et le
 * panneau tombait sur `project.memoryChecklist.filter` — le champ n'existait
 * ni dans le type ni dans les données. On ouvre chaque entrée du menu du haut
 * par le vrai chemin applicatif, pour qu'un panneau cassé ne puisse plus
 * passer inaperçu.
 */
describe("chaque entrée du menu du haut s'ouvre sans planter", () => {
  const sections = ["concevoir", "jour-j"];

  it.each(sections)("la section « %s » ouvre tous ses panneaux", async sectionId => {
    await mountWorld();
    const tab = document.querySelector<HTMLButtonElement>(`[data-testid="world-top-menu-${sectionId}"]`);
    expect(tab, `onglet ${sectionId} absent`).not.toBeNull();
    act(() => tab!.click());

    /* Les identifiants d'items sont stables ; on re-clique l'onglet à chaque
       tour parce que le portail se referme après chaque ouverture. */
    const itemIds = [...document.querySelectorAll<HTMLElement>('[data-testid^="world-top-menu-item-"]')]
      .map(node => node.getAttribute("data-testid")!);
    expect(itemIds.length).toBeGreaterThan(0);

    for (const itemId of itemIds) {
      /* L'onglet bascule : on ne le reclique que si le portail s'est refermé. */
      if (!document.querySelector(`[data-testid="${itemId}"]`)) act(() => tab!.click());
      const item = document.querySelector<HTMLButtonElement>(`[data-testid="${itemId}"]`);
      expect(item, `${itemId} a disparu du portail`).not.toBeNull();
      let error: unknown = null;
      try {
        act(() => item!.click());
      } catch (caught) {
        error = caught;
      }
      expect(error, `« ${itemId} » plante : ${error instanceof Error ? error.message : String(error)}`).toBeNull();
    }
  });
});
