import { nextBestActions, type AimeNextStep } from "./aime-guidance";
import { parseIntention } from "./parser";
import { DEFAULT_HERO_VISUAL, editorialMomentVisual, momentVisual, momentVisualZone, visualSourceUrl } from "./world-visuals";
import type {
  Confidence,
  MessageTemplate,
  Task,
  TimelineEvent,
  WorldProject,
  WorldVisual,
} from "./types";

/**
 * The orchestration contract used by the first structured AIME pass.
 *
 * This module deliberately has no React or store dependency. AIME can therefore
 * inspect a World in the browser, on the server, or in a test without ever
 * mutating it. A plan is only a proposal until the caller explicitly applies
 * or rejects it.
 */

export type AimeProposalOperationKind = "field" | "moment" | "provider" | "task" | "text" | "visual";

export type AimeProposalOperation = {
  id: string;
  kind: AimeProposalOperationKind;
  label: string;
  target: string;
  before?: unknown;
  after: unknown;
  reason: string;
  source: string;
  confidence: Exclude<Confidence, "manquant">;
  selected: boolean;
};

export type AimeQuestion = {
  id: string;
  title: string;
  prompt: string;
  why: string;
  weight: AimeNextStep["weight"];
  sourceStepId: string;
};

export type AimeKnownFact = {
  label: string;
  value: string;
  confidence: Exclude<Confidence, "manquant">;
  source: string;
};

export type AimeTextProposal = {
  id: string;
  title: string;
  audience: "couple" | "invites" | "prestataire" | "public" | "equipe";
  tone: "chaleureux" | "pratique" | "elegant";
  body: string;
  operationId: string;
};

export type AimeVisualProposal = {
  id: string;
  title: string;
  targetEventId?: string;
  target: "moment" | "hero";
  zone: string;
  visual: WorldVisual;
  previewUrl: string;
  reason: string;
  operationId: string;
};

export type AimeProposalPlan = {
  id: string;
  createdAt: number;
  sourceMessage: string;
  knownFacts: AimeKnownFact[];
  missing: AimeQuestion[];
  operations: AimeProposalOperation[];
  textProposals: AimeTextProposal[];
  visualProposals: AimeVisualProposal[];
  summary: string;
};

export type AimeProposalDecision = "applied" | "rejected";

const FIELD_LABELS: Record<string, string> = {
  title: "Titre du Monde",
  universe: "Univers",
  pivot: "Date du Jour J",
  city: "Ville",
  venue: "Lieu",
  guestsCount: "Nombre d'invités",
  budget: "Budget",
  currency: "Devise",
};

const FIELD_SOURCE: Record<string, string> = {
  title: "phrase de départ",
  universe: "intention mariage",
  pivot: "date lue dans votre phrase",
  city: "lieu lu dans votre phrase",
  venue: "lieu confirmé dans votre phrase",
  guestsCount: "nombre lu dans votre phrase",
  budget: "budget lu dans votre phrase",
  currency: "devise lue dans votre phrase",
};

const PROVIDER_HINTS: ReadonlyArray<{
  category: "lieu" | "traiteur" | "photo" | "video" | "fleuriste" | "musique" | "officiant" | "tenue" | "beaute" | "transport";
  role: string;
  pattern: RegExp;
}> = [
  { category: "traiteur", role: "Traiteur", pattern: /traiteur|menu|repas|cocktail/i },
  { category: "photo", role: "Photographe", pattern: /photographe|photo|reportage/i },
  { category: "video", role: "Vidéaste", pattern: /vidéaste|videaste|vidéo|video|film/i },
  { category: "fleuriste", role: "Fleuriste", pattern: /fleur|floral|bouquet/i },
  { category: "musique", role: "DJ ou groupe", pattern: /dj|musique|orchestre|playlist|bal/i },
  { category: "officiant", role: "Officiant de cérémonie", pattern: /officiant|cérémonie laïque|ceremonie laique/i },
  { category: "tenue", role: "Tenues", pattern: /robe|costume|tenue|essayage/i },
  { category: "beaute", role: "Beauté", pattern: /coiffure|maquillage|beauté|beaute/i },
  { category: "transport", role: "Transport", pattern: /navette|transport|voiture/i },
];

function id(prefix: string): string {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${randomUuid ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`;
}

function sameValue(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  return JSON.stringify(left) === JSON.stringify(right);
}

function formatDate(value: unknown, locale: "fr" | "en"): string {
  if (typeof value !== "number") return "";
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "fr-FR", { dateStyle: "long" }).format(value);
}

function formatValue(path: string, value: unknown, locale: "fr" | "en" = "fr"): string {
  if (path === "pivot") return formatDate(value, locale);
  if (path === "budget" && typeof value === "number") {
    return new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  }
  if (value === null || value === undefined || value === "") return "à préciser";
  return String(value);
}

function confidenceOf(value: { confidence?: Confidence } | undefined): Exclude<Confidence, "manquant"> | null {
  if (!value || !value.confidence || value.confidence === "manquant") return null;
  return value.confidence;
}

function operation(
  kind: AimeProposalOperationKind,
  label: string,
  target: string,
  after: unknown,
  reason: string,
  source: string,
  confidence: Exclude<Confidence, "manquant">,
  before?: unknown,
): AimeProposalOperation {
  return {
    id: id("op"),
    kind,
    label,
    target,
    before,
    after,
    reason,
    source,
    confidence,
    selected: true,
  };
}

function knownFacts(project: WorldProject, message: string, locale: "fr" | "en"): AimeKnownFact[] {
  const facts: AimeKnownFact[] = [];
  const fields: Array<[string, { value: unknown; confidence: Confidence } | undefined]> = [
    ["Date", project.pivot],
    ["Ville", project.city],
    ["Lieu", project.venue],
    ["Invités", project.guestsCount],
    ["Budget", project.budget],
  ];
  for (const [label, fact] of fields) {
    if (!fact || fact.value === null || fact.value === undefined || fact.confidence === "manquant") continue;
    const confidence = confidenceOf(fact);
    if (!confidence) continue;
    facts.push({ label, value: formatValue(label === "Date" ? "pivot" : label, fact.value, locale), confidence, source: "Monde actuel" });
  }
  if (message.trim()) {
    facts.push({ label: "Demande", value: message.trim(), confidence: "confirme", source: "message actuel" });
  }
  return facts;
}

function questionForStep(step: AimeNextStep): AimeQuestion {
  const prompts: Record<string, string> = {
    pivot: "Quand a lieu exactement le mariage ?",
    place: "Avez-vous déjà choisi le lieu de réception ?",
    venue: "Quel est le nom exact du lieu de réception ?",
    guests: "Avez-vous déjà une liste d'invités à importer ou souhaitez-vous commencer ici ?",
    invite: "Souhaitez-vous préparer les liens d'invitation pour les personnes déjà listées ?",
    rsvp: "Voulez-vous préparer une relance pour les réponses encore en attente ?",
    seating: "Souhaitez-vous créer les premières tables à partir de la liste des invités ?",
    providers: "Quels prestataires sont déjà choisis, et lesquels faut-il encore rechercher ?",
    budget: "Quelle enveloppe souhaitez-vous retenir pour tout le mariage ?",
    contracts: "Les contrats des prestataires réservés sont-ils déjà déposés ?",
    conflicts: "Quel Moment doit rester prioritaire en cas de conflit d'horaire ?",
    timeline: "Quels sont les grands Moments que vous voulez absolument voir dans la Timeline ?",
    music: "Quels morceaux ou ambiances doivent accompagner les Moments importants ?",
    emergency: "Qui peut être contacté en urgence le Jour J ?",
    memories: "Qui collectera les photos et vidéos après le mariage ?",
    thanks: "À qui souhaitez-vous préparer les premiers remerciements ?",
  };
  const prompt = prompts[step.id] ?? `Pouvez-vous préciser « ${step.title.toLocaleLowerCase()} » ?`;
  return {
    id: id("question"),
    title: step.title,
    prompt,
    why: step.why,
    weight: step.weight,
    sourceStepId: step.id,
  };
}

function extractVenue(message: string): string | null {
  const namedPlace = message.match(/\b((?:Domaine|Château|Chateau|Manoir|Villa|Salle|Hôtel|Hotel)\b[^,.!?]*?(?=\s+(?:pour|avec|et|à|a|est)\b|[,!.?]|$))/i);
  if (namedPlace?.[1]) return namedPlace[1].trim();
  const labelledPlace = message.match(/\b(?:lieu(?: de réception)?|réception)\s*(?:est|:)?\s*(?:le|la|l')?\s*([A-ZÀ-Ü][A-Za-zÀ-ÿ' -]{2,}?)(?=\s+(?:pour|avec|et|à|a)\b|[,!.?]|$)/i);
  return labelledPlace?.[1]?.trim() || null;
}

function withParsedFields(project: WorldProject, message: string): WorldProject {
  const parsed = parseIntention(message);
  const venue = extractVenue(message);
  const hasProjectSignal = /(mariage|marier|épouser|wedding|marry|married|\d{2,4}\s*(?:invit|convive|personne|guest)|€|euros?|budget|\$|£|\b20\d{2}\b|\b(?:janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\b)/i.test(message);
  return {
    ...project,
    ...(hasProjectSignal && parsed.title && parsed.title !== "Nouveau Projet" ? { title: parsed.title } : {}),
    ...(hasProjectSignal && parsed.universe && parsed.universe !== "Événement" ? { universe: parsed.universe } : {}),
    ...(parsed.pivot && parsed.pivot.confidence !== "deduit" ? { pivot: parsed.pivot } : {}),
    ...(parsed.city?.value ? { city: parsed.city } : {}),
    ...(venue ? { venue: { value: venue, confidence: "confirme" } } : {}),
    ...(parsed.guestsCount?.value !== null && parsed.guestsCount?.value !== undefined ? { guestsCount: parsed.guestsCount } : {}),
    ...(parsed.budget?.value !== null && parsed.budget?.value !== undefined ? { budget: parsed.budget } : {}),
    ...(parsed.currency ? { currency: parsed.currency } : {}),
  };
}

function coreQuestion(
  stepId: string,
  title: string,
  prompt: string,
  why: string,
  weight: AimeNextStep["weight"] = "blocant",
): AimeQuestion {
  return { id: id("question"), title, prompt, why, weight, sourceStepId: stepId };
}

function nextQuestions(
  project: WorldProject,
  options: { phase: "avant" | "pendant" | "apres"; role?: string },
): AimeQuestion[] {
  const confirmed = (fact: { value: unknown; confidence: Confidence } | undefined) =>
    Boolean(fact && fact.value !== null && fact.value !== undefined && fact.confidence === "confirme");
  if (!confirmed(project.pivot)) {
    return [coreQuestion("pivot", "Confirmer la date du Jour J", "Quand a lieu exactement le mariage ?", "La date permet de classer les échéances, les Moments et les paiements.")];
  }
  if (!confirmed(project.city) && !confirmed(project.venue)) {
    return [coreQuestion("place", "Dire où se déroule la journée", "Avez-vous déjà choisi le lieu de réception ?", "La ville et le lieu conditionnent la logistique et les informations visibles par les invités.")];
  }
  if (!confirmed(project.venue)) {
    return [coreQuestion("venue", "Nommer le lieu de réception", "Quel est le nom exact du lieu de réception ?", "Le lieu relie la Timeline, la page publique, la logistique et les prestataires.")];
  }
  if (!confirmed(project.guestsCount)) {
    return [coreQuestion("guests", "Donner une première jauge", "Combien de personnes environ faut-il prévoir ?", "Cette jauge permet de préparer les invités, les tables et les besoins du traiteur.")];
  }
  if (!confirmed(project.budget)) {
    return [coreQuestion("budget", "Poser l'enveloppe", "Quelle enveloppe souhaitez-vous retenir pour tout le mariage ?", "Sans enveloppe, AIME ne peut pas comparer les devis ni signaler les dépassements.", "utile")];
  }
  return nextBestActions(project, options).slice(0, 2).map(step => questionForStep(step));
}

function createProviderOperations(project: WorldProject, message: string): AimeProposalOperation[] {
  const lower = message.toLocaleLowerCase();
  const operations: AimeProposalOperation[] = [];
  for (const hint of PROVIDER_HINTS) {
    if (!hint.pattern.test(lower)) continue;
    const existing = project.providers.find(provider => provider.category === hint.category);
    if (existing) continue;
    const provider = {
      id: id("provider"),
      category: hint.category,
      role: hint.role,
      status: "recherche" as const,
      nextAction: `Identifier un ${hint.role.toLocaleLowerCase()}`,
    };
    operations.push(operation(
      "provider",
      `Ajouter ${hint.role}`,
      `providers.${provider.id}`,
      provider,
      "Le sujet apparaît dans votre demande et aucun prestataire de cette catégorie n'existe encore dans le Monde.",
      "mots-clés du message",
      "suggere",
    ));
  }
  return operations;
}

function createTaskOperations(project: WorldProject, message: string): AimeProposalOperation[] {
  const tasks: Task[] = [];
  const hasPlanningSignal = /(mariage|organiser|préparer|preparer|monde|pass|timeline|programme|prestataire|traiteur|photographe|fleur|dj|musique|cérémonie|ceremonie)/i.test(message);
  if (!hasPlanningSignal) return [];

  if (!project.venue || project.venue.value === null || project.venue.confidence !== "confirme") {
    tasks.push({
      id: id("task"),
      title: "Confirmer le lieu de réception",
      phase: "12m+",
      status: "a_faire",
      priority: "haute",
      dependencies: [],
    });
  }
  for (const hint of PROVIDER_HINTS) {
    if (!hint.pattern.test(message) || project.providers.some(provider => provider.category === hint.category)) continue;
    tasks.push({
      id: id("task"),
      title: `Identifier un ${hint.role.toLocaleLowerCase()}`,
      phase: "12m+",
      status: "a_faire",
      priority: "haute",
      dependencies: [],
    });
  }
  if (project.guests.length === 0 && project.guestsCount?.value) {
    tasks.push({
      id: id("task"),
      title: "Importer ou commencer la liste des invités",
      phase: "12m+",
      status: "a_faire",
      priority: "haute",
      dependencies: [],
    });
  }
  return tasks.slice(0, 4).map(task => operation(
    "task",
    `Ajouter la tâche « ${task.title} »`,
    `tasks.${task.id}`,
    task,
    "Cette tâche découle d'une information manquante ou d'un prestataire encore non défini.",
    "dépendances métier du mariage",
    "suggere",
  ));
}

function createTimelineOperations(project: WorldProject, message: string): AimeProposalOperation[] {
  if (project.timeline.length > 0 || !/(timeline|programme|organiser|préparer|preparer|moments|déroulé|deroule)/i.test(message)) return [];
  const pivot = project.pivot?.value ?? Date.now();
  const events: TimelineEvent[] = [
    {
      id: id("moment"),
      time: pivot,
      kind: "jalon",
      title: "Cadrer le mariage",
      detail: "Confirmer la date, le lieu, le nombre d'invités et l'enveloppe.",
      status: "a_valider",
      confidence: "suggere",
      phase: "avant",
      universe: project.universe || "Mariage",
      provenance: "suggested",
      visibility: "prive",
      relations: [],
      dependencyIds: [],
      resources: [],
      propagation: { state: "none" },
    },
    {
      id: id("moment"),
      time: pivot + 7 * 86400000,
      kind: "jalon",
      title: "Sécuriser les prestataires",
      detail: "Choisir les prestataires essentiels et conserver leurs propositions.",
      status: "a_valider",
      confidence: "suggere",
      phase: "avant",
      universe: project.universe || "Mariage",
      provenance: "suggested",
      visibility: "prive",
      relations: [],
      dependencyIds: [],
      resources: [],
      propagation: { state: "none" },
    },
    {
      id: id("moment"),
      time: pivot,
      kind: "evenement",
      title: "Le Jour J",
      detail: "Préparer le déroulé, les responsables et la logistique du jour du mariage.",
      status: "a_valider",
      confidence: "suggere",
      phase: "pendant",
      universe: project.universe || "Mariage",
      provenance: "suggested",
      visibility: "equipe",
      relations: [],
      dependencyIds: [],
      resources: [],
      propagation: { state: "none" },
    },
  ];
  return events.map(event => operation(
    "moment",
    `Ajouter le Moment « ${event.title} »`,
    `timeline.${event.id}`,
    event,
    "La Timeline est la colonne vertébrale du Monde et elle est encore vide.",
    "structure métier du mariage",
    "suggere",
  ));
}

function createTextOperations(project: WorldProject, message: string, planId: string): {
  operations: AimeProposalOperation[];
  textProposals: AimeTextProposal[];
} {
  if (!/(texte|message|invitation|faire-part|fairepart|public|présentation|presentation|remerciement|brief|mariage|organiser|préparer|preparer|monde|pass)/i.test(message)) {
    return { operations: [], textProposals: [] };
  }
  const date = project.pivot?.confidence === "confirme" ? formatDate(project.pivot.value, "fr") : "";
  const confirmedPlace = project.venue?.confidence === "confirme"
    ? project.venue.value
    : project.city?.confidence === "confirme" ? project.city.value : null;
  const place = confirmedPlace || "";
  const body = `Nous avons le plaisir de vous retrouver pour ${project.title || "notre mariage"}${date ? ` le ${date}` : ""}${place ? `, à ${place}` : ""}. Les informations pratiques et les horaires seront confirmés dans la Timeline du Monde.`;
  const template: MessageTemplate = {
    id: id("template"),
    title: "Présentation pratique du mariage",
    type: "pratique",
    body,
    provenance: { source: "aime", proposalId: planId, createdAt: Date.now() },
  };
  const textOperation = operation(
    "text",
    "Préparer une présentation pratique",
    `messageTemplates.${template.id}`,
    template,
    "Le texte est contextualisé avec les informations déjà confirmées ; il reste un brouillon et ne sera pas envoyé automatiquement.",
    "faits confirmés du Monde",
    "suggere",
  );
  return {
    operations: [textOperation],
    textProposals: [{
      id: id("text"),
      title: template.title,
      audience: /prestataire|brief/i.test(message) ? "prestataire" : /public|présentation/i.test(message) ? "public" : "invites",
      tone: "pratique",
      body,
      operationId: textOperation.id,
    }],
  };
}

function createVisualProposals(project: WorldProject, message: string, planId: string): {
  operations: AimeProposalOperation[];
  visualProposals: AimeVisualProposal[];
} {
  if (!/(visuel|image|vidéo|video|photo|ambiance|illustration|hero|illustrer|page publique|section|ouverture|mariage|organiser|préparer|preparer|monde|pass)/i.test(message)) {
    return { operations: [], visualProposals: [] };
  }
  const candidates = project.timeline
    .filter(event => !event.visual?.url)
    .filter(event => /(cérémon|ceremon|repas|table|prépar|prepar|photo|musique|bal|réception|reception|lieu|invité|invite)/i.test(`${event.title} ${event.detail ?? ""}`))
    .slice(0, 3);
  const fallback = candidates.length > 0 ? candidates : project.timeline.slice(0, 2);
  const operations: AimeProposalOperation[] = [];
  const visualProposals: AimeVisualProposal[] = [];

  if (/(hero|page publique|section|ouverture)/i.test(message)) {
    const sourceEvent = fallback[0];
    const visual = sourceEvent ? (editorialMomentVisual(sourceEvent, project) ?? momentVisual(sourceEvent, project)) : DEFAULT_HERO_VISUAL;
    const zone = sourceEvent ? momentVisualZone(sourceEvent, project) : "reception";
    const heroOperation = operation(
      "visual",
      "Proposer un visuel pour l'ouverture du Monde",
      "heroVisual",
      { ...visual, provenance: { source: "aime", proposalId: planId, createdAt: Date.now() } },
      `Le visuel est relié à la phase et au sujet « ${zone} » ; il reste privé tant que vous ne l'avez pas accepté.`,
      `phase et sujet du Monde : ${zone}`,
      "suggere",
      project.heroVisual,
    );
    operations.push(heroOperation);
    visualProposals.push({
      id: id("visual"),
      title: "Ouverture du Monde",
      target: "hero",
      zone,
      visual,
      previewUrl: visualSourceUrl(visual),
      reason: heroOperation.reason,
      operationId: heroOperation.id,
    });
  }

  for (const event of fallback) {
    const visual = editorialMomentVisual(event, project) ?? momentVisual(event, project);
    const zone = momentVisualZone(event, project);
    const visualOperation = operation(
      "visual",
      `Associer un visuel au Moment « ${event.title} »`,
      `timeline.${event.id}.visual`,
      { ...visual, provenance: { source: "aime", proposalId: planId, createdAt: Date.now() } },
      `La zone « ${zone} » correspond au sujet de ce Moment. Le visuel est proposé depuis le manifeste existant, pas publié automatiquement.`,
      `relations et sujet du Moment : ${zone}`,
      "suggere",
      event.visual,
    );
    operations.push(visualOperation);
    visualProposals.push({
      id: id("visual"),
      title: event.title,
      targetEventId: event.id,
      target: "moment",
      zone,
      visual,
      previewUrl: visualSourceUrl(visual),
      reason: visualOperation.reason,
      operationId: visualOperation.id,
    });
  }
  return { operations, visualProposals };
}

/**
 * Builds one complete, inspectable pass from a user message. It can propose
 * fields, providers, Moments, text and visuals in the same plan. No function in
 * this module writes to the store.
 */
export function buildAimeProposalPlan(
  project: WorldProject,
  message: string,
  options: { role?: string; phase?: "avant" | "pendant" | "apres"; locale?: "fr" | "en" } = {},
): AimeProposalPlan {
  const planId = id("plan");
  const locale = options.locale ?? "fr";
  const parsed = parseIntention(message);
  const venue = extractVenue(message);
  const operations: AimeProposalOperation[] = [];
  const hasProjectSignal = /(mariage|marier|épouser|wedding|marry|married|\d{2,4}\s*(?:invit|convive|personne|guest)|€|euros?|budget|\$|£|\b20\d{2}\b|\b(?:janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\b)/i.test(message);

  const parsedFields: Array<[string, unknown, Confidence | undefined, unknown]> = [
    ["title", hasProjectSignal && parsed.title !== "Nouveau Projet" ? parsed.title : undefined, hasProjectSignal && parsed.title !== "Nouveau Projet" ? "confirme" : undefined, project.title],
    ["universe", hasProjectSignal && parsed.universe !== "Événement" ? parsed.universe : undefined, hasProjectSignal && parsed.universe !== "Événement" ? "confirme" : undefined, project.universe],
    ["pivot", parsed.pivot?.value, parsed.pivot?.confidence, project.pivot],
    ["city", parsed.city?.value, parsed.city?.confidence, project.city],
    ["venue", venue, venue ? "confirme" : undefined, project.venue],
    ["guestsCount", parsed.guestsCount?.value, parsed.guestsCount?.confidence, project.guestsCount],
    ["budget", parsed.budget?.value, parsed.budget?.confidence, project.budget],
    ["currency", parsed.currency, parsed.currency ? "confirme" : undefined, project.currency],
  ];
  for (const [path, after, confidence, before] of parsedFields) {
    if (!confidence || confidence === "deduit" || after === null || after === undefined || after === "") continue;
    const beforeValue = before && typeof before === "object" && "value" in before ? (before as { value: unknown }).value : before;
    if (sameValue(beforeValue, after)) continue;
    const factAfter = ["pivot", "city", "venue", "guestsCount", "budget"].includes(path)
      ? { value: after, confidence }
      : after;
    operations.push(operation(
      "field",
      `Renseigner ${FIELD_LABELS[path] ?? path}`,
      path,
      factAfter,
      `Cette information a été reconnue dans le message et n'est pas identique à la valeur actuelle.`,
      FIELD_SOURCE[path] ?? "message utilisateur",
      confidence as Exclude<Confidence, "manquant">,
      before,
    ));
  }

  operations.push(...createProviderOperations(project, message));
  operations.push(...createTaskOperations(project, message));
  operations.push(...createTimelineOperations(project, message));
  const text = createTextOperations(project, message, planId);
  operations.push(...text.operations);
  const visuals = createVisualProposals(project, message, planId);
  operations.push(...visuals.operations);

  const preview = withParsedFields(project, message);
  const missing = nextQuestions(preview, { phase: options.phase ?? "avant", role: options.role });
  const known = knownFacts(preview, message, locale);
  const operationCount = operations.length;
  const summary = operationCount > 0
    ? `${operationCount} proposition${operationCount > 1 ? "s" : ""} prête${operationCount > 1 ? "s" : ""} à relire.`
    : missing.length > 0
      ? "Aucune donnée n'est écrite : AIME commence par la prochaine question utile."
      : "Le Monde est cohérent pour cette passe ; vous pouvez continuer avec un nouveau sujet.";

  return {
    id: planId,
    createdAt: Date.now(),
    sourceMessage: message,
    knownFacts: known,
    missing,
    operations,
    textProposals: text.textProposals,
    visualProposals: visuals.visualProposals,
    summary,
  };
}

function cloneProjectForApply(project: WorldProject): WorldProject {
  return {
    ...project,
    timeline: [...project.timeline],
    tasks: [...project.tasks],
    guests: [...project.guests],
    tables: [...project.tables],
    providers: [...project.providers],
    payments: [...project.payments],
    documents: [...project.documents],
    communications: [...project.communications],
    music: [...project.music],
    team: [...project.team],
    memories: [...project.memories],
    media: [...project.media],
    messageTemplates: [...project.messageTemplates],
    messageLogs: [...project.messageLogs],
    messages: [...project.messages],
    aimeProposalHistory: [...(project.aimeProposalHistory ?? [])],
  };
}

/** Applies only selected operations and records the human decision. */
export function applyAimeProposalToProject(project: WorldProject, plan: AimeProposalPlan): WorldProject {
  if (project.aimeProposalHistory?.some(entry => entry.id === plan.id)) return project;
  const next = cloneProjectForApply(project);
  const conflicts: string[] = [];
  for (const item of plan.operations.filter(operationItem => operationItem.selected)) {
    if (item.kind === "field") {
      const current = (next as unknown as Record<string, unknown>)[item.target];
      if (item.before !== undefined && !sameValue(current, item.before)) {
        conflicts.push(item.id);
        continue;
      }
      (next as unknown as Record<string, unknown>)[item.target] = item.after;
      continue;
    }
    const [collection, entityId, property] = item.target.split(".");
    if (item.kind === "visual" && item.target === "heroVisual") {
      if (item.before !== undefined && !sameValue(next.heroVisual, item.before)) {
        conflicts.push(item.id);
        continue;
      }
      next.heroVisual = item.after as WorldVisual;
      continue;
    }
    if (item.kind === "visual" && collection === "timeline" && entityId && property === "visual") {
      const current = next.timeline.find(event => event.id === entityId);
      if (!current || (item.before !== undefined && !sameValue(current.visual, item.before))) {
        conflicts.push(item.id);
        continue;
      }
      next.timeline = next.timeline.map(event => event.id === entityId ? { ...event, visual: item.after as WorldVisual } : event);
      continue;
    }
    if ((item.kind === "moment" || item.kind === "provider" || item.kind === "task" || item.kind === "text") && collection) {
      const list = (next as unknown as Record<string, unknown>)[collection];
      if (Array.isArray(list) && !list.some(entry => entry && typeof entry === "object" && (entry as { id?: string }).id === entityId)) {
        (next as unknown as Record<string, unknown>)[collection] = [...list, item.after];
      }
    }
  }
  return recordAimeProposalDecision(next, plan, "applied", conflicts);
}

/** Records an explicit refusal without applying any operation. */
export function rejectAimeProposal(project: WorldProject, plan: AimeProposalPlan): WorldProject {
  if (project.aimeProposalHistory?.some(entry => entry.id === plan.id)) return project;
  return recordAimeProposalDecision(cloneProjectForApply(project), plan, "rejected");
}

function recordAimeProposalDecision(
  project: WorldProject,
  plan: AimeProposalPlan,
  decision: AimeProposalDecision,
  conflicts: string[] = [],
): WorldProject {
  const accepted = decision === "applied"
    ? plan.operations.filter(item => item.selected && !conflicts.includes(item.id)).map(item => item.id)
    : [];
  const rejected = decision === "rejected"
    ? plan.operations.map(item => item.id)
    : plan.operations.filter(item => !item.selected || conflicts.includes(item.id)).map(item => item.id);
  return {
    ...project,
    aimeProposalHistory: [
      ...(project.aimeProposalHistory ?? []),
      {
        id: plan.id,
        createdAt: plan.createdAt,
        decidedAt: Date.now(),
        status: decision,
        sourceMessage: plan.sourceMessage,
        acceptedOperationIds: accepted,
        rejectedOperationIds: rejected,
        ...(conflicts.length > 0 ? { conflictedOperationIds: conflicts } : {}),
      },
    ],
  };
}

export function operationLabel(operationItem: AimeProposalOperation): string {
  if (operationItem.kind === "field") {
    const after = operationItem.after && typeof operationItem.after === "object" && "value" in operationItem.after
      ? (operationItem.after as { value: unknown }).value
      : operationItem.after;
    return `${operationItem.label} : ${formatValue(operationItem.target, after)}`;
  }
  return operationItem.label;
}
