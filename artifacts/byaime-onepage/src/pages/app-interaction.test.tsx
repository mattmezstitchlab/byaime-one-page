// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/*
 * La page réelle du navigateur n'est pas `LandingPage` montée à la main : c'est
 * `App` en mode dégradé (WouterRouter → QueryClient → store en session absente →
 * ErrorBoundary → Suspense → accueil). Ce test monte l'arbre complet, ouvre le
 * compositeur et tape dans son champ, pour reproduire exactement ce que voit le
 * visiteur de `/`.
 *
 * La Bande (`/monde`) a été retirée le 16/09/2026 : l'accueil est la page
 * unique du site public, et c'est donc lui que le mode dégradé doit servir —
 * sans `ClerkProvider`, ce qui est la raison d'être du store en session absente.
 */

let root: ReturnType<typeof createRoot> | null = null;
let container: HTMLDivElement | null = null;

async function mountApp() {
  const { default: App } = await import("../App");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(<App />);
  });
  // Laisse la route dégradée résoudre et l'accueil se rendre.
  for (let i = 0; i < 30 && !container.querySelector('[data-testid="landing-composer"]'); i++) {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  }
  return container!;
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe("l'app complète (mode dégradé) sur /", () => {
  it("monte l'accueil et accepte la frappe dans le compositeur", async () => {
    const el = await mountApp();

    expect(el.querySelector('[data-testid="landing"]'), "accueil absent de l'arbre complet").not.toBeNull();
    // Le mode dégradé n'affiche pas l'écran « Connexion momentanément indisponible »
    // sur la page qui n'a besoin d'aucune session.
    expect(el.textContent).not.toContain("Connexion momentanément indisponible");
    // La Bande a été retirée : plus aucune trace de son écran.
    expect(el.querySelector('[data-testid="bande-page"]')).toBeNull();

    const start = el.querySelector<HTMLButtonElement>('[data-testid="landing-start-blank"]');
    expect(start, "entrée « Créer un mariage » absente").not.toBeNull();
    act(() => start!.click());

    const input = el.querySelector<HTMLInputElement>('[data-testid="landing-intention-input"]');
    expect(input, "champ du compositeur absent après l'ouverture").not.toBeNull();

    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
    act(() => {
      setter.call(input!, "Mariage le 12 septembre 2027, près de Bordeaux, 90 invités");
      input!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(input!.value).toContain("Bordeaux");
  });
});
