export function can(role, action) {
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
export function authenticatedUserId(auth) {
    const claims = auth.sessionClaims;
    return typeof claims?.userId === "string" ? claims.userId : auth.userId ?? undefined;
}
//# sourceMappingURL=permissions.js.map