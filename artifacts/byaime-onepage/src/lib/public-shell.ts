/*
 * Ce qui reste en ligne quand l'authentification n'est pas configurée.
 *
 * Constat (§2.8 du plan) : `App.tsx` rendait un écran « Connexion momentanément
 * indisponible » pour TOUTES les routes dès que `VITE_CLERK_PUBLISHABLE_KEY`
 * manquait — y compris l'accueil du site, qui n'a besoin ni de session, ni de
 * base, ni d'API. Une page publique ne doit pas pouvoir tomber à cause d'un
 * fournisseur d'authentification.
 *
 * Cette dérivation pure décide, pour un chemin donné, quelle vue servir en mode
 * dégradé. `App.tsx` ne fait que l'exécuter : la liste des pages réellement
 * publiques est écrite ici, une fois, et testée ici.
 */

export type DegradedView =
  /** Mentions légales (LCEN) : obligation de publication, donc toujours accessible. */
  | { kind: "mentions" }
  | { kind: "privacy" }
  | { kind: "terms" }
  /** Le livrable d'un couple : sa projection est publique côté serveur. */
  | { kind: "report"; projectId: string }
  /** Le portail d'un invité : aucun compte requis pour répondre à une RSVP. */
  | { kind: "rsvp"; token: string }
  /** L'accueil : la page unique du site public, rendue sans session. */
  | { kind: "landing" }
  /** Tout le reste exige une session : on le dit, sans rien demander. */
  | { kind: "unavailable"; requestedPath: string };

/**
 * Résout un chemin interne (déjà débarassé de son `BASE_PATH`) vers la vue à
 * servir sans authentification.
 */
export function resolveDegradedView(path: string): DegradedView {
  const clean = path.split("?")[0].split("#")[0] || "/";

  /* La racine sert l'accueil, la page unique du site public — directement, sans
     redirection : un `<Redirect>` ne rend rien côté serveur, donc la page la
     plus exposée du site serait blanche au pré-rendu. `/agence` (l'ancienne
     vitrine) et `/monde` (la Bande, retirée le 16/09/2026) servent le même
     accueil pour la même raison : en mode nominal ils redirigent, ici ils
     rendent. */
  if (clean === "/" || clean === "/agence" || clean === "/monde") return { kind: "landing" };
  if (clean === "/mentions-legales") return { kind: "mentions" };
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
  "/agence",
  "/monde",
  "/mentions-legales",
  "/confidentialite",
  "/conditions",
  "/bilan/:projectId",
  "/rsvp/:token",
];
