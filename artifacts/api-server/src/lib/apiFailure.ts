/*
 * Ce qu'une erreur non rattrapée renvoie au client : un statut et un corps JSON.
 *
 * Constat du 16/09/2026, vu sur le déploiement Vercel : `/ma-carte` affichait
 * « Unexpected token '<', "<!DOCTYPE "... is not valid JSON ». La chaîne réelle
 * était : une route `/api/*` lève (par exemple une table absente parce que la
 * migration n'a pas été appliquée) → Express 5 transmet l'erreur → **aucun
 * gestionnaire d'erreur n'était monté** → le gestionnaire par défaut d'Express
 * répond une page HTML `<!DOCTYPE html>… Internal Server Error` → le navigateur
 * échoue à la lire comme du JSON et recopie son texte brut à l'écran.
 *
 * Deux règles, verrouillées par `apiFailure.test.ts` :
 *  1. **toujours du JSON** : une API qui répond HTML casse tous ses clients, et
 *     le message d'échec devient un texte technique illisible ;
 *  2. **rien de technique ne sort** : le détail (SQL, nom de table, chaîne de
 *     connexion, chemin, pile) est journalisé côté serveur, jamais renvoyé. Le
 *     client reçoit un état et une phrase française qui dit quoi faire.
 *
 * Dérivation pure : aucun Express, aucun journal, donc testable sans serveur.
 */

export type ApiFailureResponse = {
  status: number;
  body: { error: string };
};

/** Les erreurs de bibliothèque qu'Express transmet portent `status` ou `statusCode`. */
function statusOf(error: unknown): number {
  if (error && typeof error === "object") {
    for (const key of ["status", "statusCode"] as const) {
      const value = (error as Record<string, unknown>)[key];
      if (typeof value === "number" && Number.isInteger(value) && value >= 400 && value <= 599)
        return value;
    }
  }
  return 500;
}

/**
 * Le message renvoyé. Celui du serveur métier (déjà écrit pour la personne) ne
 * passe jamais par ici : les routes répondent elles-mêmes en JSON. Ce qui arrive
 * ici vient d'une bibliothèque ou d'une panne — donc un libellé par état, sans
 * recopier `error.message`.
 */
function messageFor(status: number, error: unknown): string {
  const type =
    error && typeof error === "object"
      ? (error as Record<string, unknown>).type
      : undefined;

  /* Libellés écrits pour la personne, pas pour un ingénieur : ni terme
     technique, ni numéro d’état, ni cause interne. Le détail est dans les
     journaux. */
  if (status === 400)
    return type === "entity.parse.failed"
      ? "La demande n’a pas pu être lue. Rien n’a été enregistré : réessayez."
      : "La demande n’a pas pu être lue. Rien n’a été enregistré.";
  if (status === 401) return "Votre session s’est fermée. Reconnectez-vous puis réessayez.";
  if (status === 403) return "Cette demande ne vous est pas autorisée.";
  if (status === 404) return "Ressource introuvable.";
  if (status === 409) return "Cette donnée a changé ailleurs. Rechargez-la avant de la modifier.";
  if (status === 413) return "Ce que vous avez envoyé est trop volumineux. Rien n’a été enregistré.";
  if (status === 422) return "La demande ne respecte pas les règles. Rien n’a été enregistré.";
  if (status === 429) return "Trop de demandes à la fois : réessayez dans un instant.";
  if (status >= 400 && status < 500) return "Cette demande a été refusée. Rien n’a été enregistré.";

  /* 5xx : la panne est de notre côté. On le dit simplement, sans exposer ni la
     cause ni le détail technique. On n’écrit pas « rien n’a été enregistré » :
     un échec de lecture n’avait rien à enregistrer. */
  return "Le service n’a pas pu répondre. Réessayez dans un instant.";
}

export function apiFailureResponse(error: unknown): ApiFailureResponse {
  const status = statusOf(error);
  return { status, body: { error: messageFor(status, error) } };
}

/** Ce que le journal garde : la cause réelle, elle, ne sort jamais du serveur. */
export function apiFailureLogFields(error: unknown): Record<string, unknown> {
  return {
    err: error,
    ...(error && typeof error === "object"
      ? {
          errorName: (error as { name?: unknown }).name,
          errorCode: (error as { code?: unknown }).code,
        }
      : { errorValue: String(error) }),
  };
}
