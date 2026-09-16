import { describeApiFailure, parseJsonBody } from "./api-messages";

/*
 * L'appel au service AIME, partagé par la Carte Universelle et ses écrans
 * associés (rattachement d'une invitation, profil métier).
 *
 * Pourquoi un seul endroit : `UniversalCardForm`, `RsvpClaimPanel` et
 * `ProfessionalProfileEditor` recopiaient le même `await response.json()`. Quand
 * le service répond autre chose que du JSON — serveur de développement lancé
 * sans API, passerelle qui renvoie sa page d'erreur, fonction serveur absente —
 * cette ligne lève une `SyntaxError` dont le texte brut (« Unexpected token '<'…
 * ») était recopié à l'écran. `lib/api-messages.ts` nomme chaque mode d'échec en
 * français ; ce fichier garantit qu'aucun appel ne passe à côté.
 */

/**
 * `path` est relatif au service : `apiCall("/me/card")` appelle `/api/me/card`.
 * Lève toujours une `Error` dont le `message` est affichable tel quel.
 */
export async function apiCall<T = any>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path.startsWith("/api") ? path : `/api${path}`, init);
  } catch {
    throw new Error(describeApiFailure({ kind: "network" }));
  }
  const parsed = parseJsonBody(await response.text());
  if (!response.ok) {
    const reported =
      parsed.ok && typeof parsed.value === "object" && parsed.value !== null
        ? (parsed.value as { error?: unknown }).error
        : undefined;
    throw new Error(
      describeApiFailure({
        kind: "status",
        status: response.status,
        message: typeof reported === "string" ? reported : undefined,
      }),
    );
  }
  if (!parsed.ok)
    throw new Error(
      describeApiFailure({ kind: "unexpected-body", status: response.status }),
    );
  return parsed.value as T;
}

/** Écriture JSON : le verbe et l'en-tête ne sont plus recopiés à chaque appel. */
export function jsonPut(body: unknown): RequestInit {
  return {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
