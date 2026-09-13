/*
 * Ré-export : la dérivation du rapport vit dans le domaine partagé
 * (`@workspace/aime-domain`), servie à la fois par l'espace privé et par
 * l'API publique (`/public/reports/:id`). Ce fichier garde l'import local
 * `@/lib/rapport` stable dans l'app.
 */
export { buildRapport } from "@workspace/aime-domain";
export type {
  Rapport,
  RapportBudget,
  RapportDocument,
  RapportInvites,
  RapportMoment,
  RapportProvider,
  RapportSource,
  RapportTaches,
} from "@workspace/aime-domain";
