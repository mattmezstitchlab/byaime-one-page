/*
 * Ce qui reste en ligne quand l'authentification n'est pas configurée.
 *
 * Constat (§2.8 du plan) : `App.tsx` rendait un écran « Connexion momentanément
 * indisponible » pour TOUTES les routes dès que `VITE_CLERK_PUBLISHABLE_KEY`
 * manquait — y compris `/agence`, la vitrine commerciale, qui n'a besoin ni de
 * session, ni de base, ni d'API. Une page publique ne doit pas pouvoir tomber à
 * cause d'un fournisseur d'authentification.
 *
 * Cette dérivation pure décide, pour un chemin donné, quelle vue servir en mode
 * dégradé. `App.tsx` ne fait que l'exécuter : la liste des pages réellement
 * publiques est écrite ici, une fois, et testée ici.
 */

export type DegradedView =
  /** La vitrine de l'agence : la page qui ne dépend de rien. */
  | { kind: "agency" }
  /** Mentions légales (LCEN) : obligation de publication, donc toujours accessible. */
  | { kind: "mentions" }
  | { kind: "privacy" }
  | { kind: "terms" }
  /** Le livrable d'un couple : sa projection est publique côté serveur. */
  | { kind: "report"; projectId: string }
  /** Le portail d'un invité : aucun compte requis pour répondre à une RSVP. */
  | { kind: "rsvp"; token: string }
  /** La Bande (`/monde`) : prototype public, calculé dans le navigateur. */
  | { kind: "bande" }
  /** Tout le reste exige une session : on le dit, sans rien demander. */
  | { kind: "unavailable"; requestedPath: string };

/** Chemin de la vitrine. Devient `/` au lot 1 bis (D1 : l'agence est la racine). */
export const AGENCY_LANDING_PATH = "/agence";

/**
 * Résout un chemin interne (déjà débarassé de son `BASE_PATH`) vers la vue à
 * servir sans authentification.
 */
export function resolveDegradedView(path: string): DegradedView {
  const clean = path.split("?")[0].split("#")[0] || "/";

  /* La racine sert la vitrine directement, sans redirection : un `<Redirect>`
     ne rend rien côté serveur, donc la page la plus exposée du site serait
     blanche au pré-rendu. C'est aussi la cible du lot 1 bis (D1 : `/` devient
     la vitrine) — le mode dégradé l'anticipe au lieu de la contredire. */
  if (clean === "/" || clean === AGENCY_LANDING_PATH) return { kind: "agency" };
  if (clean === "/mentions-legales") return { kind: "mentions" };
  /* La Bande ne monte ni ClerkProvider, ni store, ni appel réseau : elle est
     publique au même titre que la vitrine. */
  if (clean === "/monde") return { kind: "bande" };
  if (clean === "/confidentialite") return { kind: "privacy" };
  if (clean === "/conditions") return { kind: "terms" };

  const report = clean.match(/^\/bilan\/([^/]+)\/?$/);
  if (report) return { kind: "report", projectId: report[1] };

  /* Le portail RSVP ne consomme aucune API Clerk (`RsvpPage`, App.tsx:243) :
     un invité qui répond la veille du Jour J ne doit pas dépendre de la
     configuration d'authentification du déploiement. */
  const rsvp = clean.match(/^\/rsvp\/([^/]+)\/?$/);
  if (rsvp) return { kind: "rsvp", token: rsvp[1] };

  /* Restent indisponibles, volontairement :
     - `/invite/:token` : accepter une invitation crée un compte (`useAuth`) ;
     - `/profil/:projectId` : le mini-site invité est rendu par le même
       composant que l'aperçu privé, qui consomme `useUser`, `useClerk` et
       `useProject` (`PublicProfile.tsx:6,10`). Le découpler de Clerk est une
       tâche du lot 1 bis — jusqu'ici, un invité ne peut pas ouvrir le mini-site
       d'un couple quand la clé manque. */
  return { kind: "unavailable", requestedPath: clean };
}

/** Les chemins servis sans authentification, pour les contrôles de déploiement. */
export const DEGRADED_PUBLIC_PATHS: readonly string[] = [
  "/",
  AGENCY_LANDING_PATH,
  "/mentions-legales",
  "/confidentialite",
  "/conditions",
  "/bilan/:projectId",
  "/rsvp/:token",
  "/monde",
];
