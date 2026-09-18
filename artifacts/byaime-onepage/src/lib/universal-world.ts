import type { Confidence, UniversalActorKind, UniversalWorldProfile, WorldFact, WorldProject } from "./types";
import { fact } from "./types";
import { normalizeProject } from "./project-migration";
import { buildSaxophonistTrajectory, proposedModulesForUniversal } from "./trajectory";

/**
 * Doctrine produit : point zéro des vivants.
 * - Une seule question principale par étape, max quelques choix visibles
 * - Option Je ne sais pas encore / Passer
 * - Sauvegarde brouillon et reprise
 * - Carte personnelle séparée
 * - Données canoniques non dupliquées
 */

// ── A — Acteur / Ancrage ──────────────────────────────
export const ACTOR_CHOICES: Array<{ id: UniversalActorKind; label: string }> = [
  { id: "person", label: "une personne" },
  { id: "couple", label: "un couple" },
  { id: "independent", label: "une activité indépendante" },
  { id: "group", label: "un groupe ou collectif" },
  { id: "organization", label: "une organisation" },
  { id: "event", label: "un événement" },
  { id: "join", label: "je rejoins un Monde existant" },
];

export const ACTOR_DETAIL_CHOICES: Record<string, string[]> = {
  person: ["artiste / musicien", "autre activité", "je ne sais pas encore"],
  "person:artist": ["saxophoniste", "autre musicien", "autre artiste"],
  independent: ["artiste / musicien", "restaurateur", "autre indépendant"],
  "independent:artist": ["saxophoniste", "autre musicien"],
};

export function getActorLabel(kind: UniversalActorKind, detail?: string): string {
  const base = ACTOR_CHOICES.find(c => c.id === kind)?.label ?? kind;
  return detail ? `${base} · ${detail}` : base;
}

// ── I — Intention ─────────────────────────────────────
export const INTENTION_CHOICES_SAXO: string[] = [
  "trouver plus de prestations",
  "présenter son univers",
  "développer ses cours",
  "vivre davantage de la musique",
  "organiser ses prochaines dates",
  "explorer une transition professionnelle",
  "explorer le régime du spectacle",
  "sécuriser ses revenus",
  "je ne sais pas encore",
];

export const INTENTION_CHOICES_GENERIC: string[] = [
  "présenter mon univers",
  "trouver de nouvelles opportunités",
  "organiser mes prochaines dates",
  "explorer une évolution professionnelle",
  "sécuriser mon activité",
  "je ne sais pas encore",
];

export function intentionChoicesForActor(actorDetail?: string): string[] {
  if (actorDetail === "saxophoniste") return INTENTION_CHOICES_SAXO;
  return INTENTION_CHOICES_GENERIC;
}

// ── M — Monde (situation actuelle) ───────────────────
export const SITUATION_CHOICES_SAXO: string[] = [
  "je suis auto-entrepreneur",
  "j’ai déjà des prestations",
  "j’ai des clients",
  "j’ai des contrats",
  "je donne des cours",
  "j’ai un répertoire",
  "j’ai du matériel",
  "j’ai des photos ou vidéos",
  "j’ai des factures ou documents",
  "j’ai déjà des structures qui m’emploient",
  "je pars de zéro",
];

export const SITUATION_CHOICES_GENERIC: string[] = [
  "j’ai déjà une activité",
  "j’ai des clients / partenaires",
  "j’ai des documents",
  "je pars de zéro",
  "je ne sais pas encore",
];

export function situationChoicesForActor(actorDetail?: string): string[] {
  if (actorDetail === "saxophoniste") return SITUATION_CHOICES_SAXO;
  return SITUATION_CHOICES_GENERIC;
}

// ── E — Écosystème ────────────────────────────────────
export const ECOSYSTEM_CHOICES: string[] = [
  "lieux",
  "restaurants",
  "festivals",
  "groupes",
  "bookers",
  "clients",
  "élèves",
  "comptable",
  "France Travail",
  "autres artistes",
  "entourage",
  "je continue seul pour l’instant",
];

// ── Faits : transformation phrase libre → propositions ──
export function parseFreePhraseToFacts(phrase: string): WorldFact[] {
  const lower = phrase.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const facts: WorldFact[] = [];
  const now = Date.now();
  const add = (id: string, label: string, test: boolean | string) => {
    if (!test) return;
    facts.push({
      id,
      label,
      value: typeof test === "string" ? test : true,
      confidence: "deduit",
      status: "proposition_aime",
      source: "Phrase libre analysée par AIME",
      provenance: { source: "aime", createdAt: now },
    });
  };
  if (/saxophon/.test(lower)) add("fact-saxo", "Saxophoniste", true);
  if (/auto.entrepreneur|auto entrepreneur/.test(lower)) add("fact-auto", "Auto-entrepreneur", true);
  if (/mariage/.test(lower)) add("fact-mariage", "Joue dans des mariages", true);
  if (/cours|donne des cours|enseigne/.test(lower)) add("fact-cours", "Donne des cours", true);
  if (/prestation/.test(lower)) add("fact-presta", "Prestations musicales", true);
  if (/client/.test(lower)) add("fact-client", "A des clients", true);
  if (/contrat/.test(lower)) add("fact-contrat", "A des contrats", true);
  if (/repertoire/.test(lower)) add("fact-rep", "A un répertoire", true);
  if (/materiel/.test(lower)) add("fact-materiel", "A du matériel", true);
  if (/photo|video/.test(lower)) add("fact-media", "A des photos/vidéos", true);
  if (/facture|document/.test(lower)) add("fact-doc", "A des factures/documents", true);
  if (/structure.*emploie|employeur/.test(lower)) add("fact-structure", "Structures qui emploient", true);
  if (!facts.length && phrase.trim().length > 10) {
    add("fact-free", `Phrase : "${phrase.trim().slice(0, 60)}"`, phrase.trim());
  }
  return facts;
}

export function factsToSituationTags(facts: WorldFact[]): string[] {
  const map: Record<string, string> = {
    "fact-saxo": "saxophoniste",
    "fact-auto": "je suis auto-entrepreneur",
    "fact-mariage": "j’ai déjà des prestations",
    "fact-cours": "je donne des cours",
    "fact-presta": "j’ai déjà des prestations",
    "fact-client": "j’ai des clients",
    "fact-contrat": "j’ai des contrats",
    "fact-rep": "j’ai un répertoire",
    "fact-materiel": "j’ai du matériel",
    "fact-media": "j’ai des photos ou vidéos",
    "fact-doc": "j’ai des factures ou documents",
    "fact-structure": "j’ai déjà des structures qui m’emploient",
  };
  return facts.map(f => map[f.id]).filter(Boolean) as string[];
}

// ── Construction du Monde universel ───────────────────
export type UniversalInput = {
  actorKind: UniversalActorKind;
  actorDetail?: string;
  intention: string[];
  situation: string[];
  situationFree?: string;
  ecosystem: string[];
  factsFromFreePhrase?: WorldFact[];
};

export function buildUniversalWorld(input: UniversalInput, now = Date.now()): WorldProject {
  const actorLabel = getActorLabel(input.actorKind, input.actorDetail);
  const title = input.actorDetail ? capitalize(input.actorDetail) : actorLabel === "une personne" ? "Mon Monde" : capitalize(actorLabel.replace(/^une |^un |^je rejoins /i, ""));
  const universe = input.actorDetail ? capitalize(input.actorDetail) : capitalize(actorLabel);
  const intentionLabels = input.intention;
  const situation = input.situation;
  const ecosystem = input.ecosystem;

  const freeFacts = input.situationFree ? parseFreePhraseToFacts(input.situationFree) : [];
  const combinedFacts: WorldFact[] = [
    ...input.situation.map(s => ({
      id: `fact-${s.slice(0, 10).replace(/\s/g, "-")}`,
      label: s,
      value: true as const,
      confidence: "confirme" as Confidence,
      status: "confirme" as const,
      provenance: { source: "human" as const, createdAt: now },
    })),
    ...freeFacts.map(f => ({ ...f, status: "proposition_aime" as const })),
    ...input.intention.map(i => ({
      id: `intent-${i.slice(0, 10).replace(/\s/g, "-")}`,
      label: `Intention : ${i}`,
      value: true as const,
      confidence: "confirme" as Confidence,
      status: "confirme" as const,
      provenance: { source: "human" as const, createdAt: now },
    })),
    ...input.ecosystem.map(e => ({
      id: `eco-${e.slice(0, 10).replace(/\s/g, "-")}`,
      label: `Écosystème : ${e}`,
      value: true as const,
      confidence: "confirme" as Confidence,
      status: "confirme" as const,
      provenance: { source: "human" as const, createdAt: now },
    })),
  ];

  // Deduplicate facts by id
  const facts = Array.from(new Map(combinedFacts.map(f => [f.id, f])).values());

  const isSaxo = input.actorDetail === "saxophoniste";
  const nextQuestion = isSaxo
    ? "Vos prestations musicales sont-elles aujourd’hui facturées, rémunérées par contrat salarié, ou les deux ?"
    : "Que souhaitez-vous préciser ensuite ?";

  const universal: UniversalWorldProfile = {
    actorKind: input.actorKind,
    actorLabel,
    actorDetail: input.actorDetail,
    intention: input.intention,
    intentionLabels,
    situation,
    situationFree: input.situationFree,
    ecosystem,
    facts,
    createdAt: now,
    nextQuestion,
  };

  const trajectory = isSaxo ? buildSaxophonistTrajectory() : undefined;

  const modulesProposed = proposedModulesForUniversal({ actorDetail: input.actorDetail }).map(m => ({
    ...m,
    status: "proposed" as const,
    provenance: { source: "aime" as const, createdAt: now } as const,
  }));

  // Timeline : Fil comme colonne vertébrale, avec jalon de création
  const creationEvent = {
    id: `creation-${now}`,
    time: now,
    kind: "intention" as const,
    title: `Monde : ${title}`,
    detail: [
      `Acteur : ${actorLabel}`,
      situation.length ? `Situation : ${situation.slice(0, 3).join(" · ")}` : null,
      intentionLabels.length ? `Intention : ${intentionLabels.slice(0, 2).join(" · ")}` : null,
    ].filter(Boolean).join(" — "),
    status: "execute" as const,
    confidence: "confirme" as Confidence,
    phase: "avant" as const,
    universe,
    provenance: "real" as const,
    visibility: "prive" as const,
    relations: [],
    dependencyIds: [],
    resources: [],
    propagation: { state: "none" as const },
  };

  const maybeTrajectEvent = trajectory
    ? {
        id: `traj-${now}`,
        time: now + 1000,
        kind: "jalon" as const,
        title: "Trajectoire proposée",
        detail: "AIME propose une trajectoire à explorer — à confirmer avec un professionnel.",
        status: "a_valider" as const,
        confidence: "suggere" as Confidence,
        phase: "avant" as const,
        universe,
        provenance: "suggested" as const,
        visibility: "prive" as const,
        relations: [],
        dependencyIds: [],
        resources: [],
        propagation: { state: "proposed" as const },
      }
    : null;

  const timeline = [creationEvent, ...(maybeTrajectEvent ? [maybeTrajectEvent] : [])];

  const base: Partial<WorldProject> = {
    schemaVersion: 2,
    id: crypto.randomUUID(),
    title,
    subtitle: input.situationFree || intentionLabels.join(" — ") || actorLabel,
    universe,
    pivot: fact(now, "confirme"),
    city: fact(null, "manquant"),
    venue: fact(null, "manquant"),
    guestsCount: fact(null, "manquant"),
    budget: fact(null, "manquant"),
    currency: "EUR",
    persona: "couple",
    timeline,
    universal,
    trajectory,
    modulesProposed,
  };

  return normalizeProject(base as WorldProject);
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Validation : aucun doublon canonique ─────────────
export function hasNoDuplicatedCanonicalData(project: WorldProject): boolean {
  // Exemple : universal.facts ne doit pas dupliquer une donnée déjà dans project.timeline ou autre collection.
  // On vérifie que les facts proposés ne créent pas de documents ou providers implicites sans validation.
  if (!project.universal) return true;
  // Si facts contient un document, il ne doit pas déjà exister dans project.documents sans provenance humaine.
  // Pour l'instant, on vérifie simplement que documents reste vide tant que l'utilisateur n'a pas validé.
  const hasAutoCreatedDocuments = project.documents.length > 0 && project.universal.facts.some(f => f.id.includes("fact-doc") && f.status === "proposition_aime");
  // Tant que status est proposition_aime, aucun document canonique ne doit avoir été créé.
  return !hasAutoCreatedDocuments || project.documents.length === 0;
}
