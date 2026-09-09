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
exports.participantNameById = participantNameById;
exports.buildParticipantProjection = buildParticipantProjection;
function safeObject(value, fields) {
    var source = value && typeof value === "object" && !Array.isArray(value)
        ? value
        : {};
    return Object.fromEntries(fields.flatMap(function (field) {
        var fieldValue = source[field];
        return fieldValue === undefined ? [] : [[field, fieldValue]];
    }));
}
function factValue(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return value;
    return value.value;
}
function participantNameById(data, guestId) {
    if (!guestId || !data || typeof data !== "object" || Array.isArray(data))
        return undefined;
    var project = data;
    var guests = Array.isArray(project.guests) ? project.guests : [];
    var guest = guests.find(function (candidate) {
        return candidate && typeof candidate === "object" && candidate.id === guestId;
    });
    return typeof (guest === null || guest === void 0 ? void 0 : guest.name) === "string" ? guest.name : undefined;
}
function buildParticipantProjection(data, guestId, now) {
    if (now === void 0) { now = new Date(); }
    var project = data && typeof data === "object" && !Array.isArray(data)
        ? data
        : {};
    var guests = Array.isArray(project.guests) ? project.guests : [];
    var guest = guests.find(function (candidate) {
        return candidate && typeof candidate === "object" && candidate.id === guestId;
    });
    var tables = Array.isArray(project.tables) ? project.tables : [];
    var table = guest && tables.find(function (candidate) {
        return candidate && typeof candidate === "object" && candidate.id === guest.tableId;
    });
    var visibleToGuest = function (item) {
        if (!item || typeof item !== "object")
            return false;
        var candidate = item;
        if (candidate.visibility === "prive" || candidate.visibility === "private")
            return false;
        if (["paiement", "payment", "budget", "finance"].includes(String(candidate.kind || "")))
            return false;
        return candidate.visibility === "audience" || candidate.visibility === "guests" ||
            candidate.audience === "guests" ||
            (Array.isArray(candidate.audience) && candidate.audience.includes("guests")) ||
            (Array.isArray(candidate.relations) && candidate.relations.some(function (relation) {
                return relation && typeof relation === "object" &&
                    relation.kind === "guest" &&
                    relation.id === guestId;
            }));
    };
    var timeline = Array.isArray(project.timeline) ? project.timeline : [];
    var audienceTimeline = timeline
        .filter(visibleToGuest)
        .map(function (item) { return safeObject(item, ["id", "time", "endTime", "title", "detail", "location", "phase"]); });
    var program = (Array.isArray(project.program) ? project.program : timeline)
        .filter(function (item) { return visibleToGuest(item) && item.phase === "pendant"; })
        .map(function (item) { return safeObject(item, ["id", "time", "endTime", "durationMinutes", "title", "detail", "location", "phase"]); });
    var logistics = project.logistics && typeof project.logistics === "object" && !Array.isArray(project.logistics)
        ? project.logistics
        : {};
    var pivot = Number(factValue(project.pivot));
    var pivotDate = Number.isFinite(pivot) ? new Date(pivot) : undefined;
    var phase = !pivotDate
        ? undefined
        : pivotDate.getFullYear() === now.getFullYear() && pivotDate.getMonth() === now.getMonth() && pivotDate.getDate() === now.getDate()
            ? "pendant"
            : pivot > now.getTime() ? "avant" : "apres";
    return {
        guest: __assign({ name: typeof (guest === null || guest === void 0 ? void 0 : guest.name) === "string" ? guest.name : "Invité·e" }, (typeof (table === null || table === void 0 ? void 0 : table.name) === "string" ? { tableName: table.name } : {})),
        phase: phase,
        program: program,
        practicalInfo: {
            city: factValue(project.city),
            venue: factValue(project.venue),
            parking: logistics.parking,
            accessibility: logistics.accessibility,
            weatherFallback: logistics.weatherFallback,
        },
        mediaPolicy: {
            enabled: true,
            maxSize: 25 * 1024 * 1024,
            accept: ["image/jpeg", "image/png", "image/webp", "video/mp4"],
        },
        afterContent: audienceTimeline.filter(function (item) { return item.phase === "apres" || item.phase === "after"; }),
    };
}
