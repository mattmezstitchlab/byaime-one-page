/*
 * Gestionnaire d'erreur JSON, monté en dernier dans `app.ts`.
 *
 * Sans lui, Express répond une page HTML dès qu'une route lève — et le client,
 * qui lit `response.json()`, affiche « Unexpected token '<'… » (voir
 * `src/lib/apiFailure.ts` et `docs/vercel-deployment.md`). Avec lui, toute
 * erreur non rattrapée sort en `{ "error": "…" }`, avec le bon statut, et la
 * cause réelle part dans les journaux au lieu d'atteindre l'écran.
 */

import type { ErrorRequestHandler } from "express";
import { apiFailureLogFields, apiFailureResponse } from "../lib/apiFailure";
import { logger } from "../lib/logger";

export const jsonErrorHandler: ErrorRequestHandler = (error, req, res, next) => {
  const { status, body } = apiFailureResponse(error);

  logger.error(
    {
      ...apiFailureLogFields(error),
      status,
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
    },
    "Erreur non rattrapée : réponse JSON d'échec renvoyée",
  );

  /* Une réponse déjà entamée ne peut pas être remplacée : on rend la main à
     Express, qui fermera la connexion. */
  if (res.headersSent) return next(error);

  res.status(status).json(body);
};
