export const TIMELINE_SCHEMA_VERSION = 2;
const key = (kind, id) => `${kind}:${id}`;
const collections = [
    ["guest", "guests"], ["table", "tables"], ["provider", "providers"], ["task", "tasks"],
    ["payment", "payments"], ["document", "documents"], ["music", "music"], ["team", "team"],
    ["message", "messageLogs"], ["memory", "memories"],
];
export function buildTimelineIndex(project) {
    const entities = new Map();
    for (const [kind, collection] of collections) {
        const values = project[collection];
        if (!Array.isArray(values))
            continue;
        for (const value of values) {
            entities.set(key(kind, value.id), { kind, id: value.id, label: value.title || value.name || value.label || value.role || value.id, value });
        }
    }
    for (const value of project.messageTemplates) {
        entities.set(key("message", value.id), { kind: "message", id: value.id, label: value.title, value });
    }
    for (const item of [...project.logistics.accommodations, ...project.logistics.shuttles, ...project.logistics.emergencyContacts, ...project.logistics.packing]) {
        entities.set(key("logistics", item.id), { kind: "logistics", id: item.id, label: item.name || item.label || item.route || item.id, value: item });
    }
    const events = new Map(project.timeline.map(event => [event.id, event]));
    const reverse = new Map();
    for (const event of project.timeline)
        for (const relation of event.relations || []) {
            const relationKey = key(relation.kind, relation.id);
            reverse.set(relationKey, [...(reverse.get(relationKey) || []), event]);
        }
    return { entities, events, reverse };
}
export function eventsForEntity(project, kind, id) {
    return buildTimelineIndex(project).reverse.get(key(kind, id)) || [];
}
export function musicEventIdsForTrack(project, trackId) {
    const track = project.music.find(item => item.id === trackId);
    const ids = [
        ...(track?.timelineEventIds || []),
        ...project.timeline
            .filter(event => event.relations?.some(relation => relation.kind === "music" && relation.id === trackId))
            .map(event => event.id),
    ];
    return [...new Set(ids)].filter(id => project.timeline.some(event => event.id === id));
}
export function linkMusicTrackToEvents(project, trackId, eventIds) {
    const track = project.music.find(item => item.id === trackId);
    if (!track)
        throw new Error("Morceau introuvable");
    const selectedIds = new Set(eventIds.filter(id => project.timeline.some(event => event.id === id)));
    return {
        ...project,
        music: project.music.map(item => item.id === trackId
            ? { ...item, timelineEventIds: [...selectedIds] }
            : item),
        timeline: project.timeline.map(event => {
            const relations = (event.relations || []).filter(relation => !(relation.kind === "music" && relation.id === trackId));
            return selectedIds.has(event.id)
                ? { ...event, relations: [...relations, { kind: "music", id: trackId, role: "bande-son" }] }
                : { ...event, relations };
        }),
    };
}
export function findTimelineConflicts(events) {
    const sorted = [...events].sort((a, b) => a.time - b.time);
    const conflicts = [];
    for (let i = 0; i < sorted.length; i++)
        for (let j = i + 1; j < sorted.length; j++) {
            const a = sorted[i], b = sorted[j];
            const aEnd = a.endTime ?? a.time + (a.durationMinutes || 0) * 60000;
            if (b.time >= aEnd || aEnd <= a.time)
                break;
            const sharedResource = (a.resources || []).find(resource => (b.resources || []).includes(resource));
            const shared = (a.relations || []).find(r => ["guest", "team", "provider"].includes(r.kind) && (b.relations || []).some(x => x.kind === r.kind && x.id === r.id));
            if (sharedResource)
                conflicts.push({ eventIds: [a.id, b.id], type: "resource", message: `Ressource « ${sharedResource} » réservée simultanément` });
            else if (shared)
                conflicts.push({ eventIds: [a.id, b.id], type: shared.kind === "provider" ? "provider" : "person", message: `${shared.kind === "provider" ? "Prestataire" : "Personne"} mobilisé simultanément` });
        }
    return conflicts;
}
export function analyzeEventImpact(project, eventId, patch) {
    const event = project.timeline.find(item => item.id === eventId);
    if (!event)
        throw new Error("Événement introuvable");
    const changed = ["time", "endTime", "durationMinutes", "location"].filter(field => patch[field] !== undefined && patch[field] !== event[field]);
    const relations = (event.relations || []).map(relation => buildTimelineIndex(project).entities.get(key(relation.kind, relation.id))).filter(Boolean);
    const candidate = { ...event, ...patch };
    const conflicts = findTimelineConflicts(project.timeline.map(item => item.id === eventId ? candidate : item)).filter(c => c.eventIds.includes(eventId));
    return { event, candidate, changed, relations, dependents: project.timeline.filter(item => item.dependencyIds?.includes(eventId)), conflicts };
}
const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
function contactEmail(value) {
    if (typeof value !== "string")
        return undefined;
    return value.match(emailPattern)?.[0];
}
export function audiencesForTimelineEvents(project, eventIds) {
    const index = buildTimelineIndex(project);
    const seen = new Map();
    for (const eventId of eventIds) {
        const event = index.events.get(eventId);
        if (!event)
            continue;
        for (const relation of event.relations || []) {
            if (!["guest", "team", "provider"].includes(relation.kind))
                continue;
            const entity = index.entities.get(key(relation.kind, relation.id));
            if (!entity)
                continue;
            const email = contactEmail(entity.value.contact);
            const audienceKey = email?.toLocaleLowerCase("fr") || `${relation.kind}:${relation.id}`;
            const previous = seen.get(audienceKey);
            const reason = `${event.title}${relation.role ? ` · ${relation.role}` : ""}`;
            if (previous) {
                if (!previous.reason.includes(event.title))
                    previous.reason = `${previous.reason}, ${reason}`;
                continue;
            }
            seen.set(audienceKey, {
                id: relation.id,
                kind: relation.kind,
                label: entity.label,
                email,
                reason,
            });
        }
    }
    return [...seen.values()];
}
export function planEventPropagation(project, eventId, patch) {
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
export function applyPropagationPlan(project, plan, confirmed, selectedDependentIds = []) {
    if (!confirmed)
        throw new Error("Confirmation explicite requise");
    const source = project.timeline.find(event => event.id === plan.eventId);
    if (!source)
        throw new Error("Événement introuvable");
    const selected = new Set(selectedDependentIds);
    const sourcePatch = plan.patch.time !== undefined && source.endTime !== undefined && plan.patch.endTime === undefined
        ? { ...plan.patch, endTime: source.endTime + plan.timeDeltaMs }
        : plan.patch;
    return {
        ...project,
        timeline: project.timeline.map(event => {
            if (event.id === plan.eventId) {
                return { ...event, ...sourcePatch, propagation: { state: "applied", lastAppliedAt: Date.now(), sourceEventId: event.id } };
            }
            if (!selected.has(event.id) || !plan.dependentChanges.some(change => change.eventId === event.id))
                return event;
            return {
                ...event,
                time: event.time + plan.timeDeltaMs,
                ...(event.endTime === undefined ? {} : { endTime: event.endTime + plan.timeDeltaMs }),
                propagation: { state: "applied", lastAppliedAt: Date.now(), sourceEventId: plan.eventId },
            };
        }),
    };
}
export function filterTimeline(project, view) {
    if (view === "chronological")
        return [...project.timeline].sort((a, b) => a.time - b.time);
    if (view === "public-info")
        return project.timeline.filter(event => event.visibility === "audience").sort((a, b) => a.time - b.time);
    if (view === "map")
        return [];
    if (view === "day-of")
        return project.timeline.filter(e => e.phase === "pendant").sort((a, b) => a.time - b.time);
    const kinds = {
        person: ["guest", "team"], provider: ["provider"], music: ["music"], logistics: ["logistics", "table"],
        collaborative: ["team", "message"], memories: ["memory"],
    };
    return project.timeline.filter(event => event.relations?.some(relation => kinds[view].includes(relation.kind))).sort((a, b) => a.time - b.time);
}
export function auditTimelineConnections(project) {
    const index = buildTimelineIndex(project);
    const dangling = [];
    for (const event of project.timeline)
        for (const relation of event.relations || []) {
            if (!index.entities.has(key(relation.kind, relation.id)))
                dangling.push({ eventId: event.id, relation });
        }
    const isolated = [...index.entities.values()].filter(entity => !index.reverse.has(key(entity.kind, entity.id)));
    const manualMusic = project.music.filter(track => !track.external);
    return { connected: index.reverse.size, isolated, dangling, manualMusic, integrationRequired: manualMusic.length > 0 };
}
//# sourceMappingURL=timeline-graph.js.map