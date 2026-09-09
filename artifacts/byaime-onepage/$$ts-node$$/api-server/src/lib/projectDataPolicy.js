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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectDataForRole = projectDataForRole;
exports.mergeProtectedProjectData = mergeProtectedProjectData;
var rows = function (value) { return Array.isArray(value) ? value.filter(function (item) { return Boolean(item) && typeof item === "object"; }) : []; };
var financialKinds = new Set(["paiement", "facture", "devis"]);
function canSeeEvent(event, role) {
    var _a;
    if (financialKinds.has(String((_a = event.kind) !== null && _a !== void 0 ? _a : "")) && role !== "owner")
        return false;
    if (role === "owner")
        return true;
    if (role === "planner" || role === "family")
        return event.visibility !== "prive";
    return event.visibility === "audience";
}
function projectDataForRole(value, role) {
    var data = value && typeof value === "object" ? value : {};
    if (role === "owner")
        return data;
    var providers = role === "viewer" ? [] : rows(data.providers).map(function (_a) {
        var _amount = _a.amountCents, _deposit = _a.depositCents, _paid = _a.paidCents, provider = __rest(_a, ["amountCents", "depositCents", "paidCents"]);
        return provider;
    });
    return __assign(__assign({}, data), { budget: { value: null, confidence: "manquant" }, payments: [], documents: [], providers: providers, tasks: role === "viewer" ? [] : data.tasks, timeline: rows(data.timeline).filter(function (event) { return canSeeEvent(event, role); }) });
}
function mergeProtectedProjectData(currentValue, submittedValue, role) {
    var current = currentValue && typeof currentValue === "object" ? currentValue : {};
    var submitted = submittedValue && typeof submittedValue === "object" ? submittedValue : {};
    if (role === "owner")
        return submitted;
    var currentEvents = rows(current.timeline);
    var submittedVisibleEvents = rows(submitted.timeline).filter(function (event) { return canSeeEvent(event, role); });
    var hiddenEvents = currentEvents.filter(function (event) { return !canSeeEvent(event, role); });
    var currentProviders = new Map(rows(current.providers).map(function (provider) { var _a; return [String((_a = provider.id) !== null && _a !== void 0 ? _a : ""), provider]; }));
    var providers = rows(submitted.providers).map(function (_a) {
        var _b;
        var _amount = _a.amountCents, _deposit = _a.depositCents, _paid = _a.paidCents, provider = __rest(_a, ["amountCents", "depositCents", "paidCents"]);
        var protectedProvider = currentProviders.get(String((_b = provider.id) !== null && _b !== void 0 ? _b : ""));
        return __assign(__assign(__assign(__assign({}, provider), ((protectedProvider === null || protectedProvider === void 0 ? void 0 : protectedProvider.amountCents) === undefined ? {} : { amountCents: protectedProvider.amountCents })), ((protectedProvider === null || protectedProvider === void 0 ? void 0 : protectedProvider.depositCents) === undefined ? {} : { depositCents: protectedProvider.depositCents })), ((protectedProvider === null || protectedProvider === void 0 ? void 0 : protectedProvider.paidCents) === undefined ? {} : { paidCents: protectedProvider.paidCents }));
    });
    return __assign(__assign({}, submitted), { budget: current.budget, payments: current.payments, documents: current.documents, publicProfile: current.publicProfile, providers: providers, timeline: __spreadArray(__spreadArray([], submittedVisibleEvents, true), hiddenEvents, true) });
}
//# sourceMappingURL=projectDataPolicy.js.map