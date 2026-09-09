"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAuthorizedWeddingBrief = buildAuthorizedWeddingBrief;
var records = function (value) {
    return Array.isArray(value) ? value.filter(function (item) { return Boolean(item) && typeof item === "object"; }) : [];
};
var text = function (value) { return typeof value === "string" && value.trim() ? value.trim() : undefined; };
var number = function (value) { return typeof value === "number" && Number.isFinite(value) ? value : undefined; };
var date = function (value) { return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(value); };
var euros = function (cents) { return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(cents / 100); };
function factValue(value) {
    if (!value || typeof value !== "object")
        return {};
    var row = value;
    return { value: text(row.value), confidence: text(row.confidence) };
}
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
function verifiedEvent(event) {
    return text(event.confidence) === "confirme" && text(event.provenance) !== "demo";
}
function buildAuthorizedWeddingBrief(input) {
    var _a;
    var now = (_a = input.now) !== null && _a !== void 0 ? _a : Date.now();
    var data = input.data && typeof input.data === "object" ? input.data : {};
    var events = records(data.timeline)
        .filter(function (event) { return text(event.phase) === "avant" && verifiedEvent(event) && eventVisibleToRole(event, input.role); })
        .sort(function (a, b) { var _a, _b; return ((_a = number(a.time)) !== null && _a !== void 0 ? _a : 0) - ((_b = number(b.time)) !== null && _b !== void 0 ? _b : 0); });
    var segments = [{
            id: "brief-introduction",
            kind: "transition",
            title: "Point de situation",
            narration: "Voici o\u00F9 en est ".concat(input.title, ", \u00E0 partir des informations confirm\u00E9es que vous pouvez consulter."),
            source: { collection: "project", id: input.projectId, label: input.title },
            supportingSources: [],
            evidenceStatus: "verified",
        }];
    var completed = events.filter(function (event) { var _a; return text(event.status) === "execute" && ((_a = number(event.time)) !== null && _a !== void 0 ? _a : Number.MAX_SAFE_INTEGER) <= now; }).at(-1);
    var completedTime = completed ? number(completed.time) : undefined;
    var completedId = completed ? text(completed.id) : undefined;
    var completedTitle = completed ? text(completed.title) : undefined;
    if (completed && completedId && completedTitle && completedTime !== undefined) {
        segments.push({
            id: "completed-".concat(completedId),
            kind: "fact",
            title: "Dernière étape marquée comme terminée",
            narration: "".concat(completedTitle, " est termin\u00E9 dans le Monde. Ce Moment \u00E9tait planifi\u00E9 pour le ").concat(date(completedTime), "."),
            source: { collection: "timeline", id: completedId, label: completedTitle },
            supportingSources: [],
            at: completedTime,
            evidenceStatus: "verified",
        });
    }
    var next = events.find(function (event) { var _a; return ((_a = number(event.time)) !== null && _a !== void 0 ? _a : 0) >= now && text(event.status) !== "execute"; });
    var nextTime = next ? number(next.time) : undefined;
    var nextId = next ? text(next.id) : undefined;
    var nextTitle = next ? text(next.title) : undefined;
    if (next && nextId && nextTitle && nextTime !== undefined) {
        segments.push({
            id: "next-".concat(nextId),
            kind: "fact",
            title: "Prochain Moment",
            narration: "".concat(nextTitle, " est pr\u00E9vu le ").concat(date(nextTime), "."),
            source: { collection: "timeline", id: nextId, label: nextTitle },
            supportingSources: [],
            at: nextTime,
            evidenceStatus: "verified",
        });
    }
    var blocked = events.find(function (event) { var _a; return ["bloque", "echoue"].includes((_a = text(event.status)) !== null && _a !== void 0 ? _a : ""); });
    var blockedId = blocked ? text(blocked.id) : undefined;
    var blockedTitle = blocked ? text(blocked.title) : undefined;
    if (blocked && blockedId && blockedTitle) {
        segments.push(__assign(__assign({ id: "blocked-".concat(blockedId), kind: "alert", title: "Un point demande votre attention", narration: "".concat(blockedTitle, " est signal\u00E9 comme ").concat(text(blocked.status) === "bloque" ? "bloqué" : "en échec", "."), source: { collection: "timeline", id: blockedId, label: blockedTitle }, supportingSources: [] }, (number(blocked.time) === undefined ? {} : { at: number(blocked.time) })), { evidenceStatus: "verified" }));
    }
    if (input.role === "owner") {
        var pendingTask = records(data.tasks)
            .filter(function (task) { return text(task.status) !== "termine"; })
            .sort(function (a, b) { var _a, _b; return ((_a = number(a.dueDate)) !== null && _a !== void 0 ? _a : Number.MAX_SAFE_INTEGER) - ((_b = number(b.dueDate)) !== null && _b !== void 0 ? _b : Number.MAX_SAFE_INTEGER); })[0];
        var taskId = pendingTask ? text(pendingTask.id) : undefined;
        var taskTitle = pendingTask ? text(pendingTask.title) : undefined;
        if (pendingTask && taskId && taskTitle) {
            var due = number(pendingTask.dueDate);
            segments.push(__assign(__assign({ id: "task-".concat(taskId), kind: text(pendingTask.priority) === "haute" ? "alert" : "fact", title: "À préparer", narration: "".concat(taskTitle).concat(due === undefined ? " reste à organiser" : " est attendu pour le ".concat(date(due)), "."), source: { collection: "task", id: taskId, label: taskTitle }, supportingSources: [] }, (due === undefined ? {} : { at: due })), { evidenceStatus: "verified" }));
        }
        var payments = records(data.payments).flatMap(function (payment) {
            var id = text(payment.id);
            var label = text(payment.label);
            var amountCents = number(payment.amountCents);
            var at = number(payment.at);
            var state = text(payment.state);
            return id && label && amountCents !== undefined && at !== undefined && (state === "paye" || state === "du")
                ? [{ id: id, label: label, amountCents: amountCents, at: at, state: state }]
                : [];
        });
        if (payments.length) {
            var paidTotal = payments.filter(function (payment) { return payment.state === "paye"; }).reduce(function (sum, payment) { return sum + payment.amountCents; }, 0);
            var dueTotal = payments.filter(function (payment) { return payment.state === "du"; }).reduce(function (sum, payment) { return sum + payment.amountCents; }, 0);
            var sources = payments.map(function (payment) { return ({
                collection: "payment",
                id: payment.id,
                label: payment.label,
                amountCents: payment.amountCents,
                paymentState: payment.state,
                recordedAt: payment.at,
            }); });
            segments.push({
                id: "financial-position",
                kind: "calculation",
                title: "Situation financière",
                narration: "".concat(euros(paidTotal), " sont marqu\u00E9s comme pay\u00E9s et ").concat(euros(dueTotal), " restent \u00E0 r\u00E9gler. Chaque montant vient des paiements enregistr\u00E9s."),
                source: sources[0],
                supportingSources: sources.slice(1),
                at: payments[0].at,
                evidenceStatus: "verified",
            });
        }
    }
    if (segments.length === 1) {
        segments.push({
            id: "brief-empty",
            kind: "suggestion",
            title: "Le récit commence ici",
            narration: "Aucun Moment confirmé et visible ne permet encore de raconter l’avancement sans rien inventer.",
            source: { collection: "project", id: input.projectId, label: input.title },
            supportingSources: [],
            evidenceStatus: "verified",
        });
    }
    var city = factValue(data.city);
    var venue = factValue(data.venue);
    var verifiedLocation = venue.confidence === "confirme" && venue.value
        ? venue.value
        : city.confidence === "confirme" && city.value ? city.value : undefined;
    var nearbyCategories = input.role === "owner" && input.useWorldLocation && verifiedLocation
        ? [
            { id: "nearby-decoration", label: "Décoration et fleurs", reason: "Catégorie à comparer avec les prestataires déjà réservés.", evidenceStatus: "unverified" },
            { id: "nearby-sound", label: "Son et matériel", reason: "Catégorie à rechercher auprès d’une source locale vérifiée.", evidenceStatus: "unverified" },
            { id: "nearby-transport", label: "Transport et location", reason: "Catégorie à rechercher auprès d’une source locale vérifiée.", evidenceStatus: "unverified" },
        ]
        : [];
    return {
        projectId: input.projectId,
        role: input.role,
        generatedAt: now,
        segments: segments,
        location: __assign({ available: input.role === "owner" && Boolean(verifiedLocation) }, (input.role === "owner" && input.useWorldLocation && verifiedLocation ? { label: verifiedLocation } : {})),
        nearbyCategories: nearbyCategories,
    };
}
//# sourceMappingURL=weddingBrief.js.map