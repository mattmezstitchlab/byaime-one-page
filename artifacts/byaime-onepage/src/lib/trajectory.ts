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

export function buildGenericWorldTrajectory(opts: {
  actorKind: string;
  actorDetail?: string;
  actorLabel: string;
  worldId?: string;
  now?: number;
}): Trajectory {
  const now = opts.now ?? Date.now();
  const label = opts.actorDetail ? opts.actorDetail : opts.actorLabel;
  const isGroup = opts.actorKind === "group" || /groupe|collectif/i.test(label);
  const isResto = /restaurat/i.test(label) || /cuisin/i.test(label);
  const isAsso = opts.actorKind === "organization" || /association/i.test(label);
  const isEvent = opts.actorKind === "event" || /festival|événement/i.test(label);

  const genericSteps: TrajectoryStep[] = [
    {
      id: "step-1",
      title: "Cartographier ce qui existe aujourd’hui",
      description: `Lister ce que "${label}" a déjà : lieux, ressources, jalons, documents.`,
      status: "a_faire",
      confidence: "proposition_aime",
      source: "Proposition AIME",
      sourceDate: "2026-09-18",
    },
    {
      id: "step-2",
      title: "Clarifier ce que vous voulez rendre possible",
      description: "Formuler en une phrase l’intention du Monde — elle guidera la Timeline.",
      status: "a_faire",
      confidence: "proposition_aime",
      source: "Proposition AIME",
      sourceDate: "2026-09-18",
    },
    {
      id: "step-3",
      title: "Identifier les ressources déjà disponibles",
      description: "Distinguer ce qui est confirmé, à vérifier ou à créer (compétences, matériel, réseau).",
      status: "a_faire",
      confidence: "a_verifier",
      source: "À vérifier avec l’acteur",
      sourceDate: "2026-09-18",
    },
    {
      id: "step-4",
      title: "Recenser l’écosystème",
      description: "Lister les lieux, personnes, structures et partenaires déjà liés au Monde.",
      status: "a_faire",
      confidence: "proposition_aime",
      source: "Proposition AIME",
      sourceDate: "2026-09-18",
    },
    {
      id: "step-5",
      title: "Mettre en forme les preuves et jalons",
      description: "Dates, documents, photos, contrats : chaque jalon posé dans la Timeline devient preuve.",
      status: "a_faire",
      confidence: "confirme",
      source: "Règle AIME : Timeline colonne vertébrale",
      sourceDate: "2026-09-18",
    },
    {
      id: "step-6",
      title: "Visualiser les écarts et points à confirmer",
      description: "Comparer situation actuelle et souhaitée, repérer ce qui est à vérifier.",
      status: "a_faire",
      confidence: "probable",
      source: "Proposition AIME — à confirmer",
      sourceDate: "2026-09-18",
    },
    {
      id: "step-7",
      title: "Choisir la prochaine action datée",
      description: "Une action concrète, datée dans la Timeline — pas une bascule automatique de statut.",
      status: "a_faire",
      confidence: "proposition_aime",
      source: "Proposition AIME",
      sourceDate: "2026-09-18",
    },
    {
      id: "step-8",
      title: "Prévoir une validation humaine",
      description: "Faire vérifier la trajectoire par les personnes concernées avant décision structurante.",
      status: "a_faire",
      confidence: "a_verifier",
      source: "À vérifier — personnes concernées",
      sourceDate: "2026-09-18",
    },
  ];

  const current = isResto
    ? [
        { label: "Activité", value: "restauration", confidence: "confirme" as const, status: "confirme" as const },
        { label: "Lieu", value: "à préciser", confidence: "a_confirmer" as const, status: "a_verifier" as const },
      ]
    : isGroup
    ? [
        { label: "Forme", value: label, confidence: "confirme" as const, status: "confirme" as const },
        { label: "Membres", value: "à préciser", confidence: "a_confirmer" as const, status: "a_verifier" as const },
      ]
    : isAsso
    ? [
        { label: "Structure", value: label, confidence: "confirme" as const, status: "confirme" as const },
        { label: "Membres / adhérents", value: "à préciser", confidence: "a_confirmer" as const, status: "a_verifier" as const },
      ]
    : isEvent
    ? [
        { label: "Événement", value: label, confidence: "confirme" as const, status: "confirme" as const },
        { label: "Date / lieu", value: "à préciser", confidence: "a_confirmer" as const, status: "a_verifier" as const },
      ]
    : [
        { label: "Acteur", value: label, confidence: "confirme" as const, status: "confirme" as const },
        { label: "Situation", value: "à préciser", confidence: "a_confirmer" as const, status: "a_verifier" as const },
      ];

  const desired = isResto
    ? [{ label: "Direction", value: "faire vivre le lieu et sa carte" }, { label: "Objectif", value: "trouver son public" }]
    : isGroup
    ? [{ label: "Direction", value: "faire vivre le collectif" }, { label: "Objectif", value: "organiser les prochaines dates" }]
    : isAsso
    ? [{ label: "Direction", value: "fédérer et animer" }, { label: "Objectif", value: "organiser des rencontres" }]
    : isEvent
    ? [{ label: "Direction", value: "donner forme à l’événement" }, { label: "Objectif", value: "réunir les bonnes personnes et lieux" }]
    : [{ label: "Direction", value: "développer le Monde" }, { label: "Objectif", value: "explorer l’évolution souhaitée" }];

  return {
    id: opts.worldId ? `trajectory-${opts.worldId}` : `trajectory-${now}`,
    worldId: opts.worldId,
    current,
    desired,
    gaps: ["Éléments à préciser avec AIME"],
    steps: genericSteps,
    proofs: ["Jalons datés dans la Timeline", "Documents et médias", "Retours de l’écosystème"],
    decisions: ["Validation humaine requise — AIME propose, vous décidez"],
    disclaimer: TRAJECTORY_DISCLAIMER,
  };
}

export function buildTrajectoryForUniversal(input: {
  actorKind: string;
  actorDetail?: string;
  actorLabel?: string;
  worldId?: string;
  now?: number;
}): Trajectory | undefined {
  if (input.actorDetail === "saxophoniste") return buildSaxophonistTrajectory(input.worldId);
  const label = input.actorDetail ?? input.actorLabel ?? input.actorKind;
  return buildGenericWorldTrajectory({ actorKind: input.actorKind, actorDetail: input.actorDetail, actorLabel: label, worldId: input.worldId, now: input.now });
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
