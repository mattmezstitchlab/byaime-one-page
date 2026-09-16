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

    /* Une seule porte : « Créer ma carte ». Elle ouvre le Oneboarding, et la
       première étape est toujours la personne — jamais le choix d'un tunnel. */
    const start = el.querySelector<HTMLButtonElement>('[data-testid="landing-create-primary"]');
    expect(start, "entrée « Créer ma carte » absente").not.toBeNull();
    act(() => start!.click());

    const step = el.querySelector('[data-testid="oneboarding-step-person"]');
    expect(step, "première étape du Oneboarding absente").not.toBeNull();
    /* Le repère « Question X sur 5 » est contrôlé sur ses attributs ARIA : le
       libellé suit la langue du parcours, pas le test. */
    const progress = el.querySelector('[role="progressbar"]');
    expect(progress?.getAttribute("aria-valuenow")).toBe("1");
    expect(progress?.getAttribute("aria-valuemax")).toBe("5");
    /*
     * Ce test monte l'app en anglais : le cadre ET le titre d'étape doivent être
     * dans la même langue. Auparavant le titre restait figé en français
     * (« Commençons par vous » sous « Question 1 of 5 ») ; les titres viennent
     * désormais du dictionnaire i18n, comme le reste.
     */
    expect(el.textContent).toContain("Question 1 of 5");
    expect(el.textContent).toContain("Let’s start with you");
    expect(el.textContent).not.toContain("Commençons par vous");

    const input = el.querySelector<HTMLInputElement>('input[maxlength="100"]');
    expect(input, "champ de saisie absent après l'ouverture").not.toBeNull();

    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
    act(() => {
      setter.call(input!, "Camille");
      input!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(input!.value).toBe("Camille");
  });
});
