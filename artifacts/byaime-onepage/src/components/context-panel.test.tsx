// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@clerk/react", () => ({
  useClerk: () => ({ openUserProfile: vi.fn() }),
  useUser: () => ({ user: null }),
  useAuth: () => ({ isSignedIn: true, isLoaded: true, userId: "user_1" }),
}));

let container: HTMLDivElement | null = null;
let root: Root | null = null;

async function mountDock(onClose = vi.fn()) {
  const { ContextPanel } = await import("./ContextPanel");
  container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container!);
    root.render(
      <I18nProvider>
        <ContextPanel eyebrow="Moment" title="La cérémonie" onClose={onClose}>
          <input data-testid="first-field" defaultValue="15:30" />
          <p>Un champ plus bas.</p>
        </ContextPanel>
      </I18nProvider>,
    );
  });
  return onClose;
}

afterEach(() => {
  act(() => { root?.unmount(); });
  root = null;
  container?.remove();
  container = null;
  document.body.innerHTML = "";
});

/*
 * L'inspecteur est ce qui distingue un éditeur d'un formulaire : il règle CE
 * qu'on a sélectionné, à côté, sans cacher la sélection. Ces tests verrouillent
 * le conteneur — pas les champs, qui appartiennent à chaque écran.
 */
describe("l'inspecteur ancré", () => {
  it("s'ancre à droite sans voler la page", async () => {
    await mountDock();
    const dock = document.querySelector<HTMLElement>('[data-testid="context-panel"]');
    expect(dock).not.toBeNull();
    expect(dock!.hasAttribute("data-aime-inspector")).toBe(true);
    /* Une modale aurait coupé le fil de l'écran : ce n'en est pas une. */
    expect(dock!.getAttribute("aria-modal")).toBe("false");
    expect(dock!.getAttribute("role")).toBe("dialog");
    /* Le fil se cale à sa gauche pendant sa durée de vie. */
    expect(document.documentElement.classList.contains("aime-inspector-open")).toBe(true);
  });

  it("rend sa place au fil quand on le ferme", async () => {
    await mountDock();
    act(() => { root?.unmount(); });
    root = null;
    expect(document.documentElement.classList.contains("aime-inspector-open")).toBe(false);
    expect(document.querySelector('[data-testid="context-panel"]')).toBeNull();
  });

  it("se ferme à la croix comme à l'Échap", async () => {
    const onClose = await mountDock();
    const close = document.querySelector<HTMLElement>('[data-testid="context-panel-close"]');
    expect(close).not.toBeNull();
    act(() => close!.click());
    expect(onClose).toHaveBeenCalledTimes(1);

    act(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("pose le focus sur le premier champ réglable", async () => {
    await mountDock();
    expect(document.activeElement?.getAttribute("data-testid")).toBe("first-field");
  });
});
