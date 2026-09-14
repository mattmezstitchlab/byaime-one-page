// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/*
 * La page réelle du navigateur n'est pas `BandePage` montée à la main : c'est
 * `App` en mode dégradé (WouterRouter → QueryClient → ErrorBoundary → Suspense
 * → Bande en lazy). Ce test monte l'arbre complet et tape dans le champ du
 * haut, pour reproduire exactement ce que voit le visiteur de `/monde`.
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
  // Laisse la route dégradée résoudre et la Bande (lazy) se charger.
  for (let i = 0; i < 30 && !container.querySelector('[data-testid="bande-phrase"]'); i++) {
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

describe("l'app complète (mode dégradé) sur /monde", () => {
  it("monte la Bande et accepte la frappe dans le champ du haut", async () => {
    const el = await mountApp();
    const input = el.querySelector<HTMLInputElement>('[data-testid="bande-phrase"]');
    expect(input, "champ bande-phrase absent de l'arbre complet").not.toBeNull();

    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
    act(() => {
      setter.call(input, "Mariage le 12 septembre 2027, près de Bordeaux, 90 invités");
      input!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(input!.value).toContain("Bordeaux");

    const submit = el.querySelector<HTMLButtonElement>('[data-testid="bande-phrase-submit"]');
    expect(submit).not.toBeNull();
    act(() => submit!.click());
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    const city = el.querySelector('[data-testid="bande-fact-city"]');
    expect(city?.textContent).toContain("Bordeaux");
  });
});
