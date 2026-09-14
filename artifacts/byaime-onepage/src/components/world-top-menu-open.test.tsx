// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import type { WeddingDestination } from "@/lib/wedding-navigation";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/*
 * Les boutons en haut à gauche du Monde Mariage. Le sous-menu était rendu dans
 * la rangée `overflow-x-auto` : un `overflow-x: auto` force `overflow-y` à
 * `auto`, donc le panneau était découpé à la hauteur de la rangée — le clic
 * semblait ne rien faire. Il est maintenant dans un portail : ce test vérifie
 * qu'il existe vraiment dans le DOM après le clic, et qu'un item ouvre sa
 * destination.
 */

let root: ReturnType<typeof createRoot> | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

async function mount(onOpen: (destination: WeddingDestination) => void) {
  const { WorldTopMenu } = await import("./WorldTopMenu");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(<WorldTopMenu role="owner" locale="fr" onOpen={onOpen} />);
  });
  return container!;
}

describe("WorldTopMenu — les boutons du haut à gauche ouvrent leur sous-menu", () => {
  it("rend le sous-menu hors de la rangée défilante", async () => {
    await mount(() => undefined);
    expect(document.querySelector('[data-testid="world-top-menu-panel-concevoir"]')).toBeNull();

    const button = document.querySelector<HTMLButtonElement>('[data-testid="world-top-menu-concevoir"]');
    expect(button).not.toBeNull();
    act(() => button!.click());

    const panel = document.querySelector<HTMLElement>('[data-testid="world-top-menu-panel-concevoir"]');
    expect(panel, "le sous-menu n'est pas rendu au clic").not.toBeNull();
    // Portail : le panneau n'est PAS un enfant de la rangée `overflow-x-auto`.
    expect(document.querySelector('[data-testid="world-top-menu"]')!.contains(panel)).toBe(false);
    expect(panel!.style.position).toBe("fixed");
    expect(panel!.textContent).toContain("Timeline");
  });

  it("ouvre la destination cliquée dans le sous-menu", async () => {
    const opened: WeddingDestination[] = [];
    await mount(destination => opened.push(destination));

    act(() => document.querySelector<HTMLButtonElement>('[data-testid="world-top-menu-concevoir"]')!.click());
    const items = [...document.querySelectorAll<HTMLButtonElement>('[data-testid^="world-top-menu-item-"]')];
    expect(items.length).toBeGreaterThan(3);

    const pilotage = items.find(item => item.textContent?.startsWith("Pilotage"));
    expect(pilotage, "entrée Pilotage absente du sous-menu").toBeTruthy();
    act(() => pilotage!.click());

    expect(opened.at(-1)).toEqual({ kind: "panel", panel: "pilotage" });
    expect(document.querySelector('[data-testid="world-top-menu-panel-concevoir"]'), "le sous-menu reste ouvert").toBeNull();
  });

  it("se referme à Échap", async () => {
    await mount(() => undefined);
    act(() => document.querySelector<HTMLButtonElement>('[data-testid="world-top-menu-jour-j"]')!.click());
    expect(document.querySelector('[data-testid="world-top-menu-panel-jour-j"]')).not.toBeNull();

    act(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(document.querySelector('[data-testid="world-top-menu-panel-jour-j"]')).toBeNull();
  });
});
