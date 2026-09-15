// @vitest-environment jsdom
/*
 * La carte confirmée par un visiteur suit le cycle de vie de la phrase
 * d'intention : stockée en local, lue, consommée une fois, supprimée.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { clearPendingCarte, readPendingCarte, savePendingCarte } from "./intention-draft";

beforeEach(() => {
  window.localStorage.clear();
});

describe("pending carte — même cycle de vie que la phrase", () => {
  it("stocke le texte brut et son nom, puis disparaît une fois consommée", () => {
    expect(readPendingCarte()).toBeNull();

    savePendingCarte({ text: '{ "kind": "carte-aime", "name": "Camille & Léo" }', name: "carte-aime.json" });
    const pending = readPendingCarte();
    expect(pending?.text).toContain("Camille & Léo");
    expect(pending?.name).toBe("carte-aime.json");
    /* La lecture ne consomme pas : c'est la consommation qui efface. */
    expect(readPendingCarte()).not.toBeNull();

    clearPendingCarte();
    expect(readPendingCarte()).toBeNull();
  });

  it("une carte vide est refusée, un JSON corrompu est ignoré sans lever", () => {
    savePendingCarte({ text: "   ", name: "carte.json" });
    expect(window.localStorage.getItem("aime-carte-pending")).toBeNull();

    window.localStorage.setItem("aime-carte-pending", "{ pas du json");
    expect(readPendingCarte()).toBeNull();

    window.localStorage.setItem("aime-carte-pending", JSON.stringify({ text: "  " }));
    expect(readPendingCarte()).toBeNull();
  });
});
