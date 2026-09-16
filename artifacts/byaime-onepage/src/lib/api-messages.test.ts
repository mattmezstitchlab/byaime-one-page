import { describe, expect, it } from "vitest";

import { describeApiFailure, failureMessage, parseJsonBody } from "./api-messages";

/*
 * `/ma-carte` a affiché « Unexpected token '<', "<!DOCTYPE "... is not valid
 * JSON » à la place du formulaire : la réponse HTML d'un service absent était
 * recopiée telle quelle. Ces contrôles verrouillent les deux règles de
 * remplacement — un message français actionable pour chaque mode d'échec, et un
 * corps non JSON qui ne lève jamais d'exception technique.
 */

describe("describeApiFailure — chaque échec est dit en français", () => {
  it("nomme une réponse HTML au lieu des données", () => {
    const message = describeApiFailure({ kind: "unexpected-body", status: 200 });
    expect(message).toContain("répondu une page au lieu de vos données");
    expect(message).toContain("Votre saisie reste sur cette page");
    // Le texte brut du parseur ne doit plus jamais atteindre l'écran.
    expect(message).not.toContain("Unexpected token");
    expect(message).not.toContain("JSON");
  });

  it("nomme un réseau injoignable", () => {
    const message = describeApiFailure({ kind: "network" });
    expect(message).toContain("injoignable");
    expect(message).toContain("Vérifiez votre connexion");
  });

  it("laisse le serveur expliquer ses propres refus", () => {
    expect(
      describeApiFailure({ kind: "status", status: 422, message: "Ce mariage est clôturé." }),
    ).toBe("Ce mariage est clôturé.");
    // Un message vide ou blanc n'est pas une explication.
    expect(
      describeApiFailure({ kind: "status", status: 422, message: "   " }),
    ).toContain("erreur 422");
  });

  it("dit quoi faire quand la session n'est pas reconnue", () => {
    for (const status of [401, 403]) {
      expect(describeApiFailure({ kind: "status", status })).toContain("Reconnectez-vous");
    }
  });

  it("distingue un service absent d'un serveur en faute", () => {
    expect(describeApiFailure({ kind: "status", status: 404 })).toContain("pas installé sur ce déploiement");
    expect(describeApiFailure({ kind: "status", status: 500 })).toContain("erreur 500");
    expect(describeApiFailure({ kind: "status", status: 503 })).toContain("Réessayez dans un instant");
    expect(describeApiFailure({ kind: "status", status: 409 })).toContain("Rechargez-la");
  });

  it("ne recopie jamais un statut sans explication", () => {
    for (const status of [400, 404, 409, 418, 500, 502]) {
      const message = describeApiFailure({ kind: "status", status });
      expect(message.length, `statut ${status}`).toBeGreaterThan(20);
      expect(message, `statut ${status}`).toMatch(/[.!?]$/);
    }
  });
});

describe("parseJsonBody — lire un corps sans lever", () => {
  it("lit les réponses normales", () => {
    expect(parseJsonBody('{"data":{"firstName":"Jean"}}')).toEqual({
      ok: true,
      value: { data: { firstName: "Jean" } },
    });
    expect(parseJsonBody("[]")).toEqual({ ok: true, value: [] });
    // « Pas de carte » est une réponse normale du service.
    expect(parseJsonBody("null")).toEqual({ ok: true, value: null });
  });

  it("traite un corps vide comme une absence de donnée", () => {
    expect(parseJsonBody("")).toEqual({ ok: true, value: null });
    expect(parseJsonBody("   ")).toEqual({ ok: true, value: null });
  });

  it("signale une page HTML au lieu de lever une SyntaxError", () => {
    expect(parseJsonBody("<!DOCTYPE html><html><body>index</body></html>")).toEqual({ ok: false });
    expect(parseJsonBody("<html>502 Bad Gateway</html>")).toEqual({ ok: false });
  });
});

describe("failureMessage — un message lisible, quoi qu'il arrive", () => {
  it("garde le message d'une Error déjà traduite", () => {
    expect(failureMessage(new Error("Service injoignable"), "Repli")).toBe("Service injoignable");
  });

  it("remplace tout le reste par le repli", () => {
    expect(failureMessage(new Error(""), "Repli")).toBe("Repli");
    expect(failureMessage(undefined, "Repli")).toBe("Repli");
    expect(failureMessage({ status: 500 }, "Repli")).toBe("Repli");
    expect(failureMessage("   ", "Repli")).toBe("Repli");
    expect(failureMessage("texte brut", "Repli")).toBe("texte brut");
  });
});
