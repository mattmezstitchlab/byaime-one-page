const financialKinds = new Set(["paiement", "facture", "devis"]);
export function canRoleSeeTimelineEvent(event, role) {
    if (financialKinds.has(event.kind) && role !== "owner")
        return false;
    if (role === "owner")
        return true;
    if (role === "planner" || role === "family")
        return event.visibility !== "prive";
    return event.visibility === "audience";
}
//# sourceMappingURL=profile-visibility.js.map