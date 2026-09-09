"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.can = can;
exports.authenticatedUserId = authenticatedUserId;
function can(role, action) {
    if (!role)
        return false;
    if (action === "read")
        return true;
    if (action === "edit")
        return role !== "viewer";
    if (action === "manage")
        return role === "owner" || role === "planner";
    return role === "owner";
}
function authenticatedUserId(auth) {
    var _a;
    var claims = auth.sessionClaims;
    return typeof (claims === null || claims === void 0 ? void 0 : claims.userId) === "string" ? claims.userId : (_a = auth.userId) !== null && _a !== void 0 ? _a : undefined;
}
