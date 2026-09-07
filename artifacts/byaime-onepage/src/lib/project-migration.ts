import type { TimelineEvent, WorldProject } from "./types";
import { generateWeddingTimeline } from "./seed-data";
import { TIMELINE_SCHEMA_VERSION } from "./timeline-graph";

const defaults = (event: TimelineEvent): TimelineEvent => ({
  ...event,
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
    team: Array.isArray(value.team) ? value.team : [], memories: Array.isArray(value.memories) ? value.memories : [],
    messageTemplates: Array.isArray(value.messageTemplates) ? value.messageTemplates : [], messageLogs: Array.isArray(value.messageLogs) ? value.messageLogs : [],
    guestsCount: value.guestsCount ?? { value: null, confidence: "manquant" }, budget: value.budget ?? { value: null, confidence: "manquant" },
    city: value.city ?? { value: null, confidence: "manquant" }, venue: value.venue ?? { value: null, confidence: "manquant" },
    logistics: { ...emptyLogistics, ...(value.logistics || {}) }, missing: Array.isArray(value.missing) ? value.missing : [],
  };
}