import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { apiFailureLogFields, apiFailureResponse } from "./apiFailure";
import { jsonErrorHandler } from "../middlewares/jsonErrorHandler";

/* Le journal est remplacé : on vérifie ce qui y part sans ouvrir pino-pretty. */
const loggerError = vi.fn();
vi.mock("./logger", () => ({ logger: { error: (...args: unknown[]) => loggerError(...args) } }));

/** L'erreur type d'une table absente : migration non appliquée côté Vercel. */
function missingRelation(): unknown {
  const error = new Error('relation "aime_universal_cards" does not exist') as Error & { code?: string };
  error.name = "error";
  error.code = "42P01";
  return error;
}

/** L'erreur de body-parser : c'est elle qui a produit « Unexpected token '<'… » à l'écran. */
function malformedBody(): unknown {
  return Object.assign(new SyntaxError('Unexpected token \'<\', "<!DOCTYPE "... is not valid JSON'), {
    status: 400,
    type: "entity.parse.failed",
  });
}

describe("réponse d'échec d'une erreur non rattrapée", () => {
  it("répond un corps JSON en français, jamais la page HTML par défaut d'Express", () => {
    const { status, body } = apiFailureResponse(missingRelation());
    expect(status).toBe(500);
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
    /* La page HTML d'Express commence par « <!DOCTYPE html> » : c'est exactement
       ce que le navigateur recopiait à l'écran. */
    for (const interdit of ["<", "DOCTYPE", "html", "Internal Server Error", "Error"])
      expect(body.error).not.toContain(interdit);
    expect(() => JSON.stringify(body)).not.toThrow();
  });

  it("ne renvoie ni la table, ni le SQL, ni la chaîne de connexion — mais les journalise", () => {
    const { body } = apiFailureResponse(missingRelation());
    for (const fuite of ["aime_universal_cards", "relation", "does not exist", "42P01", "SQL", "select"])
      expect(body.error.toLowerCase()).not.toContain(fuite.toLowerCase());

    const connexion = Object.assign(
      new Error("connect ECONNREFUSED postgres://aime:super-secret@db.internal:5432/aime"),
      { code: "ECONNREFUSED" },
    );
    const reponse = apiFailureResponse(connexion);
    expect(reponse.status).toBe(500);
    expect(reponse.body.error).not.toContain("super-secret");
    expect(reponse.body.error).not.toContain("ECONNREFUSED");
    expect(reponse.body.error).not.toContain("db.internal");

    /* La cause réelle reste exploitable côté serveur : c'est là qu'on la lit. */
    const champs = apiFailureLogFields(connexion);
    expect(champs.err).toBe(connexion);
    expect(champs.errorCode).toBe("ECONNREFUSED");
    expect(apiFailureLogFields("panne sèche")).toMatchObject({ errorValue: "panne sèche" });
  });

  it("traite un corps illisible comme une erreur 400 lisible, sans recopier le parseur", () => {
    const { status, body } = apiFailureResponse(malformedBody());
    expect(status).toBe(400);
    expect(body.error).toContain("n’a pas pu être lue");
    expect(body.error).toContain("Rien n’a été enregistré");
    expect(body.error).not.toContain("Unexpected token");
    expect(body.error).not.toContain("<");
    /* Le terme technique reste dans le journal, jamais dans la réponse. */
    expect(body.error.toLowerCase()).not.toContain("json");
  });

  it("donne un libellé par état pour les erreurs de bibliothèque", () => {
    expect(apiFailureResponse(Object.assign(new Error("x"), { status: 401 })).body.error).toContain("Reconnectez-vous");
    expect(apiFailureResponse(Object.assign(new Error("x"), { status: 403 })).body.error).toContain("pas autorisée");
    expect(apiFailureResponse(Object.assign(new Error("x"), { status: 404 })).body.error).toContain("introuvable");
    expect(apiFailureResponse(Object.assign(new Error("x"), { status: 409 })).body.error).toContain("changé ailleurs");
    expect(apiFailureResponse(Object.assign(new Error("x"), { statusCode: 413 })).body.error).toContain("trop volumineux");
    expect(apiFailureResponse(Object.assign(new Error("x"), { status: 422 })).body.error).toContain("règles");
    expect(apiFailureResponse(Object.assign(new Error("x"), { status: 429 })).body.error).toContain("Trop de demandes");
    expect(apiFailureResponse(Object.assign(new Error("x"), { status: 418 })).status).toBe(418);
    expect(apiFailureResponse(Object.assign(new Error("x"), { status: 503 })).status).toBe(503);
  });

  it("retombe sur 500 pour tout ce qui n'est pas une erreur HTTP reconnaissable", () => {
    for (const valeur of [undefined, null, "panne", 42, {}, new Error("boom"), Object.assign(new Error("x"), { status: 200 }), Object.assign(new Error("x"), { status: "500" }), Object.assign(new Error("x"), { status: 999 })])
      expect(apiFailureResponse(valeur).status).toBe(500);
    expect(apiFailureResponse(undefined).body.error).toContain("n’a pas pu répondre");
  });
});

describe("gestionnaire d'erreur de l'application", () => {
  function res(headersSent = false) {
    const response = {
      headersSent,
      status: vi.fn(() => response),
      json: vi.fn(() => response),
      setHeader: vi.fn(() => {}),
    };
    return response as unknown as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn>; setHeader: ReturnType<typeof vi.fn> };
  }

  it("écrit du JSON avec le bon statut et journalise la cause", () => {
    const response = res();
    const next = vi.fn() as unknown as NextFunction;
    const req = { id: "req-1", method: "GET", originalUrl: "/api/me/card", headers: {} } as unknown as Request;

    jsonErrorHandler(missingRelation(), req, response, next);

    expect(response.status).toHaveBeenCalledWith(500);
    const expectedBody = apiFailureResponse(missingRelation()).body;
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ ...expectedBody, requestId: "req-1" }));
    expect(next).not.toHaveBeenCalled();
    expect(loggerError).toHaveBeenCalledOnce();
    const [champs, message] = loggerError.mock.calls[0] as [Record<string, unknown>, string];
    expect(champs).toMatchObject({ status: 500, requestId: "req-1", method: "GET", path: "/api/me/card" });
    expect(message).toContain("Erreur non rattrapée");
  });

  it("rend la main à Express quand la réponse a déjà commencé", () => {
    const response = res(true);
    const next = vi.fn() as unknown as NextFunction;
    const erreur = missingRelation();

    jsonErrorHandler(erreur, { id: "req-2", method: "PUT", originalUrl: "/api/me/card" } as unknown as Request, response, next);

    expect(response.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(erreur);
  });

  it("est monté en dernier dans app.ts, après le routeur /api", () => {
    const source = readFileSync(fileURLToPath(new URL("../app.ts", import.meta.url)), "utf8");
    const routeur = source.indexOf('app.use("/api", router)');
    const gestionnaire = source.indexOf("app.use(jsonErrorHandler)");
    expect(routeur).toBeGreaterThan(-1);
    expect(gestionnaire).toBeGreaterThan(-1);
    expect(gestionnaire).toBeGreaterThan(routeur);
  });
});
