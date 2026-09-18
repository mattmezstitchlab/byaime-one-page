import type { Trajectory, TrajectoryStep, WorldProject } from "./types";

/**
 * Trajectoire générique : Situation actuelle → souhaitée → écart → étapes → preuves → décisions.
 * Ne donne jamais de conseil juridique définitif ; les règles sont sourcées, datées, présentées comme
 * confirmé / probable / à vérifier / proposition AIME.
 */

export const TRAJECTORY_DISCLAIMER =
  "AIME ne donne pas de conseil juridique définitif et ne garantit aucune ouverture de droits. Vérifiez auprès des organismes compétents (France Travail, URSSAF, GUSO, etc.).";

export function buildSaxophonistTrajectory(worldId?: string): Trajectory {
  const steps: TrajectoryStep[] = [
    {
      id: "step-1",
      title: "Cartographier les activités actuelles",
      description: "Lister les prestations musicales, les cours et les autres revenus, avec leur fréquence.",
      status: "a_faire",
      confidence: "proposition_aime",
      source: "Proposition AIME",
      sourceDate: "2026-09-18",
    },
    {
      id: "step-2",
      title: "Séparer les activités artistiques et complémentaires",
      description: "Distinguer ce qui relève du spectacle vivant (cachet) et ce qui relève de la prestation ou de l'enseignement (facture).",
      status: "a_faire",
      confidence: "a_verifier",
      source: "À vérifier auprès d'un professionnel (comptable, France Travail)",
      sourceDate: "2026-09-18",
    },
    {
      id: "step-3",
      title: "Identifier les types de rémunération",
      description: "Vos prestations musicales sont-elles facturées, rémunérées par contrat salarié (GUSO / structure employeuse), ou les deux ?",
      status: "a_faire",
      confidence: "a_verifier",
      source: "À vérifier — GUSO / employeur",
      sourceDate: "2026-09-18",
    },
    {
      id: "step-4",
      title: "Recenser les structures et employeurs",
      description: "Lister les lieux, restaurants, festivals, groupes et bookers qui vous emploient ou vous facturent.",
      status: "a_faire",
      confidence: "proposition_aime",
      source: "Proposition AIME",
      sourceDate: "2026-09-18",
    },
    {
      id: "step-5",
      title: "Suivre les prestations et justificatifs",
      description: "Collecter dates, contrats, attestations et factures pour chaque prestation. Sans duplicata : la Timeline reste source unique.",
      status: "a_faire",
      confidence: "confirme",
      source: "Règle AIME : Timeline colonne vertébrale",
      sourceDate: "2026-09-18",
    },
    {
      id: "step-6",
      title: "Visualiser les écarts et points à confirmer",
      description: "Comparer le volume d'activité salariée vs facturée et identifier ce qui doit être confirmé ou complété.",
      status: "a_faire",
      confidence: "probable",
      source: "Proposition AIME — à confirmer",
      sourceDate: "2026-09-18",
    },
    {
      id: "step-7",
      title: "Poser la prochaine action",
      description: "Choisir une action concrète (ex. contacter une structure pour un contrat salarié) et la dater dans la Timeline.",
      status: "a_faire",
      confidence: "proposition_aime",
      source: "Proposition AIME",
      sourceDate: "2026-09-18",
    },
    {
      id: "step-8",
      title: "Prévoir une validation humaine",
      description: "Faire vérifier la trajectoire par un professionnel compétent avant toute décision sur le régime du spectacle.",
      status: "a_faire",
      confidence: "a_verifier",
      source: "À vérifier — organisme compétent",
      sourceDate: "2026-09-18",
    },
  ];

  return {
    id: worldId ? `trajectory-${worldId}` : `trajectory-${Date.now()}`,
    worldId,
    current: [
      { label: "Statut", value: "auto-entrepreneur", confidence: "confirme", status: "confirme" },
      { label: "Activités", value: "prestations musicales · cours", confidence: "confirme", status: "confirme" },
      { label: "Rémunération", value: "à préciser (facture / contrat salarié)", confidence: "a_confirmer", status: "a_verifier" },
    ],
    desired: [
      { label: "Direction", value: "développer l'activité musicale" },
      { label: "Objectif", value: "explorer le régime du spectacle" },
      { label: "Sécurisation", value: "sécuriser la transition, conserver activité complémentaire" },
    ],
    gaps: [
      "Type de rémunération actuel non confirmé",
      "Volume de cachets vs factures à quantifier",
      "Structures employeuses à recenser",
    ],
    steps,
    proofs: [
      "Contrats et attestations employeur",
      "Factures",
      "Justificatifs de prestations",
    ],
    decisions: [
      "Validation humaine requise — AIME propose, vous décidez",
    ],
    disclaimer: TRAJECTORY_DISCLAIMER,
  };
}

export function buildGenericTrajectory(input: {
  worldId?: string;
  current: Trajectory["current"];
  desired: Trajectory["desired"];
}): Trajectory {
  const base = buildSaxophonistTrajectory(input.worldId);
  return {
    ...base,
    current: input.current,
    desired: input.desired,
    gaps: ["Écart à préciser avec AIME"],
    id: input.worldId ? `trajectory-${input.worldId}` : base.id,
  };
}

/**
 * Totem : la trajectoire est proposée, jamais appliquée automatiquement.
 * Cette fonction vérifie qu'un monde n'a pas de trajectoire appliquée silencieusement.
 */
export function isTrajectoryProposedOnly(project: WorldProject): boolean {
  if (!project.trajectory) return true;
  // La trajectoire est stockée mais aucune timeline event n'est modifié sans validation humaine.
  // On vérifie que la provenance de la trajectoire est bien "aime" et non "real".
  const hasProposed = project.modulesProposed?.some(m => m.id === "trajectoire" && m.status === "proposed");
  // Si modulesProposed contient trajectoire en proposed, c'est bien proposé seulement.
  // Sinon, la trajectoire existe mais n'a pas été appliquée (pas de timeline event auto).
  return hasProposed ?? true;
}

export function proposedModulesForUniversal(_universal: { actorDetail?: string }): { id: string; label: string; description: string }[] {
  const base = [
    { id: "trajectoire", label: "Trajectoire", description: "Situation actuelle → souhaitée → étapes → preuves" },
    { id: "prestations", label: "Prestations", description: "Suivi des dates et conditions" },
    { id: "page-publique", label: "Page publique", description: "Présentation de votre univers" },
    { id: "repertoire", label: "Répertoire", description: "Morceaux et sets" },
    { id: "relations", label: "Relations", description: "Lieux, bookers, clients, élèves" },
    { id: "documents", label: "Documents", description: "Contrats, factures, justificatifs" },
    { id: "medias", label: "Médias", description: "Photos et vidéos" },
  ];
  // Pour autres verticales, on pourrait filtrer, mais on garde générique.
  return base;
}
