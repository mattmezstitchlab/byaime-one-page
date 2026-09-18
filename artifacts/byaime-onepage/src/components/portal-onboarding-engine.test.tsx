// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/*
 * Le portail privé n'est plus une seconde entrée de Carte Universelle : il
 * ouvre directement la Timeline, avec une création vide immédiate et une aide
 * optionnelle d'AIME pour préremplir les faits compris dans une phrase.
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
  createProjectFromDraft: vi.fn(),
  createWeddingDemo: vi.fn(),
}));

vi.mock("@/store/project-store", () => ({
  useProject: () => ({
    projects: [],
    project: null,
    selectProject: vi.fn(async () => true),
    createProjectOnServer: vi.fn(),
    createProjectFromDraft: store.createProjectFromDraft,
    createWeddingDemo: store.createWeddingDemo,
    syncStatus: "saved",
  }),
}));

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
  store.createProjectFromDraft.mockClear();
  store.createWeddingDemo.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  root?.unmount();
  container?.remove();
  root = null;
  container = null;
});

describe("l'espace privé ouvre directement la Timeline", () => {
  it("présente une Timeline vide sans remonter la Carte Universelle", async () => {
    await mount();

    expect(byTestId("timeline-start")).not.toBeNull();
    expect(byTestId("timeline-start-empty")).not.toBeNull();
    expect(byTestId("timeline-start-agent")).not.toBeNull();
    expect(byTestId("timeline-start-card")).not.toBeNull();
    expect(byTestId("universal-card-form")).toBeNull();
    expect(text()).toContain("Commencez par le fil.");
  });

  it("crée un Monde vide au clic, sans imposer un questionnaire", async () => {
    await mount();
    await click(byTestId("timeline-start-empty"));

    expect(store.createProjectFromDraft).toHaveBeenCalledTimes(1);
    expect(store.createProjectFromDraft).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Mon mariage", universe: "Mariage" }),
      "",
    );
  });

  it("transmet la phrase optionnelle au parseur avant de créer la Timeline", async () => {
    await mount();
    const input = byTestId("timeline-start-input") as HTMLTextAreaElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")!.set!;
      setter.call(input, "Notre mariage le 14 août 2027 près de Lille, 120 invités.");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await click(byTestId("timeline-start-agent-submit"));

    expect(store.createProjectFromDraft).toHaveBeenCalledTimes(1);
    const [draft, subtitle] = store.createProjectFromDraft.mock.calls[0] as [Record<string, unknown>, string];
    expect(draft.title).toBe("Notre Mariage");
    expect((draft.guestsCount as { value: number }).value).toBe(120);
    expect((draft.city as { value: string }).value).toContain("Lille");
    expect(subtitle).toContain("14 août 2027");
    expect(text()).not.toContain("Couple ou Wedding planner");
    expect(byTestId("universal-card-form")).toBeNull();
  });
});
