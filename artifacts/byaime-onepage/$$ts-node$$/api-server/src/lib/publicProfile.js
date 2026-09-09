const publicEventFields = [
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
const privateFinancialEventKinds = new Set(["paiement", "facture", "devis"]);
function record(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value)
        ? value
        : null;
}
function publicEvent(value) {
    const event = record(value);
    if (!event || event.visibility !== "audience" || typeof event.id !== "string" || typeof event.time !== "number")
        return null;
    if (privateFinancialEventKinds.has(String(event.kind ?? "")))
        return null;
    return Object.fromEntries(publicEventFields
        .filter((field) => event[field] !== undefined)
        .map((field) => [field, event[field]]));
}
export function projectToPublicProfile(project) {
    const data = record(project.data);
    const settings = record(data?.publicProfile);
    if (!data || settings?.published !== true)
        return null;
    const timeline = Array.isArray(data.timeline)
        ? data.timeline.map(publicEvent).filter((event) => event !== null).sort((a, b) => Number(a.time) - Number(b.time))
        : [];
    const city = record(data.city);
    const pivot = record(data.pivot);
    return {
        id: project.id,
        title: project.title,
        ...(typeof data.subtitle === "string" && data.subtitle.trim() ? { subtitle: data.subtitle.trim() } : {}),
        ...(typeof data.universe === "string" ? { universe: data.universe } : {}),
        ...(typeof city?.value === "string" && city.value.trim() ? { city: city.value.trim() } : {}),
        ...(typeof pivot?.value === "number" ? { pivot: pivot.value } : {}),
        timeline,
    };
}
//# sourceMappingURL=publicProfile.js.map