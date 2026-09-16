/*
 * Les mots d'échec d'un appel au service de la Carte Universelle.
 *
 * Constat du 16/09/2026 : `/ma-carte` affichait
 * « Unexpected token '<', "<!DOCTYPE "... is not valid JSON » et remplaçait tout
 * le formulaire par ce message. Cause : `fetch("/api/me/card")` recevait une page
 * HTML — serveur de développement lancé sans API, passerelle qui répond son
 * propre écran d'erreur, déploiement dont la fonction serveur est absente — et
 * `response.json()` levait une `SyntaxError` brute, recopiée telle quelle.
 *
 * Deux règles, vérifiées par `api-messages.test.ts` :
 *  1. **jamais de texte technique** : la personne voit ce qui se passe et ce
 *     qu'elle peut faire, en français, quel que soit le mode d'échec ;
 *  2. **jamais de page morte** : un service injoignable est affiché à côté du
 *     formulaire, pas à sa place — la saisie reste possible et le brouillon
 *     local est retrouvé (`UniversalCardForm`).
 *
 * Ce fichier est une dérivation pure (aucun `fetch`, aucun React) pour que les
 * messages soient contrôlés sans réseau.
 */

export type ApiFailure =
  /** `fetch` a levé : hors ligne, nom inconnu, requête bloquée. */
  | { kind: "network" }
  /** Réponse HTTP non réussie. `message` vient du serveur quand il en donne un. */
  | { kind: "status"; status: number; message?: string }
  /** Réponse réussie, mais dont le corps n'est pas du JSON (page HTML, vide illisible). */
  | { kind: "unexpected-body"; status: number };

/** Le message du serveur prime toujours : c'est lui qui connaît la règle métier. */
function serverMessage(message: string | undefined): string | null {
  const trimmed = message?.trim();
  return trimmed ? trimmed : null;
}

export function describeApiFailure(failure: ApiFailure): string {
  switch (failure.kind) {
    case "network":
      return "Le service AIME est injoignable depuis cet appareil. Vérifiez votre connexion puis réessayez : votre saisie reste sur cette page.";
    case "unexpected-body":
      return "Le service de la carte a répondu une page au lieu de vos données : l’API n’est pas joignable à cette adresse. Votre saisie reste sur cette page.";
    case "status": {
      const fromServer = serverMessage(failure.message);
      if (fromServer) return fromServer;
      const { status } = failure;
      if (status === 401 || status === 403)
        return "Votre session n’est pas reconnue. Reconnectez-vous, puis rouvrez Ma carte.";
      if (status === 404)
        return "Le service de la carte n’est pas installé sur ce déploiement. Votre saisie reste sur cette page.";
      if (status === 409)
        return "Votre carte a changé ailleurs. Rechargez-la avant de la modifier.";
      if (status >= 500)
        return `Le serveur n’a pas pu répondre (erreur ${status}). Réessayez dans un instant : votre saisie reste sur cette page.`;
      return `Le service a refusé la demande (erreur ${status}). Votre saisie reste sur cette page.`;
    }
  }
}

/**
 * Lit un corps de réponse sans jamais lever : une réponse non JSON est un mode
 * d'échec à nommer, pas une exception technique à recopier.
 *
 * Un corps vide vaut `null` (réponse 204, ou 200 sans contenu) : c'est déjà le
 * comportement du store de projet, et « pas de carte » est une réponse normale.
 */
export function parseJsonBody(
  raw: string,
): { ok: true; value: unknown } | { ok: false } {
  if (!raw.trim()) return { ok: true, value: null };
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}

/** Le message lisible d'une valeur levée, sans recopier un texte technique. */
export function failureMessage(value: unknown, fallback: string): string {
  if (value instanceof Error && value.message.trim()) return value.message;
  if (typeof value === "string" && value.trim()) return value;
  return fallback;
}
