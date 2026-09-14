// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import type { WeddingDestination } from "@/lib/wedding-navigation";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/*
 * Le menu est un seul bouton qui ouvre une liste plate. Le panneau vit dans un
 * portail : dans la rangée `overflow-x-auto`, un `overflow-x: auto` force
 * `overflow-y` à `auto` et le panneau était découpé — le clic semblait ne rien
 * faire. Ce test vérifie qu'il existe vraiment dans le DOM après le clic, qu'il
 * n'est pas un enfant de la rangée, et qu'un item ouvre sa destination.
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
    root!.render(<WorldTopMenu role="owner" locale="fr" phase="avant" onOpen={onOpen} />);
  });
  return container!;
}

describe("WorldTopMenu — le bouton unique ouvre la liste plate", () => {
  it("rend le panneau hors de la rangée défilante", async () => {
    await mount(() => undefined);
    expect(document.querySelector('[data-testid="world-top-menu-panel-monde"]')).toBeNull();

    const button = document.querySelector<HTMLButtonElement>('[data-testid="world-top-menu-button"]');
    expect(button).not.toBeNull();
    act(() => button!.click());

    const panel = document.querySelector<HTMLElement>('[data-testid="world-top-menu-panel-monde"]');
    expect(panel, "le menu n'est pas rendu au clic").not.toBeNull();
    expect(document.querySelector('[data-testid="world-top-menu"]')!.contains(panel)).toBe(false);
    expect(panel!.style.position).toBe("fixed");
    expect(panel!.textContent).toContain("Timeline");
  });

  it("ouvre la destination cliquée dans la liste", async () => {
    const opened: WeddingDestination[] = [];
    await mount(destination => opened.push(destination));

    act(() => document.querySelector<HTMLButtonElement>('[data-testid="world-top-menu-button"]')!.click());
    const items = [...document.querySelectorAll<HTMLButtonElement>('[data-testid^="world-top-menu-item-"]')];
    expect(items.length).toBeGreaterThan(3);

    const pilotage = items.find(item => item.textContent?.startsWith("Pilotage"));
    expect(pilotage, "entrée Pilotage absente du menu").toBeTruthy();
    act(() => pilotage!.click());

    expect(opened.at(-1)).toEqual({ kind: "panel", panel: "pilotage" });
    expect(document.querySelector('[data-testid="world-top-menu-panel-monde"]'), "le menu reste ouvert").toBeNull();
  });

  it("se referme à Échap", async () => {
    await mount(() => undefined);
    act(() => document.querySelector<HTMLButtonElement>('[data-testid="world-top-menu-button"]')!.click());
    expect(document.querySelector('[data-testid="world-top-menu-panel-monde"]')).not.toBeNull();

    act(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(document.querySelector('[data-testid="world-top-menu-panel-monde"]')).toBeNull();
  });
});
