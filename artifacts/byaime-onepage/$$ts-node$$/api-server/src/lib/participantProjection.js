function safeObject(value, fields) {
    const source = value && typeof value === "object" && !Array.isArray(value)
        ? value
        : {};
    return Object.fromEntries(fields.flatMap((field) => {
        const fieldValue = source[field];
        return fieldValue === undefined ? [] : [[field, fieldValue]];
    }));
}
function factValue(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return value;
    return value.value;
}
export function participantNameById(data, guestId) {
    if (!guestId || !data || typeof data !== "object" || Array.isArray(data))
        return undefined;
    const project = data;
    const guests = Array.isArray(project.guests) ? project.guests : [];
    const guest = guests.find((candidate) => candidate && typeof candidate === "object" && candidate.id === guestId);
    return typeof guest?.name === "string" ? guest.name : undefined;
}
export function buildParticipantProjection(data, guestId, now = new Date()) {
    const project = data && typeof data === "object" && !Array.isArray(data)
        ? data
        : {};
    const guests = Array.isArray(project.guests) ? project.guests : [];
    const guest = guests.find((candidate) => candidate && typeof candidate === "object" && candidate.id === guestId);
    const tables = Array.isArray(project.tables) ? project.tables : [];
    const table = guest && tables.find((candidate) => candidate && typeof candidate === "object" && candidate.id === guest.tableId);
    const visibleToGuest = (item) => {
        if (!item || typeof item !== "object")
            return false;
        const candidate = item;
        if (candidate.visibility === "prive" || candidate.visibility === "private")
            return false;
        if (["paiement", "payment", "budget", "finance"].includes(String(candidate.kind || "")))
            return false;
        return candidate.visibility === "audience" || candidate.visibility === "guests" ||
            candidate.audience === "guests" ||
            (Array.isArray(candidate.audience) && candidate.audience.includes("guests")) ||
            (Array.isArray(candidate.relations) && candidate.relations.some((relation) => relation && typeof relation === "object" &&
                relation.kind === "guest" &&
                relation.id === guestId));
    };
    const timeline = Array.isArray(project.timeline) ? project.timeline : [];
    const audienceTimeline = timeline
        .filter(visibleToGuest)
        .map((item) => safeObject(item, ["id", "time", "endTime", "title", "detail", "location", "phase"]));
    const program = (Array.isArray(project.program) ? project.program : timeline)
        .filter((item) => visibleToGuest(item) && item.phase === "pendant")
        .map((item) => safeObject(item, ["id", "time", "endTime", "durationMinutes", "title", "detail", "location", "phase"]));
    const logistics = project.logistics && typeof project.logistics === "object" && !Array.isArray(project.logistics)
        ? project.logistics
        : {};
    const pivot = Number(factValue(project.pivot));
    const pivotDate = Number.isFinite(pivot) ? new Date(pivot) : undefined;
    const phase = !pivotDate
        ? undefined
        : pivotDate.getFullYear() === now.getFullYear() && pivotDate.getMonth() === now.getMonth() && pivotDate.getDate() === now.getDate()
            ? "pendant"
            : pivot > now.getTime() ? "avant" : "apres";
    return {
        guest: {
            name: typeof guest?.name === "string" ? guest.name : "Invité·e",
            ...(typeof table?.name === "string" ? { tableName: table.name } : {}),
        },
        phase,
        program,
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
        afterContent: audienceTimeline.filter((item) => item.phase === "apres" || item.phase === "after"),
    };
}
//# sourceMappingURL=participantProjection.js.map