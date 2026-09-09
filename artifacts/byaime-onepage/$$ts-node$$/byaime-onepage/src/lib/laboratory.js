export const LABORATORY_FEEDBACK_TYPES = [
    "bug",
    "remarque",
    "suggestion",
    "idee",
    "question",
    "positif",
    "ux",
    "contenu_donnees",
];
export const LABORATORY_FEEDBACK_STATUSES = [
    "nouveau",
    "en_cours",
    "a_verifier",
    "resolu",
    "archive",
];
const LAB_DRAFT_KEY = "aime:laboratory:pending-draft";
const WORLD_FOCUS_KEY = "aime:world-focus";
export const laboratoryTypeLabels = {
    bug: "⚠️ Problème",
    remarque: "💬 Remarque",
    suggestion: "✨ Suggestion",
    idee: "💡 Idée",
    question: "❓ Je ne comprends pas",
    positif: "❤️ Ce que j’aime",
    ux: "🪄 Expérience",
    contenu_donnees: "🧩 Contenu ou données",
};
export const laboratoryStatusLabels = {
    nouveau: "Reçu",
    en_cours: "En cours",
    a_verifier: "À revérifier",
    resolu: "Résolu",
    archive: "Archivé",
};
export const laboratoryStatusDescriptions = {
    nouveau: "Votre retour vient d’entrer dans la boucle d’amélioration.",
    en_cours: "AIME et l’équipe sont en train de le comprendre.",
    a_verifier: "Une évolution existe ou un point doit être revu dans le contexte réel.",
    resolu: "Une amélioration a été apportée ou le point a trouvé sa réponse.",
    archive: "Ce retour reste conservé comme trace utile du parcours.",
};
export function cleanLaboratoryContext(context) {
    return Object.fromEntries(Object.entries(context || {}).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== ""));
}
export function queueLaboratoryDraft(draft) {
    if (typeof window === "undefined")
        return;
    window.sessionStorage.setItem(LAB_DRAFT_KEY, JSON.stringify({
        ...draft,
        context: cleanLaboratoryContext(draft.context),
    }));
}
export function consumeLaboratoryDraft() {
    if (typeof window === "undefined")
        return undefined;
    const raw = window.sessionStorage.getItem(LAB_DRAFT_KEY);
    if (!raw)
        return undefined;
    window.sessionStorage.removeItem(LAB_DRAFT_KEY);
    try {
        const parsed = JSON.parse(raw);
        return {
            ...parsed,
            context: cleanLaboratoryContext(parsed.context),
        };
    }
    catch {
        return undefined;
    }
}
export function openLaboratory(draft = {}) {
    if (typeof window === "undefined")
        return;
    const detail = {
        ...draft,
        context: cleanLaboratoryContext(draft.context),
    };
    queueLaboratoryDraft(detail);
    window.dispatchEvent(new CustomEvent("aime:open-laboratory", { detail }));
}
export function queueWorldFocus(request) {
    if (typeof window === "undefined")
        return;
    window.sessionStorage.setItem(WORLD_FOCUS_KEY, JSON.stringify(request));
}
export function consumeWorldFocus() {
    if (typeof window === "undefined")
        return undefined;
    const raw = window.sessionStorage.getItem(WORLD_FOCUS_KEY);
    if (!raw)
        return undefined;
    window.sessionStorage.removeItem(WORLD_FOCUS_KEY);
    try {
        return JSON.parse(raw);
    }
    catch {
        return undefined;
    }
}
export function focusWorld(request) {
    if (typeof window === "undefined")
        return;
    queueWorldFocus(request);
    window.dispatchEvent(new CustomEvent("aime:focus-world", { detail: request }));
}
export function describeLaboratoryContext(context) {
    const routeLabel = context.route === "world"
        ? "Monde"
        : context.route === "profile"
            ? "Profil"
            : context.route === "network"
                ? "Carte"
                : context.route === "laboratory"
                    ? "Laboratoire"
                    : undefined;
    const phaseLabel = context.phase === "avant"
        ? "Avant"
        : context.phase === "pendant"
            ? "Pendant"
            : context.phase === "apres"
                ? "Après"
                : undefined;
    const viewLabel = context.view === "chronological"
        ? "Timeline"
        : context.view === "public-info"
            ? "Infos visibles"
            : context.view === "music"
                ? "Musique"
                : context.view === "person"
                    ? "Personnes"
                    : context.view === "provider"
                        ? "Professionnels"
                        : context.view === "day-of"
                            ? "Jour J"
                            : context.view === "collaborative"
                                ? "Collaboration"
                                : context.view === "memories"
                                    ? "Souvenirs"
                                    : context.view === "logistics"
                                        ? "Logistique"
                                        : undefined;
    const panelLabel = context.panel === "music"
        ? "Module Musique"
        : context.panel === "documents"
            ? "Module Documents"
            : context.panel === "messages"
                ? "Module Messages"
                : context.panel === "contributions"
                    ? "Module Contributions"
                    : context.panel === "world-settings"
                        ? "Réglages du Monde"
                        : context.panel
                            ? `Panneau ${context.panel}`
                            : undefined;
    const entityLabel = context.entityLabel
        ? context.entityLabel
        : context.entityKind === "music"
            ? "Morceau concerné"
            : context.entityKind === "provider"
                ? "Professionnel concerné"
                : context.entityKind === "guest"
                    ? "Personne concernée"
                    : undefined;
    return [
        routeLabel,
        phaseLabel,
        viewLabel,
        panelLabel,
        context.momentTitle ? `Moment ${context.momentTitle}` : undefined,
        entityLabel,
        context.narrative,
    ].filter(Boolean);
}
export function describeLaboratoryJourney(context) {
    const segments = describeLaboratoryContext({
        route: context.route,
        phase: context.phase,
        view: context.view,
        panel: context.panel,
        momentTitle: context.momentTitle,
        entityLabel: context.entityLabel,
        entityKind: context.entityKind,
    }).filter((item) => item !== context.narrative);
    return segments.length ? segments.join(" → ") : undefined;
}
//# sourceMappingURL=laboratory.js.map