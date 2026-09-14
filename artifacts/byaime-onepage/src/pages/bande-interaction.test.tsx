// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { Router } from "wouter";

import { BandePage } from "./Bande";

// jsdom n'est pas reconnu comme environnement `act` par défaut : on le déclare.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/*
 * La page se rend sans navigateur (renderToStaticMarkup) depuis toujours, mais
 * personne ne vérifie que le compositeur accepte la frappe dans un vrai DOM.
 * Ce fichier le fait : on monte la page dans jsdom, on tape dans le champ du
 * haut, et on regarde si la valeur change. C'est la preuve, pas l'intention.
 */

let root: ReturnType<typeof createRoot> | null = null;
let container: HTMLDivElement | null = null;

function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(
      <Router hook={() => ["/monde", () => {}] as const}>
        <BandePage />
      </Router>,
    );
  });
  return container!;
}

function setValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe("le compositeur du haut, dans un DOM réel", () => {
  it("accepte la frappe et met la valeur à jour", () => {
    const el = mount();
    const input = el.querySelector<HTMLInputElement>('[data-testid="bande-phrase"]');
    expect(input, "champ bande-phrase absent").not.toBeNull();

    const before = input!.value;
    expect(before.length).toBeGreaterThan(0); // la phrase de démonstration est pré-remplie

    act(() => setValue(input!, "Mariage le 12 septembre 2027, près de Bordeaux, 90 invités"));

    expect(input!.value, "la frappe n'a pas mis à jour le champ").toBe(
      "Mariage le 12 septembre 2027, près de Bordeaux, 90 invités",
    );
  });

  it("reconstruit le Monde depuis la phrase tapée, au clic sur le bouton", () => {
    const el = mount();
    const input = el.querySelector<HTMLInputElement>('[data-testid="bande-phrase"]')!;
    const submit = el.querySelector<HTMLButtonElement>('[data-testid="bande-phrase-submit"]')!;

    act(() => setValue(input, "Mariage le 12 septembre 2027, près de Bordeaux, 90 invités"));
    expect(submit.disabled).toBe(false);

    act(() => {
      submit.click();
    });

    // Le fait « ville » reflète la phrase tapée.
    const city = el.querySelector('[data-testid="bande-fact-city"]');
    expect(city?.textContent, "le Monde n'a pas été reconstruit").toContain("Bordeaux");
  });
});
