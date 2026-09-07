import type { TimelineEntityKind, TimelineEvent, TimelineRelation, WorldProject } from "./types";

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

export type TimelineView = "chronological" | "day-of" | "person" | "provider" | "music" | "logistics" | "collaborative" | "memories";
export function filterTimeline(project: WorldProject, view: TimelineView) {
  if (view === "chronological") return [...project.timeline].sort((a, b) => a.time - b.time);
  if (view === "day-of") return project.timeline.filter(e => e.phase === "pendant").sort((a, b) => a.time - b.time);
  const kinds: Record<Exclude<TimelineView, "chronological" | "day-of">, TimelineEntityKind[]> = {
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