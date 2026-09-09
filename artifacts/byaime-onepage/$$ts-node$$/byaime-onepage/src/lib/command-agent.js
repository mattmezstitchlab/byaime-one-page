import { analyzeEventImpact, audiencesForTimelineEvents, findTimelineConflicts, planEventPropagation } from "./timeline-graph";
export function parseFrenchCommand(input) {
    const normalized = input.trim().toLocaleLowerCase("fr");
    let match = normalized.match(/(?:décale|decale|déplacer|deplacer)\s+(?:l['’]événement\s+)?(.+?)\s+de\s+(-?\d+)\s*(?:min|minutes?)/);
    if (match)
        return { kind: "shift-event", query: match[1].trim(), minutes: Number(match[2]) };
    if (/(?:liste|voir|montre).*(?:tâches|taches).*(?:restantes?|à faire|a faire)/.test(normalized))
        return { kind: "remaining-tasks" };
    match = normalized.match(/(?:prépare|prepare|génère|genere).*(?:planning|horaire).*(?:prestataire)(?:\s+(.+))?/);
    if (match)
        return { kind: "provider-schedule", query: match[1]?.trim() };
    if (/(?:analyse|besoins?).*(?:alimentaire|diététique|dietetique|régime|regime|allerg)/.test(normalized))
        return { kind: "dietary-analysis" };
    if (/(?:cherche|trouve|analyse).*(?:conflits?).*(?:timeline|planning|horaire)?/.test(normalized))
        return { kind: "timeline-conflicts" };
    match = normalized.match(/(?:ajoute|ajouter)\s+(\d+)\s+(?:invités|invites|personnes)/);
    if (match)
        return { kind: "add-guests", count: Number(match[1]) };
    return undefined;
}
export function proposeCommand(project, command) {
    if (command.kind === "shift-event") {
        const matches = project.timeline.filter(event => event.title.toLocaleLowerCase("fr").includes(command.query));
        if (matches.length !== 1)
            throw new Error(matches.length ? "Plusieurs événements correspondent : précisez le titre." : "Aucun événement correspondant.");
        const event = matches[0];
        const impact = analyzeEventImpact(project, event.id, { time: event.time + command.minutes * 60000 });
        const plan = planEventPropagation(project, event.id, { time: event.time + command.minutes * 60000 });
        const audiences = audiencesForTimelineEvents(project, plan.affectedEventIds);
        const addressable = audiences.filter(audience => audience.email).length;
        return { command, mutation: true, title: `Décaler « ${event.title} » de ${command.minutes} min`, impact: [
                `${impact.relations.length} entité(s) liée(s)`, `${impact.dependents.length} dépendance(s)`,
                ...impact.conflicts.map(conflict => `Conflit : ${conflict.message}`),
                `${audiences.length} personne(s) concernée(s), ${addressable} adresse(s) prête(s) à vérifier`,
            ], requiresConfirmation: true, communication: {
                eventId: event.id,
                eventTitle: event.title,
                audiences,
                subject: `Mise à jour du programme · ${event.title}`,
                body: `Bonjour,\n\nLe programme évolue : « ${event.title} » est décalé de ${command.minutes} minutes.\n\nMerci de prendre en compte ce nouvel horaire.\n\nÀ bientôt,`,
            } };
    }
    if (command.kind === "add-guests") {
        if (!Number.isInteger(command.count) || command.count < 1 || command.count > 100)
            throw new Error("Le nombre d’invités doit être compris entre 1 et 100.");
        return { command, mutation: true, title: `Ajouter ${command.count} invité(s)`, impact: [`Total après ajout : ${project.guests.length + command.count}`, "Noms, RSVP et tables resteront à compléter"], requiresConfirmation: true };
    }
    if (command.kind === "remaining-tasks") {
        const tasks = project.tasks.filter(task => task.status !== "termine");
        return { command, mutation: false, title: `${tasks.length} tâche(s) restante(s)`, impact: tasks.slice(0, 8).map(task => `${task.priority} · ${task.title}`), requiresConfirmation: false };
    }
    if (command.kind === "dietary-analysis") {
        const dietary = project.guests.filter(guest => guest.rsvp !== "decline" && guest.dietary?.trim());
        return { command, mutation: false, title: `${dietary.length} besoin(s) alimentaire(s) déclaré(s)`, impact: dietary.map(guest => `${guest.name} · ${guest.dietary}${guest.tableId ? ` · table ${guest.tableId}` : " · sans table"}`), requiresConfirmation: false };
    }
    if (command.kind === "timeline-conflicts") {
        const conflicts = findTimelineConflicts(project.timeline);
        return { command, mutation: false, title: `${conflicts.length} conflit(s) détecté(s)`, impact: conflicts.map(item => item.message), requiresConfirmation: false };
    }
    const providers = project.providers.filter(provider => !command.query || `${provider.role} ${provider.name || ""}`.toLocaleLowerCase("fr").includes(command.query));
    const lines = providers.flatMap(provider => project.timeline
        .filter(event => event.relations?.some(relation => relation.kind === "provider" && relation.id === provider.id))
        .map(event => `${new Date(event.time).toLocaleString("fr-FR")} · ${provider.name || provider.role} · ${event.title}`));
    return { command, mutation: false, title: "Planning prestataire", impact: lines.length ? lines : ["Aucun événement lié à ce prestataire."], requiresConfirmation: false };
}
export function executeCommand(project, proposal, confirmed = false) {
    if (proposal.mutation && !confirmed)
        throw new Error("Confirmation explicite requise");
    if (proposal.command.kind === "shift-event") {
        const command = proposal.command;
        const event = project.timeline.find(item => item.title.toLocaleLowerCase("fr").includes(command.query));
        if (!event)
            throw new Error("Événement introuvable");
        return { project: { ...project, timeline: project.timeline.map(item => item.id === event.id ? { ...item, time: item.time + command.minutes * 60000, propagation: { state: "applied", lastAppliedAt: Date.now(), sourceEventId: item.id } } : item) }, message: `« ${event.title} » décalé de ${command.minutes} minutes. Les dépendances n’ont pas été déplacées.` };
    }
    if (proposal.command.kind === "add-guests") {
        const guests = Array.from({ length: proposal.command.count }, (_, index) => ({
            id: `guest-${Date.now()}-${index}`, name: `Nouvel invité ${index + 1}`, role: "invite", rsvp: "en_attente",
            attendance: { ceremony: true, cocktail: true, dinner: true, brunch: false },
        }));
        return { project: { ...project, guests: [...project.guests, ...guests] }, message: `${guests.length} invité(s) ajouté(s), à compléter.` };
    }
    return { project, message: proposal.title };
}
//# sourceMappingURL=command-agent.js.map