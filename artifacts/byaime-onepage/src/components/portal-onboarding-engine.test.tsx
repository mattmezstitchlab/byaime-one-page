// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/*
 * L'espace privé doit emprunter **le même** moteur que l'accueil.
 *
 * C'est l'exigence 6 du chantier : « intégrer le même moteur dans
 * PortalOnboarding ». Rien ne l'empêchait de dériver silencieusement vers un
 * second parcours — `PortalOnboarding` ne fait que rendre `LandingComposer`, qui
 * lui-même ne fait que rendre `Oneboarding`. Ce fichier verrouille la chaîne :
 * si un jour le portail remonte autre chose, ou si l'un des deux maillons cesse
 * d'être un simple relais, ces tests cassent.
 *
 * Le but utilisateur : une seule traversée, pas un parcours reconstruit selon
 * l'endroit où l'on entre.
 */

vi.mock("@clerk/react", () => {
  const passthrough = ({ children }: { children?: ReactNode }) => children ?? null;
  return {
    ClerkProvider: passthrough,
    Show: ({ when, children }: { when: string; children?: ReactNode }) =>
      when === "signed-in" ? (children ?? null) : null,
    SignIn: () => null,
    SignUp: () => null,
    useAuth: () => ({ isLoaded: true, isSignedIn: true, userId: "user_test" }),
    useUser: () => ({ isLoaded: true, isSignedIn: true, user: { id: "user_test" } }),
    useSession: () => ({ isLoaded: true, session: null }),
    useClerk: () => ({ addListener: () => () => {}, signOut: async () => {} }),
  };
});
vi.mock("@clerk/react/internal", () => ({
  publishableKeyFromHost: (_host: string, key?: string) => key,
}));

const store = vi.hoisted(() => ({
  navigated: [] as string[],
}));

vi.mock("@/store/project-store", () => ({
  useProject: () => ({
    projects: [],
    project: null,
    selectProject: vi.fn(async () => true),
    createProjectOnServer: vi.fn(),
    createWeddingDemo: vi.fn(),
    syncStatus: "saved",
  }),
}));

vi.mock("wouter", async () => {
  const actual = await vi.importActual<typeof import("wouter")>("wouter");
  return {
    ...actual,
    useLocation: () => ["/", (to: string) => store.navigated.push(to)] as const,
  };
});

import { I18nProvider } from "@/lib/i18n";
import { Router } from "wouter";
import { PortalOnboarding } from "./PortalOnboarding";

let root: ReturnType<typeof createRoot> | null = null;
let container: HTMLDivElement | null = null;

async function settle(times = 12) {
  for (let i = 0; i < times; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  }
}

async function mount() {
  /* Aucune carte côté serveur : le portail part de zéro, comme l'accueil. */
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/me/card")) return jsonResponse(null);
      if (url.endsWith("/api/me/professional-profiles")) return jsonResponse([]);
      return jsonResponse(null, 404);
    }),
  );

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <I18nProvider initialLocale="fr">
        <Router>
          <PortalOnboarding />
        </Router>
      </I18nProvider>,
    );
  });
  await settle();
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const byTestId = (id: string) => container!.querySelector(`[data-testid="${id}"]`);
const text = () => container!.textContent ?? "";

async function click(el: Element | null) {
  if (!el) throw new Error("élément absent au clic");
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await settle();
}

beforeEach(() => {
  store.navigated = [];
});

afterEach(() => {
  vi.unstubAllGlobals();
  root?.unmount();
  container?.remove();
  root = null;
  container = null;
});

describe("l'espace privé emprunte le même moteur que l'accueil", () => {
  it("ouvre sur la même porte unique", async () => {
    await mount();

    /* La porte du Oneboarding, pas une porte propre au portail. */
    expect(byTestId("oneboarding-entry")).not.toBeNull();
    expect(byTestId("landing-create-primary")).not.toBeNull();
    expect(text()).toContain("Votre carte BYAIME");

    /* L'ancien choix binaire du portail a disparu. */
    expect(text()).not.toContain("Couple ou Wedding planner");
  });

  it("déroule les cinq étapes du Oneboarding, avec le même repère", async () => {
    await mount();
    await click(byTestId("landing-create-primary"));

    /* C'est bien le moteur partagé qui tourne, pas un parcours parallèle. */
    expect(byTestId("oneboarding")).not.toBeNull();
    expect(byTestId("oneboarding-step-person")).not.toBeNull();

    const progress = byTestId("oneboarding")?.querySelector('[role="progressbar"]');
    expect(progress?.getAttribute("aria-valuenow")).toBe("1");
    expect(progress?.getAttribute("aria-valuemax")).toBe("5");
    expect(text()).toContain("Commençons par vous");
  });

  it("ne remonte pas un second formulaire : LandingComposer n'est qu'un relais", async () => {
    await mount();
    await click(byTestId("landing-create-primary"));

    /*
     * L'ancienne machine à étapes de `UniversalCardForm` ne doit pas réapparaître
     * sous le portail : un seul système de formulaire, orchestré par le plan.
     */
    expect(byTestId("universal-card-form")).toBeNull();
    expect(byTestId("oneboarding-step-person")).not.toBeNull();
  });
});
