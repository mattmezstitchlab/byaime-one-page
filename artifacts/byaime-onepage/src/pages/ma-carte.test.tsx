// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/*
 * `/ma-carte` avec un service de carte qui ne répond pas.
 *
 * Constat du 16/09/2026 : la page affichait
 * « Unexpected token '<', "<!DOCTYPE "... is not valid JSON » — le texte brut du
 * parseur — et ce message remplaçait tout le formulaire. C'est ce qui arrive dès
 * que `/api/me/card` renvoie autre chose que du JSON : serveur de développement
 * lancé sans API (Vite répond `index.html`), passerelle qui renvoie sa propre
 * page d'erreur, fonction serveur absente.
 *
 * Ce test monte l'arbre réel du navigateur (`App` → garde de session →
 * `PrivateLayout` → `UniversalCardForm`), avec Clerk simulé en membre, et
 * verrouille les trois règles de remplacement :
 *  1. le formulaire reste rendu — un service injoignable est une information,
 *     pas une page morte ;
 *  2. le message est français et dit quoi faire, jamais technique ;
 *  3. réessayer recharge sans effacer la saisie en cours.
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
    useUser: () => ({
      isLoaded: true,
      isSignedIn: true,
      user: { id: "user_test", primaryEmailAddress: { emailAddress: "jean@example.com" } },
    }),
    useSession: () => ({ isLoaded: true, session: null }),
    useClerk: () => ({ addListener: () => () => {}, signOut: async () => {}, openUserProfile: () => {} }),
  };
});
vi.mock("@clerk/react/internal", () => ({
  publishableKeyFromHost: (_host: string, key?: string) => key,
}));

const PAGE = new Response("<!DOCTYPE html><html><body>index</body></html>", {
  status: 200,
  headers: { "Content-Type": "text/html" },
});
const savedCard = {
  userId: "user_test",
  updatedAt: "2026-09-15T10:00:00.000Z",
  data: {
    firstName: "Jean",
    lastName: "Dupont",
    nickname: "",
    city: "Paris",
    profession: "Photographe",
    photoUrl: "",
    interests: [],
  },
};

/** `cardResponds` pilote `/api/me/card` : page HTML (panne) ou carte enregistrée. */
let cardResponds: "html" | "card" = "html";
let cardCalls = 0;

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

let root: ReturnType<typeof createRoot> | null = null;
let container: HTMLDivElement | null = null;

beforeEach(() => {
  vi.stubEnv("VITE_CLERK_PUBLISHABLE_KEY", "pk_test_preview");
  window.history.pushState({}, "", "/ma-carte");
  window.sessionStorage.clear();
  cardResponds = "html";
  cardCalls = 0;
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/api/me/card")) {
      cardCalls += 1;
      return cardResponds === "html" ? PAGE.clone() : jsonResponse(savedCard);
    }
    if (url.endsWith("/api/me/professional-profiles")) return jsonResponse([]);
    if (url.endsWith("/api/projects")) return jsonResponse([]);
    return jsonResponse({ error: `non simulé : ${url}` }, 404);
  }) as unknown as typeof fetch;
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

async function mountMaCarte() {
  const { default: App } = await import("../App");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(<App />);
  });
  // Laisse la garde de session passer et le chargement de la carte aboutir.
  for (let i = 0; i < 40; i++) {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 25));
    });
    if (
      container.querySelector('[data-testid="universal-card-form"]') &&
      !container.querySelector('[data-testid="universal-card-loading"]')
    )
      break;
  }
  return container!;
}

function setValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function click(button: HTMLElement) {
  act(() => button.click());
  for (let i = 0; i < 20; i++) {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 25));
    });
  }
}

describe("/ma-carte quand le service de la carte ne répond pas", () => {
  it("garde le formulaire utilisable et le dit en français", async () => {
    const el = await mountMaCarte();

    expect(cardCalls, "la carte n'a pas été demandée").toBeGreaterThan(0);
    expect(
      el.querySelector('[data-testid="universal-card-form"]'),
      "le formulaire a disparu derrière le message d'échec",
    ).not.toBeNull();

    const warning = el.querySelector('[data-testid="card-load-error"]');
    expect(warning, "aucun avertissement affiché").not.toBeNull();
    expect(warning!.textContent).toContain("répondu une page au lieu de vos données");
    expect(warning!.textContent).toContain("Votre saisie reste sur cette page");
    // Le texte brut du parseur ne doit plus jamais atteindre l'écran.
    expect(el.textContent).not.toContain("Unexpected token");
    expect(el.textContent).not.toContain("is not valid JSON");
    // La page n'est pas non plus tombée sur le garde-fou global.
    expect(el.textContent).not.toContain("Une erreur est survenue");

    // Les champs restent présents et saisissables.
    const firstName = el.querySelector<HTMLInputElement>('input[maxlength="100"]');
    expect(firstName, "champ de saisie absent").not.toBeNull();
  });

  it("réessaie sans effacer la saisie, puis recharge la carte du compte", async () => {
    const el = await mountMaCarte();

    const fields = Array.from(el.querySelectorAll<HTMLInputElement>('input[maxlength="100"]'));
    setValue(fields[0], "Camille");
    expect(fields[0].value).toBe("Camille");

    // Premier réessai : la panne continue, la saisie doit survivre.
    await click(el.querySelector<HTMLButtonElement>('[data-testid="card-load-error"] button')!);
    expect(cardCalls, "le réessai n'a pas relancé la demande").toBeGreaterThan(1);
    const stillThere = Array.from(
      container!.querySelectorAll<HTMLInputElement>('input[maxlength="100"]'),
    );
    expect(stillThere[0]?.value, "la saisie a été effacée par le réessai").toBe("Camille");
    expect(container!.querySelector('[data-testid="card-load-error"]')).not.toBeNull();

    // Second réessai : le service répond, la carte enregistrée reprend la main.
    cardResponds = "card";
    await click(container!.querySelector<HTMLButtonElement>('[data-testid="card-load-error"] button')!);
    expect(container!.querySelector('[data-testid="card-load-error"]'), "avertissement resté affiché").toBeNull();
    expect(container!.textContent).toContain("Carte enregistrée");
    expect(container!.textContent).toContain("Jean");
  });
});
