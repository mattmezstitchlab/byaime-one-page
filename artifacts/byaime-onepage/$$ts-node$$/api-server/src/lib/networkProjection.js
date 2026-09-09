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
exports.buildNetworkProjection = buildNetworkProjection;
var aime_domain_1 = require("@workspace/aime-domain");
var projectDataPolicy_1 = require("./projectDataPolicy");
var CITY_COORDINATES = {
    paris: [48.8566, 2.3522],
    lille: [50.6292, 3.0573],
    lyon: [45.764, 4.8357],
    marseille: [43.2965, 5.3698],
    bordeaux: [44.8378, -0.5792],
    strasbourg: [48.5734, 7.7521],
    nantes: [47.2184, -1.5536],
    toulouse: [43.6047, 1.4442],
    nice: [43.7102, 7.262],
    rennes: [48.1173, -1.6778],
    bruxelles: [50.8503, 4.3517],
    london: [51.5074, -0.1278],
    londres: [51.5074, -0.1278],
    montreal: [45.5019, -73.5674],
    dakar: [14.7167, -17.4677],
};
function record(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : {};
}
function text(value) {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function factText(value) {
    return text(record(value).value);
}
function list(value) {
    return Array.isArray(value) ? value.map(record) : [];
}
function projectionId(worldId, kind, legacyId) {
    return "world-project:".concat(worldId, ":").concat(kind, ":").concat(encodeURIComponent(legacyId));
}
function approximateLocation(value) {
    if (!value)
        return undefined;
    var normalized = value
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();
    var match = Object.entries(CITY_COORDINATES).find(function (_a) {
        var city = _a[0];
        return normalized.includes(city);
    });
    return match
        ? {
            city: match[0].replace(/^./, function (letter) { return letter.toUpperCase(); }),
            latitude: match[1][0],
            longitude: match[1][1],
        }
        : undefined;
}
function decisions(capabilities, context) {
    return Object.fromEntries(capabilities.map(function (capability) { return [
        capability,
        (0, aime_domain_1.evaluateCapability)(capability, context),
    ]; }));
}
function buildNetworkProjection(rows, generatedAt) {
    var _a, _b, _c;
    if (generatedAt === void 0) { generatedAt = new Date().toISOString(); }
    var subjects = [];
    var relations = [];
    for (var _i = 0, rows_1 = rows; _i < rows_1.length; _i++) {
        var row = rows_1[_i];
        // Reuse the established serialization boundary before reading any nested
        // subject. This keeps private, financial, and role-hidden records out of
        // both subjects and their relations.
        var data = record((0, projectDataPolicy_1.projectDataForRole)(row.data, row.role));
        var role = (0, aime_domain_1.mapLegacyProjectRole)(row.role);
        var worldRef = { kind: "world", id: row.id };
        var worldContext = {
            authenticated: true,
            worldRole: role,
        };
        var location_1 = approximateLocation(factText(data.city));
        var venue = factText(data.venue);
        subjects.push(__assign(__assign({ ref: worldRef, worldRef: worldRef, label: row.title, summary: [text(data.universe), text(data.subtitle)]
                .filter(Boolean)
                .join(" · "), locationLevel: "world", city: location_1 === null || location_1 === void 0 ? void 0 : location_1.city }, (!venue && location_1
            ? { latitude: location_1.latitude, longitude: location_1.longitude }
            : {})), { primaryCapability: "world.view", capabilities: decisions(["world.view", "world.edit"], worldContext) }));
        if (venue) {
            var legacyId = "venue";
            var ref = {
                kind: "place",
                id: projectionId(row.id, "place", legacyId),
            };
            subjects.push(__assign(__assign({ ref: ref, worldRef: worldRef, label: venue, summary: (location_1 === null || location_1 === void 0 ? void 0 : location_1.city)
                    ? "Lieu du Monde \u00B7 ".concat(location_1.city)
                    : "Lieu du Monde", locationLevel: "world", city: location_1 === null || location_1 === void 0 ? void 0 : location_1.city }, (location_1
                ? { latitude: location_1.latitude, longitude: location_1.longitude }
                : {})), { primaryCapability: "world.view", capabilities: decisions(["world.view"], worldContext), legacy: {
                    source: "world_project_json",
                    entityKind: "venue",
                    legacyId: legacyId,
                } }));
            relations.push({
                id: "".concat(ref.id, ":in-world"),
                from: ref,
                to: worldRef,
                kind: "belongs_to",
                visibility: "world",
            });
        }
        for (var _d = 0, _e = list(data.timeline); _d < _e.length; _d++) {
            var moment = _e[_d];
            var legacyId = text(moment.id);
            var label = text(moment.title);
            if (!legacyId || !label)
                continue;
            var ref = {
                kind: "moment",
                id: projectionId(row.id, "moment", legacyId),
            };
            var momentLocation = approximateLocation(text(moment.location));
            subjects.push(__assign(__assign({ ref: ref, worldRef: worldRef, label: label, summary: (_a = text(moment.detail)) !== null && _a !== void 0 ? _a : text(moment.kind), locationLevel: "world", city: momentLocation === null || momentLocation === void 0 ? void 0 : momentLocation.city }, (momentLocation
                ? {
                    latitude: momentLocation.latitude,
                    longitude: momentLocation.longitude,
                }
                : {})), { primaryCapability: "world.view", capabilities: decisions(["world.view", "moment.edit"], __assign(__assign({}, worldContext), { 
                    // Historical owner ids are not Identity mappings. Do not infer
                    // ownership until that mapping has been explicitly verified.
                    ownsContribution: false })), legacy: {
                    source: "world_project_json",
                    entityKind: "timeline_event",
                    legacyId: legacyId,
                } }));
            relations.push({
                id: "".concat(ref.id, ":in-world"),
                from: ref,
                to: worldRef,
                kind: "belongs_to",
                visibility: "world",
            });
        }
        for (var _f = 0, _g = list(data.providers); _f < _g.length; _f++) {
            var provider = _g[_f];
            var legacyId = text(provider.id);
            if (!legacyId)
                continue;
            var ref = {
                kind: "card",
                id: projectionId(row.id, "card", legacyId),
            };
            var cardContext = __assign(__assign({}, worldContext), { socialRelation: "connected", 
                // A legacy contact value is not proof that the Card opted into
                // contact. Keep the action denied until preferences are canonical.
                contactAllowed: false });
            subjects.push({
                ref: ref,
                worldRef: worldRef,
                label: (_c = (_b = text(provider.name)) !== null && _b !== void 0 ? _b : text(provider.role)) !== null && _c !== void 0 ? _c : "Professionnel",
                summary: text(provider.category),
                locationLevel: "world",
                primaryCapability: "card.view",
                capabilities: decisions(["card.view", "card.contact"], cardContext),
                legacy: {
                    source: "world_project_json",
                    entityKind: "provider",
                    legacyId: legacyId,
                },
            });
            relations.push({
                id: "".concat(ref.id, ":in-world"),
                from: ref,
                to: worldRef,
                kind: "participates_in",
                visibility: "world",
            });
        }
    }
    return { generatedAt: generatedAt, subjects: subjects, relations: relations };
}
//# sourceMappingURL=networkProjection.js.map