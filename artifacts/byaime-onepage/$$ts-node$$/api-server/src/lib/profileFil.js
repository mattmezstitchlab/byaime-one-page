"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAuthorizedProfileFil = buildAuthorizedProfileFil;
var weddingBrief_1 = require("./weddingBrief");
var records = function (value) {
    return Array.isArray(value) ? value.filter(function (item) { return Boolean(item) && typeof item === "object"; }) : [];
};
var text = function (value) { return typeof value === "string" && value.trim() ? value.trim() : undefined; };
var number = function (value) { return typeof value === "number" && Number.isFinite(value) ? value : undefined; };
function eventVisibleToRole(event, role) {
    var _a, _b;
    var visibility = (_a = text(event.visibility)) !== null && _a !== void 0 ? _a : "prive";
    var financial = ["paiement", "facture", "devis"].includes((_b = text(event.kind)) !== null && _b !== void 0 ? _b : "");
    if (financial && role !== "owner")
        return false;
    if (role === "owner")
        return true;
    if (role === "planner" || role === "family")
        return visibility !== "prive";
    return visibility === "audience";
}
function cardVisibility(value) {
    return value === "equipe" || value === "audience" ? value : "prive";
}
function dateLabel(value) {
    return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(value);
}
function buildAuthorizedProfileFil(input) {
    var _a;
    var now = (_a = input.now) !== null && _a !== void 0 ? _a : Date.now();
    var data = input.data && typeof input.data === "object" ? input.data : {};
    var timeline = records(data.timeline);
    var visibleEvents = timeline.filter(function (event) {
        return text(event.confidence) === "confirme"
            && text(event.provenance) !== "demo"
            && eventVisibleToRole(event, input.role);
    });
    var eventById = new Map(timeline.map(function (event) { return [text(event.id), event]; }));
    var brief = (0, weddingBrief_1.buildAuthorizedWeddingBrief)({
        projectId: input.projectId,
        title: input.title,
        data: data,
        role: input.role,
        useWorldLocation: false,
        now: now,
    });
    var cards = brief.segments
        .filter(function (segment) { return segment.id !== "brief-introduction" && segment.id !== "brief-empty" && segment.source.collection !== "task"; })
        .map(function (segment) {
        var sourceCollection = segment.source.collection;
        var sourceEvent = sourceCollection === "timeline" ? eventById.get(segment.source.id) : undefined;
        var type = segment.kind === "alert"
            ? "alert"
            : segment.kind === "suggestion" ? "suggestion" : "fact";
        var priority = segment.kind === "alert" ? "high" : segment.kind === "suggestion" ? "low" : "normal";
        var action = sourceCollection === "timeline"
            ? { kind: "open_timeline", label: "Voir dans la Timeline", targetId: segment.source.id }
            : { kind: "open_world", label: "Ouvrir mon Monde" };
        return {
            id: "fil-".concat(segment.id),
            category: segment.kind === "alert" ? "now" : "world",
            type: type,
            title: segment.title,
            summary: segment.narration,
            priority: priority,
            reason: "Affich\u00E9 \u00E0 partir de ".concat(segment.source.label, ", une source que votre r\u00F4le peut consulter."),
            source: {
                collection: sourceCollection,
                id: segment.source.id,
                label: segment.source.label,
            },
            action: action,
            visibility: sourceEvent ? cardVisibility(sourceEvent.visibility) : "prive",
            status: "active",
            evidenceStatus: segment.evidenceStatus,
        };
    });
    if (input.role !== "viewer") {
        var pendingTasks = records(data.tasks)
            .flatMap(function (task) {
            var id = text(task.id);
            var title = text(task.title);
            var status = text(task.status);
            return id && title && status !== "termine"
                ? [{ id: id, title: title, priority: text(task.priority), dueDate: number(task.dueDate) }]
                : [];
        })
            .sort(function (a, b) {
            var _a, _b;
            var importance = function (value) { return value === "haute" ? 0 : value === "normale" ? 1 : 2; };
            return importance(a.priority) - importance(b.priority)
                || ((_a = a.dueDate) !== null && _a !== void 0 ? _a : Number.MAX_SAFE_INTEGER) - ((_b = b.dueDate) !== null && _b !== void 0 ? _b : Number.MAX_SAFE_INTEGER);
        })
            .slice(0, 4);
        cards.push.apply(cards, pendingTasks.map(function (task) { return ({
            id: "fil-task-".concat(task.id),
            category: "now",
            type: "task",
            title: task.title,
            summary: task.dueDate === undefined
                ? "Cette étape reste à organiser dans votre Monde."
                : "Cette \u00E9tape est pr\u00E9vue pour le ".concat(dateLabel(task.dueDate), "."),
            priority: task.priority === "haute" ? "high" : task.priority === "basse" ? "low" : "normal",
            reason: "Cette carte apparaît parce que cette étape n’est pas encore terminée.",
            source: { collection: "task", id: task.id, label: task.title },
            action: { kind: "open_world", label: "Ouvrir mon Monde" },
            visibility: "equipe",
            status: "active",
            evidenceStatus: "verified",
        }); }));
    }
    if (visibleEvents.length === 0) {
        cards.push({
            id: "fil-guide-first-moment",
            category: "learn",
            type: "tutorial",
            title: "Relier un premier Moment",
            summary: "Ajoutez une date, une décision ou un souvenir confirmé pour commencer la Timeline du Profil.",
            priority: "low",
            reason: "Aucun Moment confirmé et visible par votre rôle n’est encore présent.",
            source: { collection: "guide", id: "timeline-first-moment-v1", label: "Guide AIME · Timeline" },
            action: { kind: input.role === "viewer" ? "none" : "open_world", label: input.role === "viewer" ? "Consultation uniquement" : "Ajouter dans mon Monde" },
            visibility: "prive",
            status: "active",
            evidenceStatus: "verified",
        });
    }
    if (input.role !== "viewer" && !records(data.tasks).some(function (task) { return text(task.status) !== "termine"; })) {
        cards.push({
            id: "fil-guide-first-task",
            category: "learn",
            type: "tutorial",
            title: "Préparer la prochaine étape",
            summary: "Créez une étape concrète, puis attribuez-la à la bonne personne et à la bonne période.",
            priority: "low",
            reason: "Aucune étape à faire n’est actuellement enregistrée dans ce Monde.",
            source: { collection: "guide", id: "planning-first-task-v1", label: "Guide AIME · Organisation" },
            action: { kind: "open_world", label: "Ouvrir mon Monde" },
            visibility: "equipe",
            status: "active",
            evidenceStatus: "verified",
        });
    }
    var priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    cards.sort(function (a, b) { return priorityOrder[a.priority] - priorityOrder[b.priority] || a.id.localeCompare(b.id); });
    return {
        projectId: input.projectId,
        role: input.role,
        generatedAt: now,
        cards: cards,
    };
}
//# sourceMappingURL=profileFil.js.map