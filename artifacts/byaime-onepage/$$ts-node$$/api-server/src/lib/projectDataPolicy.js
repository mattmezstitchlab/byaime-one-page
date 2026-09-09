const rows = (value) => Array.isArray(value) ? value.filter((item) => Boolean(item) && typeof item === "object") : [];
const financialKinds = new Set(["paiement", "facture", "devis"]);
function canSeeEvent(event, role) {
    if (financialKinds.has(String(event.kind ?? "")) && role !== "owner")
        return false;
    if (role === "owner")
        return true;
    if (role === "planner" || role === "family")
        return event.visibility !== "prive";
    return event.visibility === "audience";
}
export function projectDataForRole(value, role) {
    const data = value && typeof value === "object" ? value : {};
    if (role === "owner")
        return data;
    const providers = role === "viewer" ? [] : rows(data.providers).map(({ amountCents: _amount, depositCents: _deposit, paidCents: _paid, ...provider }) => provider);
    return {
        ...data,
        budget: { value: null, confidence: "manquant" },
        payments: [],
        documents: [],
        providers,
        tasks: role === "viewer" ? [] : data.tasks,
        timeline: rows(data.timeline).filter(event => canSeeEvent(event, role)),
    };
}
export function mergeProtectedProjectData(currentValue, submittedValue, role) {
    const current = currentValue && typeof currentValue === "object" ? currentValue : {};
    const submitted = submittedValue && typeof submittedValue === "object" ? submittedValue : {};
    if (role === "owner")
        return submitted;
    const currentEvents = rows(current.timeline);
    const submittedVisibleEvents = rows(submitted.timeline).filter(event => canSeeEvent(event, role));
    const hiddenEvents = currentEvents.filter(event => !canSeeEvent(event, role));
    const currentProviders = new Map(rows(current.providers).map(provider => [String(provider.id ?? ""), provider]));
    const providers = rows(submitted.providers).map(({ amountCents: _amount, depositCents: _deposit, paidCents: _paid, ...provider }) => {
        const protectedProvider = currentProviders.get(String(provider.id ?? ""));
        return {
            ...provider,
            ...(protectedProvider?.amountCents === undefined ? {} : { amountCents: protectedProvider.amountCents }),
            ...(protectedProvider?.depositCents === undefined ? {} : { depositCents: protectedProvider.depositCents }),
            ...(protectedProvider?.paidCents === undefined ? {} : { paidCents: protectedProvider.paidCents }),
        };
    });
    return {
        ...submitted,
        budget: current.budget,
        payments: current.payments,
        documents: current.documents,
        publicProfile: current.publicProfile,
        providers,
        timeline: [...submittedVisibleEvents, ...hiddenEvents],
    };
}
//# sourceMappingURL=projectDataPolicy.js.map