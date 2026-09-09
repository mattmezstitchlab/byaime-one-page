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
exports.projectToPublicProfile = projectToPublicProfile;
var publicEventFields = [
    "id",
    "time",
    "endTime",
    "durationMinutes",
    "kind",
    "title",
    "detail",
    "location",
    "status",
    "confidence",
    "phase",
    "universe",
    "provenance",
    "visibility",
];
var privateFinancialEventKinds = new Set(["paiement", "facture", "devis"]);
function record(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value)
        ? value
        : null;
}
function publicEvent(value) {
    var _a;
    var event = record(value);
    if (!event || event.visibility !== "audience" || typeof event.id !== "string" || typeof event.time !== "number")
        return null;
    if (privateFinancialEventKinds.has(String((_a = event.kind) !== null && _a !== void 0 ? _a : "")))
        return null;
    return Object.fromEntries(publicEventFields
        .filter(function (field) { return event[field] !== undefined; })
        .map(function (field) { return [field, event[field]]; }));
}
function projectToPublicProfile(project) {
    var data = record(project.data);
    var settings = record(data === null || data === void 0 ? void 0 : data.publicProfile);
    if (!data || (settings === null || settings === void 0 ? void 0 : settings.published) !== true)
        return null;
    var timeline = Array.isArray(data.timeline)
        ? data.timeline.map(publicEvent).filter(function (event) { return event !== null; }).sort(function (a, b) { return Number(a.time) - Number(b.time); })
        : [];
    var city = record(data.city);
    var pivot = record(data.pivot);
    return __assign(__assign(__assign(__assign(__assign({ id: project.id, title: project.title }, (typeof data.subtitle === "string" && data.subtitle.trim() ? { subtitle: data.subtitle.trim() } : {})), (typeof data.universe === "string" ? { universe: data.universe } : {})), (typeof (city === null || city === void 0 ? void 0 : city.value) === "string" && city.value.trim() ? { city: city.value.trim() } : {})), (typeof (pivot === null || pivot === void 0 ? void 0 : pivot.value) === "number" ? { pivot: pivot.value } : {})), { timeline: timeline });
}
//# sourceMappingURL=publicProfile.js.map