import { normalizeWorldVisual, type TimelineEvent, type WorldProject } from "./types";
import { normalizePublicPage } from "./public-page";
import { generateWeddingTimeline } from "./seed-data";
import { TIMELINE_SCHEMA_VERSION } from "./timeline-graph";

const defaults = (event: TimelineEvent): TimelineEvent => ({
  ...event,
  visual: normalizeWorldVisual(event.visual),
  durationMinutes: event.durationMinutes ?? (event.kind === "evenement" ? 60 : undefined),
  relations: Array.isArray(event.relations) ? event.relations : [],
  dependencyIds: Array.isArray(event.dependencyIds) ? event.dependencyIds : [],
  resources: Array.isArray(event.resources) ? event.resources : [],
  provenance: event.provenance ?? (event.confidence === "suggere" || event.confidence === "deduit" ? "suggested" : "real"),
  visibility: event.visibility ?? "equipe",
  audience: Array.isArray(event.audience) ? event.audience : [],
  propagation: event.propagation ?? { state: "none" },
});

export function normalizeProject(value: WorldProject): WorldProject {
  const emptyCeremony = { structure: [], notes: "", readings: [], vows: [], traditions: [], menu: "", drinks: "", cake: "", firstDance: "" };
  const emptyLogistics = { accommodations: [], shuttles: [], parking: "", accessibility: "", weatherFallback: "", emergencyContacts: [], packing: [] };
  const timeline = (Array.isArray(value.timeline) ? value.timeline : []).map(defaults);
  const isLegacyWeddingSeed = value.universe === "Mariage"
    && timeline.length < 20
    && ["t1", "t2", "dj3"].every(id => timeline.some(event => event.id === id));
  const enrichedTimeline = isLegacyWeddingSeed
    ? [
        ...timeline,
        ...generateWeddingTimeline(value.pivot.value, value.universe, value.subtitle || "")
          .filter(candidate => !timeline.some(event => event.id === candidate.id)),
      ]
    : timeline;

  return {
    ...value,
    heroVisual: normalizeWorldVisual(value.heroVisual),
    /* Repli déterministe : tout Monde normalisé repart avec une page
       composée (celle du kit si aucune n'était stockée) — jamais une page
       vide. Les blocs ne portant que des liaisons, ce repli ne copie rien. */
    publicPage: normalizePublicPage(value.publicPage),
    heroVisuals: value.heroVisuals
      ? {
          avant: normalizeWorldVisual(value.heroVisuals.avant),
          pendant: normalizeWorldVisual(value.heroVisuals.pendant),
          apres: normalizeWorldVisual(value.heroVisuals.apres),
        }
      : value.heroVisuals,
    schemaVersion: TIMELINE_SCHEMA_VERSION,
    storyVersion: value.universe === "Mariage" ? 1 : value.storyVersion,
    timeline: enrichedTimeline.sort((a, b) => a.time - b.time),
    tables: Array.isArray(value.tables) ? value.tables : [], communications: Array.isArray(value.communications) ? value.communications : [],
    tasks: (Array.isArray(value.tasks) ? value.tasks : []).map(task => ({ ...task, priority: task.priority || "normale", status: task.status || "a_faire", phase: task.phase || "1-3m" })),
    guests: (Array.isArray(value.guests) ? value.guests : []).map(guest => ({ ...guest, attendance: guest.attendance || { ceremony: true, cocktail: true, dinner: true, brunch: false }, rsvp: guest.rsvp || "en_attente", role: guest.role || "invite" })),
    providers: (Array.isArray(value.providers) ? value.providers : []).map(provider => ({ ...provider, status: provider.status || "recherche" })),
    payments: Array.isArray(value.payments) ? value.payments : [], documents: Array.isArray(value.documents) ? value.documents : [],
    media: Array.isArray(value.media) ? value.media : [], messages: Array.isArray(value.messages) ? value.messages : [],
    ceremony: { ...emptyCeremony, ...(value.ceremony || {}) },
    music: (Array.isArray(value.music) ? value.music : []).map(track => ({ ...track, provenance: track.provenance ?? "demo", timelineEventIds: track.timelineEventIds || [] })),
    team: (Array.isArray(value.team) ? value.team : []).map(member => ({ ...member, responsibilities: Array.isArray(member.responsibilities) ? member.responsibilities : [], tasks: Array.isArray(member.tasks) ? member.tasks : [] })),
    /*
     * 14/09 : la checklist des souvenirs était lue par le panneau Documents
     * sans jamais exister dans le type ni dans les données — `undefined`,
     * donc `.filter` plantait. Un projet enregistré avant ce réglage la
     * reçoit vide plutôt que de faire tomber le panneau.
     */
    memoryChecklist: Array.isArray(value.memoryChecklist) ? value.memoryChecklist : [],
    memories: Array.isArray(value.memories) ? value.memories : [],
    messageTemplates: Array.isArray(value.messageTemplates) ? value.messageTemplates : [], messageLogs: Array.isArray(value.messageLogs) ? value.messageLogs : [],
    guestsCount: value.guestsCount ?? { value: null, confidence: "manquant" }, budget: value.budget ?? { value: null, confidence: "manquant" },
    persona: value.persona === "pro" ? "pro" : "couple",
    currency: typeof value.currency === "string" && value.currency ? value.currency : "EUR",
    city: value.city ?? { value: null, confidence: "manquant" }, venue: value.venue ?? { value: null, confidence: "manquant" },
    logistics: { ...emptyLogistics, ...(value.logistics || {}) }, missing: Array.isArray(value.missing) ? value.missing : [],
    universal: (value as any).universal ? {
      actorKind: (value as any).universal.actorKind,
      actorLabel: typeof (value as any).universal.actorLabel === "string" ? (value as any).universal.actorLabel : String((value as any).universal.actorKind ?? ""),
      actorDetail: typeof (value as any).universal.actorDetail === "string" ? (value as any).universal.actorDetail : undefined,
      intention: Array.isArray((value as any).universal.intention) ? (value as any).universal.intention : [],
      intentionLabels: Array.isArray((value as any).universal.intentionLabels) ? (value as any).universal.intentionLabels : undefined,
      situation: Array.isArray((value as any).universal.situation) ? (value as any).universal.situation : [],
      situationFree: typeof (value as any).universal.situationFree === "string" ? (value as any).universal.situationFree : undefined,
      ecosystem: Array.isArray((value as any).universal.ecosystem) ? (value as any).universal.ecosystem : [],
      facts: Array.isArray((value as any).universal.facts) ? (value as any).universal.facts : [],
      createdAt: typeof (value as any).universal.createdAt === "number" ? (value as any).universal.createdAt : Date.now(),
      nextQuestion: typeof (value as any).universal.nextQuestion === "string" ? (value as any).universal.nextQuestion : undefined,
    } : undefined,
    trajectory: (value as any).trajectory ? {
      id: String((value as any).trajectory.id),
      worldId: typeof (value as any).trajectory.worldId === "string" ? (value as any).trajectory.worldId : undefined,
      current: Array.isArray((value as any).trajectory.current) ? (value as any).trajectory.current : [],
      desired: Array.isArray((value as any).trajectory.desired) ? (value as any).trajectory.desired : [],
      gaps: Array.isArray((value as any).trajectory.gaps) ? (value as any).trajectory.gaps : [],
      steps: Array.isArray((value as any).trajectory.steps) ? (value as any).trajectory.steps : [],
      proofs: Array.isArray((value as any).trajectory.proofs) ? (value as any).trajectory.proofs : [],
      decisions: Array.isArray((value as any).trajectory.decisions) ? (value as any).trajectory.decisions : [],
      disclaimer: typeof (value as any).trajectory.disclaimer === "string" ? (value as any).trajectory.disclaimer : "",
    } : undefined,
    modulesProposed: Array.isArray((value as any).modulesProposed) ? (value as any).modulesProposed : undefined,
  };
}
