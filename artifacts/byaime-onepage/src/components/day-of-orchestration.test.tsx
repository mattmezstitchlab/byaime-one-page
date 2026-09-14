// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialProject, parseIntention } from "@/lib/parser";
import { I18nProvider } from "@/lib/i18n";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/* framer-motion révèle les scènes au scroll via IntersectionObserver, absent de jsdom. */
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
  useAuth: () => ({ isSignedIn: true, isLoaded: true, userId: "user_1" }),
}));

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
    removeEntity: vi.fn(),
  }),
}));

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

const click = (el: Element | null | undefined) => {
  expect(el, "élément cliquable introuvable").not.toBeNull();
  act(() => (el as HTMLElement).click());
};

/*
 * Non-régression du 14/09.
 *
 * Le couple ouvrait son Monde, cherchait l'orchestration du Jour J et ne la
 * trouvait pas. Deux causes, mesurées avant correction :
 *   1. le seul sélecteur de période vivait dans la barre latérale de
 *      `BottomDock`, qui ne se rend QUE si une fenêtre est déjà ouverte —
 *      Monde ouvert sans fenêtre, aucune période n'était atteignable ;
 *   2. « Régie du Jour J » (menu du haut) appelait `setActivePanel` brut : la
 *      phase restait sur « avant », l'effet de disponibilité refermait la
 *      fenêtre dans la foulée. Le clic ne faisait rien.
 */
describe("l'orchestration du Jour J est atteignable", () => {
  it("propose les trois périodes dès l'ouverture, sans fenêtre ouverte", async () => {
    await mountWorld();
    expect(document.querySelector('[data-testid="world-phase-switch"]')).not.toBeNull();
    for (const id of ["avant", "pendant", "apres"]) {
      expect(document.querySelector(`[data-testid="world-phase-${id}"]`), `période ${id} absente`).not.toBeNull();
    }
  });

  it("bascule sur le Jour J et montre le déroulé en direct", async () => {
    await mountWorld();
    click(document.querySelector('[data-testid="world-phase-pendant"]'));

    /* La Timeline ne montre plus que les Moments du jour, en mode régie. */
    expect(document.querySelector('[data-testid="day-run"]'), "la régie du Jour J ne s'affiche pas").not.toBeNull();
    expect(document.querySelector('[data-testid="day-countdown"]')).not.toBeNull();
    expect(document.querySelectorAll('[data-testid="day-moment"]').length).toBeGreaterThan(5);
  });

  it("ouvre la Régie du Jour J depuis la Timeline du Jour J", async () => {
    await mountWorld();
    click(document.querySelector('[data-testid="world-phase-pendant"]'));
    /* La Régie est la profondeur du Jour J : on y entre depuis le déroulé,
       pas depuis un menu à explorer. */
    const regie = document.querySelector<HTMLButtonElement>('[data-testid="day-run-regie"]');
    expect(regie, "aucune entrée Régie sur la Timeline du Jour J").not.toBeNull();
    click(regie);

    expect(document.body.textContent).toContain("Le déroulé du Jour J");
    /* La régie affiche bien l'orchestration calculée, pas seulement des champs. */
    expect(document.querySelector('[data-testid="dayof-run"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="dayof-countdown"]')?.textContent?.trim().length).toBeGreaterThan(0);
    for (const slot of ["live", "next", "late"]) {
      expect(document.querySelector(`[data-testid="dayof-slot-${slot}"]`), `créneau ${slot} absent`).not.toBeNull();
    }
  });
});
