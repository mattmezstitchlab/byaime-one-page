import { randomUUID } from "node:crypto";

/**
 * Identifiant de requête : celui que le client transmet (`x-request-id`)
 * quand il est exploitable, sinon un identifiant généré ici.
 *
 * Pure : la génération est injectable pour les tests. Un en-tête absent,
 * vide, multiple ou hors format ne laisse jamais la requête sans id — le
 * traçage `requestId` des réponses d'échec (voir `apiFailure.ts`) en dépend,
 * et pino-http exige une valeur (`ReqId = string | number | object`).
 */
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export function resolveRequestId(
  incoming: string | string[] | undefined,
  generate: () => string = randomUUID,
): string {
  const candidate = (Array.isArray(incoming) ? incoming[0] : incoming)?.trim();
  if (candidate && REQUEST_ID_PATTERN.test(candidate)) {
    return candidate;
  }
  return generate();
}
