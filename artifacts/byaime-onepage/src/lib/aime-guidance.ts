import { useSyncExternalStore } from "react";
import {
  AIME_MODEL,
  architectureBrief,
  findAimeScreenByLabel,
  getAimeScreen,
  normalizeAimeText,
  searchAimeScreens,
  type AimeScreen,
  type AimeScreenAction,
  type AimeScreenId,
} from "./aime-architecture";
import { focusWorld } from "./world-focus";
import { findTimelineConflicts } from "./timeline-graph";
import type { WorldProject } from "./types";
import type { WeddingCapabilities, WeddingPanelId, WorldPhase } from "./wedding-navigation";
import { getWeddingCapabilities } from "./wedding-navigation";
import { MIN_INTENTION_LENGTH } from "./intention-draft";

/**
 * Le moteur de l'agent de guidage : à partir de l'écran où l'on se trouve, du rôle
 * et de l'état réel du Monde, il répond aux questions « où suis-je », « ça sert à
 * quoi », « je fais quoi maintenant » et « comment on fait X », puis propose des
 * sauts réels dans l'app.
 *
 * Aucun modèle de langage n'est impliqué : les réponses viennent du registre
 * d'architecture (`aime-architecture.ts`) et des données du projet, donc elles ne
 * peuvent pas inventer un écran qui n'existe pas.
 */

/* ------------------------------------------------------------------ écran courant */

export { AIME_SCREENS, findAimeScreenByLabel, getAimeScreen } from "./aime-architecture";
export type { AimeScreenId } from "./aime-architecture";

export type AimeScreenContext = {
  screen: AimeScreenId | null;
  phase?: WorldPhase;
  view?: string;
  panel?: WeddingPanelId | null;
};

let context: AimeScreenContext = { screen: null };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach(listener => listener());
}

export function setAimeScreenContext(patch: Partial<AimeScreenContext>) {
  const next = { ...context, ...patch };
  const unchanged = (Object.keys(patch) as (keyof AimeScreenContext)[]).every(key => next[key] === context[key]);
  if (unchanged) return;
  context = next;
  emit();
}

export function getAimeScreenContext(): AimeScreenContext {
  return context;
}

/** Un panneau qui s'ouvre prend la main sur le contexte ; à la fermeture, on rend la valeur. */
export function pushAimeScreen(screen: AimeScreenId | null) {
  const previous = context.screen;
  setAimeScreenContext({ screen: screen });
  return () => setAimeScreenContext({ screen: previous });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAimeScreenContext(): AimeScreenContext {
  return useSyncExternalStore(subscribe, getAimeScreenContext, () => ({ screen: null }) as AimeScreenContext);
}

/** Déclare l'écran d'un panneau depuis son titre (utilisé par le chrome commun `CenteredBlock`). */
export function useAimeScreenFromTitle(title: string | null | undefined) {
  const screen = findAimeScreenByLabel(title ?? undefined);
  useSyncExternalStore(subscribe, () => context, () => context);
  return screen?.id ?? null;
}

export function currentScreen(ctx: AimeScreenContext = context): AimeScreen | undefined {
  return ctx.screen ? getAimeScreen(ctx.screen) : undefined;
}

/* ------------------------------------------------------------------ déplacements */

export function runAimeAction(action: AimeScreenAction) {
  if (typeof window === "undefined") return;
  if (action.focus) {
    focusWorld(action.focus);
    return;
  }
  if (action.emit) {
    window.dispatchEvent(new Event(action.emit));
    return;
  }
  if (action.href) window.location.assign(action.href);
}

/* ------------------------------------------------------------------ quoi faire ensuite */

export type AimeNextStep = {
  id: string;
  title: string;
  why: string;
  /** "blocant" = sans ça, une partie de l'app reste fausse. */
  weight: "blocant" | "utile" | "saison";
  action: AimeScreenAction;
};

const confirmed = (fact: { value: unknown; confidence: string } | undefined) =>
  !!fact && fact.value !== null && fact.value !== undefined && fact.confidence === "confirme";

export function nextBestActions(
  project: WorldProject | null,
  options: { phase?: WorldPhase; role?: string } = {},
): AimeNextStep[] {
  const phase = options.phase ?? "avant";
  const capabilities = getWeddingCapabilities(options.role ?? "owner");

  if (!project) {
    return [{
      id: "start",
      title: "Poser la première phrase du mariage",
      why: "AIME a besoin d'une date, d'un lieu ou d'un nombre d'invités pour ouvrir un Monde. Une information à la fois suffit.",
      weight: "blocant",
      action: { label: "Ouvrir l'accueil", detail: "Le champ de saisie est tout en haut.", href: "/" },
    }];
  }

  const steps: AimeNextStep[] = [];
  const guestsCount = project.guests.length;
  const answered = project.guests.filter(guest => guest.rsvp === "confirme").length;
  const pending = project.guests.filter(guest => guest.rsvp === "en_attente").length;
  const invited = project.guests.filter(guest => guest.invitationSent).length;
  const providersReserved = project.providers.filter(provider => provider.status === "reserve").length;
  const providersPending = project.providers.filter(provider => provider.status !== "reserve").length;
  const unpaid = project.payments.filter(payment => payment.state === "du");
  const engaged = project.payments.reduce((total, payment) => total + payment.amountCents, 0);
  const contracts = project.documents.filter(document => document.kind === "contrat").length;
  const musicToChoose = project.music.filter(track => track.status === "a_choisir").length;
  const conflicts = findTimelineConflicts(project.timeline).length;

  if (!confirmed(project.pivot)) {
    steps.push({
      id: "pivot",
      title: "Confirmer la date du Jour J",
      why: project.pivot?.value
        ? "La date est connue mais pas confirmée : tout le compte à rebours, les phases et les échéances en dépendent."
        : "Sans date, AIME ne peut classer ni les tâches, ni les Moments, ni les échéances de paiement.",
      weight: "blocant",
      action: { label: "Ouvrir les réglages du Monde", detail: "Date, ville, lieu, enveloppe.", emit: "aime:open-world-settings" },
    });
  }
  if (!confirmed(project.city) && !confirmed(project.venue)) {
    steps.push({
      id: "place",
      title: "Dire où se déroule la journée",
      why: "Le lieu conditionne la logistique, les hébergements et les informations publiques que verront les invités.",
      weight: "blocant",
      action: { label: "Ouvrir les réglages du Monde", detail: "Ville et lieu.", emit: "aime:open-world-settings" },
    });
  }
  if (!guestsCount) {
    steps.push({
      id: "guests",
      title: "Ouvrir la liste des invités",
      why: "Les réponses, les couverts, le plan de table et le menu se calculent à partir de cette liste : sans elle, tout le reste reste théorique.",
      weight: "blocant",
      action: { label: "Ouvrir la liste des invités", detail: "Une ligne par personne, le foyer porte les couverts.", focus: { panel: "guests" } },
    });
  } else if (invited === 0) {
    steps.push({
      id: "invite",
      title: "Envoyer les liens d'invitation",
      why: `${guestsCount} personne(s) dans la liste, aucun lien envoyé : les réponses ne peuvent pas encore remonter.`,
      weight: "utile",
      action: { label: "Ouvrir la liste des invités", detail: "Chaque lien est personnel et révocable.", focus: { panel: "guests" } },
    });
  } else if (pending > 0) {
    steps.push({
      id: "rsvp",
      title: `Relancer les ${pending} réponse(s) en attente`,
      why: `${answered} réponse(s) confirmée(s) sur ${guestsCount} : les tables et le traiteur se prépareraient sur une hypothèse.`,
      weight: "utile",
      action: { label: "Préparer la relance", detail: "Un modèle, une liste de destinataires.", focus: { panel: "messages" } },
    });
  }
  if (guestsCount && !project.tables.length) {
    steps.push({
      id: "seating",
      title: "Ouvrir le plan de table",
      why: "Les tables et leurs capacités conditionnent le placement ; les besoins alimentaires des invités y sont repris.",
      weight: "utile",
      action: { label: "Ouvrir le plan de table", detail: "Tables, capacités, placements.", focus: { panel: "seating" } },
    });
  }
  if (providersPending > 0) {
    steps.push({
      id: "providers",
      title: `Décider ${providersPending} prestataire(s) encore en cours`,
      why: `Seuls ${providersReserved} sont réservés : un statut « devis reçu » sans prochaine action finit toujours par être oublié.`,
      weight: "utile",
      action: { label: "Ouvrir les prestataires", detail: "Statuts, montants, prochaine action.", focus: { panel: "providers" } },
    });
  }
  if (!confirmed(project.budget) && engaged > 0) {
    steps.push({
      id: "budget",
      title: "Annoncer l'enveloppe",
      why: "Des engagements existent déjà ; sans enveloppe, AIME ne peut dire ni ce qui reste, ni ce qui dépasse.",
      weight: "utile",
      action: { label: "Ouvrir les finances", detail: "Enveloppe, engagé, payé, à venir.", focus: { panel: "budget" } },
    });
  }
  if (unpaid.length) {
    steps.push({
      id: "due",
      title: `${unpaid.length} paiement(s) à venir`,
      why: "Les échéances restent la source la plus fréquente de tension la dernière semaine.",
      weight: "utile",
      action: { label: "Ouvrir les finances", detail: "Ce qui est dû, et pour quand.", focus: { panel: "budget" } },
    });
  }
  if (providersReserved > 0 && contracts === 0) {
    steps.push({
      id: "contracts",
      title: "Archiver les contrats signés",
      why: "Un prestataire réservé sans contrat déposé se retrouve sans trace le jour où l'horaire change.",
      weight: "utile",
      action: { label: "Ouvrir les documents", detail: "Devis, contrats, factures.", focus: { panel: "documents" } },
    });
  }
  if (conflicts > 0) {
    steps.push({
      id: "conflicts",
      title: `Régler ${conflicts} conflit(s) d'horaire`,
      why: "Deux Moments qui se chevauchent se règlent mieux maintenant qu'à 18 h le jour même.",
      weight: "blocant",
      action: { label: "Ouvrir la synthèse du Monde", detail: "Alertes, dépendances, avance.", focus: { overview: true } },
    });
  }

  if (phase === "avant") {
    if (!project.timeline.length) {
      steps.push({
        id: "timeline",
        title: "Écrire les premiers Moments",
        why: "La Timeline est la source : invités, prestataires, musique et documents se relient à un Moment, jamais entre eux.",
        weight: "blocant",
        action: { label: "Ouvrir la Timeline", detail: "Tous les Moments du mariage.", focus: { view: "chronological" } },
      });
    }
    if (musicToChoose) {
      steps.push({
        id: "music",
        title: `Choisir ${musicToChoose} morceau(x) en attente`,
        why: "Un morceau validé et relié à son Moment peut être transmis au DJ sans relecture.",
        weight: "saison",
        action: { label: "Ouvrir la musique", detail: "Morceaux, statuts, Moments reliés.", focus: { panel: "music" } },
      });
    }
  }
  if (phase === "pendant") {
    if (!capabilities.manage) {
      steps.push({
        id: "role",
        title: "Vous suivez le Jour J en lecture",
        why: "Votre rôle ne permet pas de déplacer les Moments : passez par un propriétaire pour toute modification du programme.",
        weight: "saison",
        action: { label: "Voir qui fait quoi", detail: "Rôles et responsabilités.", focus: { panel: "team" } },
      });
    }
    if (!project.logistics.emergencyContacts.length) {
      steps.push({
        id: "emergency",
        title: "Compléter les contacts d'urgence",
        why: "À 20 h, c'est dans la logistique qu'on cherche un numéro, pas dans les notes d'un téléphone personnel.",
        weight: "blocant",
        action: { label: "Ouvrir la logistique", detail: "Accès, navettes, urgences, plan B.", focus: { panel: "logistics" } },
      });
    }
    steps.push({
      id: "regie",
      title: "Garder la régie ouverte",
      why: "Un Moment déplacé depuis la régie calcule les dépendances touchées et prépare le message aux personnes concernées.",
      weight: "utile",
      action: { label: "Ouvrir la régie du Jour J", detail: "Le fil du jour, l'événement en cours.", focus: { panel: "dayof" } },
    });
  }
  if (phase === "apres") {
    if (!project.media.length && !project.memories.length) {
      steps.push({
        id: "memories",
        title: "Ouvrir la collecte des images",
        why: "Les liens de dépôt ont une date de vie : collecter maintenant évite de perdre les téléphones des invités.",
        weight: "utile",
        action: { label: "Ouvrir Photos & vidéos", detail: "Dépôts, albums, état.", focus: { panel: "memories" } },
      });
    }
    steps.push({
      id: "thanks",
      title: "Écrire les remerciements",
      why: "La liste des personnes à remercier suit les réponses reçues ; elle se tient dans ce panneau.",
      weight: "saison",
      action: { label: "Ouvrir les remerciements", detail: "À écrire, à envoyer, envoyés.", focus: { panel: "thanks" } },
    });
  }
  const rank: Record<AimeNextStep["weight"], number> = { blocant: 0, utile: 1, saison: 2 };
  return steps
    .map((step, index) => ({ step, index }))
    .sort((a, b) => rank[a.step.weight] - rank[b.step.weight] || a.index - b.index)
    .slice(0, 5)
    .map(entry => entry.step);
}

/* ------------------------------------------------------------------ réponses */

export type AimeAnswer = {
  kind: "screen" | "howto" | "next" | "model" | "roles" | "unknown";
  title: string;
  paragraphs: string[];
  steps: string[];
  actions: AimeScreenAction[];
  matches: { screen: AimeScreen; score: number }[];
};

const INTENT_PATTERNS: { kind: AimeAnswer["kind"]; test: RegExp }[] = [
  { kind: "next", test: /(quoi faire|que faire|par ou|par où|commencer|etape suivante|étape suivante|prochaine|aide moi|j\'y vais|maintenant|blocage|bloqué|priorit)/ },
  { kind: "roles", test: /(qui voit|qui peut|droits|capacite|accéder|acces|visibility|visible par|role|partager avec|team|temoin|témoin)/ },
  { kind: "screen", test: /(ici|cet ecran|cet écran|ce panneau|a quoi ca sert|à quoi ça sert|explique|expliquer|ou suis|où suis)/ },
  { kind: "model", test: /(comment fonctionne|architecture|le modele|comment aime|qu\'est ce qu\'un monde|qu'est-ce qu'un monde)/ },
  { kind: "howto", test: /(comment|ou est|où est|trouver|ajouter|enlever|modifier|changer|faire)/ },
];

const GENERIC_WORDS = new Set([
  "comment", "est", "que", "dans", "pour", "avec", "sans", "sur", "les", "des", "une", "mon", "ma", "mes", "ce", "cet", "cette",
  "peut", "peux", "faire", "trouver", "sert", "quoi", "quoi", "aime", "mond", "est",
]);

export function keywordsOf(question: string): string[] {
  return normalizeAimeText(question).split(" ").filter(word => word.length > 2 && !GENERIC_WORDS.has(word));
}

export function answerAime(
  question: string,
  options: { project: WorldProject | null; phase?: WorldPhase; role?: string; screen?: AimeScreenId | null } = { project: null },
): AimeAnswer {
  const normalized = normalizeAimeText(question);
  const intent = INTENT_PATTERNS.find(entry => entry.test.test(normalized))?.kind ?? "howto";
  const screen = options.screen ? getAimeScreen(options.screen) : undefined;
  const matches = searchAimeScreens(keywordsOf(question).join(" ") || question, 4);

  if (intent === "screen" && screen) {
    return {
      kind: "screen",
      title: screen.label,
      paragraphs: [screen.where, screen.purpose],
      steps: screen.does,
      actions: screen.actions,
      matches: [],
    };
  }
  if (intent === "model") {
    return {
      kind: "model",
      title: "Comment AIME est construit",
      paragraphs: AIME_MODEL.slice(0, 3).map(entry => `${entry.title} — ${entry.body}`),
      steps: AIME_MODEL.slice(3).map(entry => `${entry.title} — ${entry.body}`),
      actions: [{ label: "Voir toutes les sections du Monde", detail: "La liste des panneaux.", focus: { panel: "sections" } }],
      matches: [],
    };
  }
  if (intent === "roles") {
    const capabilities = getWeddingCapabilities(options.role ?? "owner");
    const lines = [
      `Rôle courant : ${options.role ?? "owner"}.`,
      `Peut gérer le Monde : ${capabilities.manage ? "oui" : "non"}.`,
      `Peut modifier l'opérationnel (Moments, invités, tables) : ${capabilities.editOperational ? "oui" : "non"}.`,
      `Voit les finances : ${capabilities.seeFinances ? "oui" : "non"}.`,
      `Accède aux documents privés : ${capabilities.managePrivateDocuments ? "oui" : "non"}.`,
    ];
    return {
      kind: "roles",
      title: "Qui voit quoi",
      paragraphs: ["Les capacités suivent le rôle, écran par écran : un panneau peut être visible mais en lecture seule."],
      steps: lines,
      actions: [
        { label: "Ouvrir le graphe de visibilité", detail: "Contrôler les frontières avant de partager.", focus: { graph: true } },
        { label: "Inviter en choisissant un rôle", detail: "Accès partiel, lien nominatif.", emit: "aime:open-collaboration-invite" },
      ],
      matches: [],
    };
  }
  if (intent === "next") {
    const steps = nextBestActions(options.project, { phase: options.phase, role: options.role });
    return {
      kind: "next",
      title: "Ce qui débloque le plus, maintenant",
      paragraphs: steps.length ? [] : ["Rien ne bloque : le Monde est cohérent, gardez la Timeline à l'œil pendant le Jour J."],
      steps: steps.map(step => `${step.title} — ${step.why}`),
      actions: steps.map(step => step.action),
      matches: [],
    };
  }

  if (!matches.length) {
    return {
      kind: "unknown",
      title: "Je n’ai pas trouvé cet écran",
      paragraphs: [
        "AIME ne répond que sur ce qui existe dans l'app. Reformulez avec le mot d'un panneau (invités, plan de table, finances, musique, logistique, régie…), ou demandez « qu'est-ce que je fais maintenant ».",
      ],
      steps: [],
      actions: [{ label: "Parcourir les écrans", detail: "Tous les panneaux du Monde.", focus: { panel: "sections" } }],
      matches: [],
    };
  }

  const [best] = matches;
  return {
    kind: "howto",
    title: best.screen.label,
    paragraphs: [best.screen.where, best.screen.purpose],
    steps: best.screen.does,
    actions: best.screen.actions,
    matches: matches.slice(1),
  };
}

/** Résumé injectable (docs, future passerelle vers un modèle). */
export const aimeArchitectureBrief = architectureBrief;

/** Le seuil de saisie est partagé avec le store : la guidance le rappelle. */
export const AIME_MIN_QUESTION = MIN_INTENTION_LENGTH;
