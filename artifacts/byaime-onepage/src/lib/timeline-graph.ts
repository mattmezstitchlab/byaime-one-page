import type { TimelineEntityKind, TimelineEvent, TimelinePhase, TimelineRelation, TimelineVisibility, WorldProject } from "./types";

export const TIMELINE_SCHEMA_VERSION = 2 as const;

export type EntityRecord = { kind: TimelineEntityKind; id: string; label: string; value: unknown };
export type TimelineIndex = {
  entities: Map<string, EntityRecord>;
  events: Map<string, TimelineEvent>;
  reverse: Map<string, TimelineEvent[]>;
};

const key = (kind: TimelineEntityKind, id: string) => `${kind}:${id}`;
const collections: Array<[TimelineEntityKind, keyof WorldProject]> = [
  ["guest", "guests"], ["table", "tables"], ["provider", "providers"], ["task", "tasks"],
  ["payment", "payments"], ["document", "documents"], ["music", "music"], ["team", "team"],
  ["message", "messageLogs"], ["memory", "memories"],
];

export function buildTimelineIndex(project: WorldProject): TimelineIndex {
  const entities = new Map<string, EntityRecord>();
  for (const [kind, collection] of collections) {
    const values = project[collection];
    if (!Array.isArray(values)) continue;
    for (const value of values as Array<{ id: string; title?: string; name?: string; label?: string; role?: string }>) {
      entities.set(key(kind, value.id), { kind, id: value.id, label: value.title || value.name || value.label || value.role || value.id, value });
    }
  }
  for (const value of project.messageTemplates) {
    entities.set(key("message", value.id), { kind: "message", id: value.id, label: value.title, value });
  }
  for (const item of [...project.logistics.accommodations, ...project.logistics.shuttles, ...project.logistics.emergencyContacts, ...project.logistics.packing] as Array<{ id: string; name?: string; label?: string; route?: string }>) {
    entities.set(key("logistics", item.id), { kind: "logistics", id: item.id, label: item.name || item.label || item.route || item.id, value: item });
  }
  const events = new Map(project.timeline.map(event => [event.id, event]));
  const reverse = new Map<string, TimelineEvent[]>();
  for (const event of project.timeline) for (const relation of event.relations || []) {
    const relationKey = key(relation.kind, relation.id);
    reverse.set(relationKey, [...(reverse.get(relationKey) || []), event]);
  }
  return { entities, events, reverse };
}

export function eventsForEntity(project: WorldProject, kind: TimelineEntityKind, id: string) {
  return buildTimelineIndex(project).reverse.get(key(kind, id)) || [];
}

export function musicEventIdsForTrack(project: WorldProject, trackId: string): string[] {
  const track = project.music.find(item => item.id === trackId);
  const ids = [
    ...(track?.timelineEventIds || []),
    ...project.timeline
      .filter(event => event.relations?.some(relation => relation.kind === "music" && relation.id === trackId))
      .map(event => event.id),
  ];
  return [...new Set(ids)].filter(id => project.timeline.some(event => event.id === id));
}

export function linkMusicTrackToEvents(project: WorldProject, trackId: string, eventIds: string[]): WorldProject {
  const track = project.music.find(item => item.id === trackId);
  if (!track) throw new Error("Morceau introuvable");
  const selectedIds = new Set(eventIds.filter(id => project.timeline.some(event => event.id === id)));
  return {
    ...project,
    music: project.music.map(item => item.id === trackId
      ? { ...item, timelineEventIds: [...selectedIds] }
      : item),
    timeline: project.timeline.map(event => {
      const relations = (event.relations || []).filter(relation => !(relation.kind === "music" && relation.id === trackId));
      return selectedIds.has(event.id)
        ? { ...event, relations: [...relations, { kind: "music" as const, id: trackId, role: "bande-son" }] }
        : { ...event, relations };
    }),
  };
}

export type TimelineConflict = { eventIds: [string, string]; type: "resource" | "person" | "provider"; message: string };
export function findTimelineConflicts(events: TimelineEvent[]): TimelineConflict[] {
  const sorted = [...events].sort((a, b) => a.time - b.time);
  const conflicts: TimelineConflict[] = [];
  for (let i = 0; i < sorted.length; i++) for (let j = i + 1; j < sorted.length; j++) {
    const a = sorted[i], b = sorted[j];
    const aEnd = a.endTime ?? a.time + (a.durationMinutes || 0) * 60000;
    if (b.time >= aEnd || aEnd <= a.time) break;
    const sharedResource = (a.resources || []).find(resource => (b.resources || []).includes(resource));
    const shared = (a.relations || []).find(r => ["guest", "team", "provider"].includes(r.kind) && (b.relations || []).some(x => x.kind === r.kind && x.id === r.id));
    if (sharedResource) conflicts.push({ eventIds: [a.id, b.id], type: "resource", message: `Ressource « ${sharedResource} » réservée simultanément` });
    else if (shared) conflicts.push({ eventIds: [a.id, b.id], type: shared.kind === "provider" ? "provider" : "person", message: `${shared.kind === "provider" ? "Prestataire" : "Personne"} mobilisé simultanément` });
  }
  return conflicts;
}

export function analyzeEventImpact(project: WorldProject, eventId: string, patch: Partial<TimelineEvent>) {
  const event = project.timeline.find(item => item.id === eventId);
  if (!event) throw new Error("Événement introuvable");
  const changed = (["time", "endTime", "durationMinutes", "location"] as const).filter(field => patch[field] !== undefined && patch[field] !== event[field]);
  const relations = (event.relations || []).map(relation => buildTimelineIndex(project).entities.get(key(relation.kind, relation.id))).filter(Boolean) as EntityRecord[];
  const candidate = { ...event, ...patch };
  const conflicts = findTimelineConflicts(project.timeline.map(item => item.id === eventId ? candidate : item)).filter(c => c.eventIds.includes(eventId));
  return { event, candidate, changed, relations, dependents: project.timeline.filter(item => item.dependencyIds?.includes(eventId)), conflicts };
}

export type PropagationPlan = {
  eventId: string;
  patch: Partial<TimelineEvent>;
  affectedEventIds: string[];
  timeDeltaMs: number;
  dependentChanges: Array<{ eventId: string; title: string; currentTime: number; nextTime: number }>;
  warnings: string[];
  requiresConfirmation: true;
};

export type EventAudience = {
  id: string;
  kind: Extract<TimelineEntityKind, "guest" | "team" | "provider">;
  label: string;
  email?: string;
  reason: string;
};

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

function contactEmail(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.match(emailPattern)?.[0];
}

export function audiencesForTimelineEvents(project: WorldProject, eventIds: string[]): EventAudience[] {
  const index = buildTimelineIndex(project);
  const seen = new Map<string, EventAudience>();
  for (const eventId of eventIds) {
    const event = index.events.get(eventId);
    if (!event) continue;
    for (const relation of event.relations || []) {
      if (!["guest", "team", "provider"].includes(relation.kind)) continue;
      const entity = index.entities.get(key(relation.kind, relation.id));
      if (!entity) continue;
      const email = contactEmail((entity.value as { contact?: unknown }).contact);
      const audienceKey = email?.toLocaleLowerCase("fr") || `${relation.kind}:${relation.id}`;
      const previous = seen.get(audienceKey);
      const reason = `${event.title}${relation.role ? ` · ${relation.role}` : ""}`;
      if (previous) {
        if (!previous.reason.includes(event.title)) previous.reason = `${previous.reason}, ${reason}`;
        continue;
      }
      seen.set(audienceKey, {
        id: relation.id,
        kind: relation.kind as EventAudience["kind"],
        label: entity.label,
        email,
        reason,
      });
    }
  }
  return [...seen.values()];
}
export function planEventPropagation(project: WorldProject, eventId: string, patch: Partial<TimelineEvent>): PropagationPlan {
  const impact = analyzeEventImpact(project, eventId, patch);
  const timeDeltaMs = patch.time === undefined ? 0 : patch.time - impact.event.time;
  const dependentChanges = timeDeltaMs === 0 ? [] : impact.dependents.map(event => ({
    eventId: event.id,
    title: event.title,
    currentTime: event.time,
    nextTime: event.time + timeDeltaMs,
  }));
  return {
    eventId, patch, affectedEventIds: [eventId, ...impact.dependents.map(item => item.id)],
    timeDeltaMs,
    dependentChanges,
    warnings: [...impact.conflicts.map(item => item.message)],
    requiresConfirmation: true,
  };
}

export function applyPropagationPlan(project: WorldProject, plan: PropagationPlan, confirmed: boolean, selectedDependentIds: string[] = []): WorldProject {
  if (!confirmed) throw new Error("Confirmation explicite requise");
  const source = project.timeline.find(event => event.id === plan.eventId);
  if (!source) throw new Error("Événement introuvable");
  const selected = new Set(selectedDependentIds);
  const sourcePatch = plan.patch.time !== undefined && source.endTime !== undefined && plan.patch.endTime === undefined
    ? { ...plan.patch, endTime: source.endTime + plan.timeDeltaMs }
    : plan.patch;
  return {
    ...project,
    timeline: project.timeline.map(event => {
      if (event.id === plan.eventId) {
        return { ...event, ...sourcePatch, propagation: { state: "applied" as const, lastAppliedAt: Date.now(), sourceEventId: event.id } };
      }
      if (!selected.has(event.id) || !plan.dependentChanges.some(change => change.eventId === event.id)) return event;
      return {
        ...event,
        time: event.time + plan.timeDeltaMs,
        ...(event.endTime === undefined ? {} : { endTime: event.endTime + plan.timeDeltaMs }),
        propagation: { state: "applied" as const, lastAppliedAt: Date.now(), sourceEventId: plan.eventId },
      };
    }),
  };
}

export type TimelineView = "chronological" | "public-info" | "map" | "day-of" | "person" | "provider" | "music" | "logistics" | "collaborative" | "memories";
export function filterTimeline(project: WorldProject, view: TimelineView) {
  if (view === "chronological") return [...project.timeline].sort((a, b) => a.time - b.time);
  if (view === "public-info") return project.timeline.filter(event => event.visibility === "audience").sort((a, b) => a.time - b.time);
  if (view === "map") return [];
  if (view === "day-of") return project.timeline.filter(e => e.phase === "pendant").sort((a, b) => a.time - b.time);
  const kinds: Record<Exclude<TimelineView, "chronological" | "public-info" | "map" | "day-of">, TimelineEntityKind[]> = {
    person: ["guest", "team"], provider: ["provider"], music: ["music"], logistics: ["logistics", "table"],
    collaborative: ["team", "message"], memories: ["memory"],
  };
  return project.timeline.filter(event => event.relations?.some(relation => kinds[view].includes(relation.kind))).sort((a, b) => a.time - b.time);
}

export function auditTimelineConnections(project: WorldProject) {
  const index = buildTimelineIndex(project);
  const dangling: Array<{ eventId: string; relation: TimelineRelation }> = [];
  for (const event of project.timeline) for (const relation of event.relations || []) {
    if (!index.entities.has(key(relation.kind, relation.id))) dangling.push({ eventId: event.id, relation });
  }
  const isolated = [...index.entities.values()].filter(entity => !index.reverse.has(key(entity.kind, entity.id)));
  const manualMusic = project.music.filter(track => !track.external);
  return { connected: index.reverse.size, isolated, dangling, manualMusic, integrationRequired: manualMusic.length > 0 };
}

/* ————————————————————————————————————————————————
   Visibilité par rôle — le même Monde, vu selon les frontières de chaque rôle.
   Règles documentées dans l'interface : un Invité ne voit que ce qui est relié à
   un Moment publié à l'audience ; les finances et documents restent réservés.
———————————————————————————————————————————————— */

export type RoleVisibility = "owner" | "planner" | "family" | "viewer";

export const ENTITY_KIND_LABELS: Record<TimelineEntityKind, string> = {
  guest: "Invité",
  table: "Table",
  provider: "Prestataire",
  task: "Tâche",
  payment: "Paiement",
  document: "Document",
  music: "Musique",
  team: "Équipe",
  message: "Message",
  logistics: "Logistique",
  memory: "Souvenir",
};

export function roleCanSeeEvent(role: RoleVisibility, event: TimelineEvent): boolean {
  const visibility: TimelineVisibility = event.visibility ?? "equipe";
  if (role === "viewer") return visibility === "audience";
  if (role === "family") return visibility !== "prive";
  return true;
}

export function roleCanSeeEntityKind(role: RoleVisibility, kind: TimelineEntityKind): boolean {
  if (kind === "payment" || kind === "document") return role === "owner" || role === "planner";
  if (kind === "message") return role !== "viewer";
  return true;
}

export type VisibilityNode = {
  key: string;
  kind: TimelineEntityKind | "event";
  label: string;
  visible: boolean;
  phase?: TimelinePhase;
  time?: number;
  maskedReason?: string;
};

export type VisibilityEdge = { from: string; to: string; visible: boolean; role?: string };

export type VisibilityModel = {
  nodes: VisibilityNode[];
  edges: VisibilityEdge[];
  visibleCount: number;
  totalCount: number;
};

const entityKeyOf = (kind: TimelineEntityKind, id: string) => `${kind}:${id}`;

export function computeVisibilityModel(project: WorldProject, role: RoleVisibility): VisibilityModel {
  const index = buildTimelineIndex(project);

  const eventNodes: VisibilityNode[] = [...project.timeline]
    .sort((a, b) => a.time - b.time)
    .map(event => {
      const visible = roleCanSeeEvent(role, event);
      const visibility: TimelineVisibility = event.visibility ?? "equipe";
      return {
        key: `event:${event.id}`,
        kind: "event",
        label: event.title,
        visible,
        phase: event.phase,
        time: event.time,
        maskedReason: visible
          ? undefined
          : visibility === "prive"
            ? "privé"
            : visibility === "equipe"
              ? "équipe uniquement"
              : "non publié à l'audience",
      };
    });

  const entityVisibility = new Map<string, boolean>();
  const entityNodes: VisibilityNode[] = [...index.entities.values()].map(entity => {
    const entityKey = entityKeyOf(entity.kind, entity.id);
    const kindVisible = roleCanSeeEntityKind(role, entity.kind);
    let visible = kindVisible;
    let maskedReason: string | undefined;
    if (!kindVisible) {
      maskedReason = entity.kind === "payment" || entity.kind === "document"
        ? "finances / documents réservés"
        : "non partagé avec ce rôle";
    } else if (role === "viewer") {
      const linkedEvents = index.reverse.get(entityKey) || [];
      const hasPublicLink = linkedEvents.some(event => roleCanSeeEvent(role, event));
      if (!hasPublicLink) {
        visible = false;
        maskedReason = "non relié à un Moment public";
      }
    }
    entityVisibility.set(entityKey, visible);
    return { key: entityKey, kind: entity.kind, label: entity.label, visible, maskedReason };
  });

  const nodes = [...eventNodes, ...entityNodes];
  const edges: VisibilityEdge[] = [];
  for (const event of project.timeline) {
    const eventVisible = roleCanSeeEvent(role, event);
    for (const relation of event.relations || []) {
      const to = entityKeyOf(relation.kind, relation.id);
      if (!entityVisibility.has(to)) continue;
      edges.push({
        from: `event:${event.id}`,
        to,
        visible: eventVisible && entityVisibility.get(to) === true,
        role: relation.role,
      });
    }
  }

  const visibleCount = nodes.filter(node => node.visible).length;
  return { nodes, edges, visibleCount, totalCount: nodes.length };
}