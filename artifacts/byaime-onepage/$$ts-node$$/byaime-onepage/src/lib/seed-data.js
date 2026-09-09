const MONTH = 30 * 86400000;
const WEEK = 7 * 86400000;
const DAY = 86400000;
const HOUR = 3600000;
const MINUTE = 60000;
export function generateWeddingTimeline(pivotTime, universe, intentionText) {
    let idCounter = 100;
    const nextId = () => `seed_${idCounter++}`;
    const baseEvent = {
        status: "prepare",
        confidence: "suggere",
        universe: universe || "Général",
        provenance: "suggested",
        visibility: "equipe",
        relations: [],
        dependencyIds: [],
        resources: [],
        propagation: { state: "none" }
    };
    const createEvent = (id, time, phase, kind, title, detail, overrides = {}) => ({
        ...baseEvent,
        id,
        time,
        phase,
        kind,
        title,
        detail,
        ...overrides,
    });
    return [
        // Idea & Vision (< 24m)
        createEvent("t1", pivotTime - 25 * MONTH, "avant", "intention", "L'intention posée", intentionText, { status: "execute", confidence: "confirme", provenance: "real" }),
        createEvent(nextId(), pivotTime - 24.5 * MONTH, "avant", "jalon", "L'annonce", "Annonce des fiançailles aux proches"),
        // 18-24m
        createEvent(nextId(), pivotTime - 22 * MONTH, "avant", "jalon", "Première ébauche", "Définition du budget global et de la liste d'invités préliminaire"),
        createEvent(nextId(), pivotTime - 20 * MONTH, "avant", "jalon", "Le style", "Moodboard et définition de l'ambiance visuelle"),
        // 12-18m
        createEvent("t-visite", pivotTime - 17 * MONTH, "avant", "jalon", "La découverte du lieu", "Première visite et coup de cœur", { relations: [{ kind: "provider", id: "p1" }], durationMinutes: 120, status: "execute", confidence: "confirme" }),
        createEvent(nextId(), pivotTime - 16 * MONTH, "avant", "jalon", "Choix du photographe", "Sécurisation des souvenirs visuels", { relations: [{ kind: "provider", id: "p3" }] }),
        createEvent(nextId(), pivotTime - 15 * MONTH, "avant", "jalon", "Wedding Planner", "Rencontre avec l'équipe d'organisation (optionnel)"),
        createEvent(nextId(), pivotTime - 14 * MONTH, "avant", "jalon", "L'officiant", "Choix de la personne qui célébrera la cérémonie"),
        createEvent(nextId(), pivotTime - 13 * MONTH, "avant", "jalon", "La première tenue", "Essayages et coup de cœur"),
        // 9-12m
        createEvent("t-degustation", pivotTime - 11 * MONTH, "avant", "jalon", "Dégustation du menu", "Choix des accords mets et vins", { relations: [{ kind: "provider", id: "p2" }], durationMinutes: 180 }),
        createEvent(nextId(), pivotTime - 10 * MONTH, "avant", "jalon", "La musique", "Réservation du DJ ou du groupe", { relations: [{ kind: "provider", id: "p4" }] }),
        createEvent(nextId(), pivotTime - 9.5 * MONTH, "avant", "jalon", "Les fleurs", "Rencontre avec le fleuriste et design floral"),
        // 6-9m
        createEvent(nextId(), pivotTime - 8 * MONTH, "avant", "jalon", "Save the Date", "Envoi des pré-invitations"),
        createEvent(nextId(), pivotTime - 7 * MONTH, "avant", "jalon", "Deuxième tenue", "Essayages complémentaires"),
        createEvent(nextId(), pivotTime - 6.5 * MONTH, "avant", "jalon", "Cortège", "Validation des tenues des témoins"),
        // 3-6m
        createEvent("t2", pivotTime - 4 * MONTH, "avant", "jalon", "Envoi des invitations", "Le début de l'attente partagée", { relations: [{ kind: "task", id: "tk9" }, { kind: "message", id: "ml1" }], durationMinutes: 60 }),
        createEvent(nextId(), pivotTime - 3.5 * MONTH, "avant", "jalon", "Alliances", "Choix et commande des bagues"),
        createEvent(nextId(), pivotTime - 3.2 * MONTH, "avant", "jalon", "Lune de miel", "Réservation du voyage de noces"),
        // 1-3m
        createEvent(nextId(), pivotTime - 2.5 * MONTH, "avant", "jalon", "Plan de table", "L'art délicat de placer les invités"),
        createEvent(nextId(), pivotTime - 2 * MONTH, "avant", "jalon", "Détails cérémonie", "Écriture des vœux et musiques"),
        createEvent(nextId(), pivotTime - 1.5 * MONTH, "avant", "jalon", "Menu final", "Validation du nombre de convives"),
        createEvent(nextId(), pivotTime - 1.2 * MONTH, "avant", "jalon", "Essai beauté", "Maquillage et coiffure tests"),
        // Final week
        createEvent(nextId(), pivotTime - 6 * DAY, "avant", "jalon", "Dernier point", "Briefing final prestataires"),
        createEvent(nextId(), pivotTime - 4 * DAY, "avant", "jalon", "La récupération", "Récupération tenues et alliances"),
        createEvent(nextId(), pivotTime - 2 * DAY, "avant", "jalon", "Beauté", "Soins et manucure"),
        // Eve
        createEvent(nextId(), pivotTime - 1 * DAY + 16 * HOUR, "avant", "evenement", "Arrivée", "Installation de la décoration"),
        createEvent("t3", pivotTime - 1 * DAY + 19 * HOUR, "avant", "jalon", "L'aube du grand jour", "Dîner en petit comité"),
        // Early morning (Jour J)
        createEvent(nextId(), pivotTime + 7 * HOUR, "pendant", "evenement", "Réveil", "Un moment de calme", { durationMinutes: 60 }),
        createEvent(nextId(), pivotTime + 8 * HOUR, "pendant", "evenement", "Petit déjeuner", "Prendre des forces", { durationMinutes: 60 }),
        // Preparations
        createEvent("dj1", pivotTime + 10 * HOUR, "pendant", "evenement", "Le temps pour soi", "Coiffure et maquillage", { relations: [{ kind: "team", id: "tm2" }], durationMinutes: 180, resources: ["Suite préparatifs"] }),
        createEvent(nextId(), pivotTime + 13 * HOUR, "pendant", "evenement", "Habillage", "L'instant où tout devient réel", { durationMinutes: 60 }),
        // Setup
        createEvent(nextId(), pivotTime + 11 * HOUR, "pendant", "evenement", "Installation", "Les prestataires s'installent", { durationMinutes: 240, visibility: "equipe" }),
        // First look
        createEvent("dj2", pivotTime + 14.5 * HOUR, "pendant", "evenement", "La première rencontre", "Découverte des tenues", { durationMinutes: 30 }),
        // Guest arrival
        createEvent(nextId(), pivotTime + 15.25 * HOUR, "pendant", "evenement", "L'accueil", "Arrivée des premiers invités", { durationMinutes: 45 }),
        // Detailed ceremony
        createEvent("dj3", pivotTime + 16 * HOUR, "pendant", "evenement", "L'engagement", "Échange des vœux et regards croisés", { location: "Domaine", relations: [{ kind: "guest", id: "g1", role: "lecture" }, { kind: "provider", id: "p3" }, { kind: "music", id: "m2" }], durationMinutes: 90, dependencyIds: ["dj1"], resources: ["Espace cérémonie"] }),
        // After ceremony
        createEvent(nextId(), pivotTime + 17.5 * HOUR, "pendant", "evenement", "La sortie", "Haie d'honneur et effervescence", { durationMinutes: 30 }),
        // Cocktail
        createEvent("dj4", pivotTime + 18 * HOUR, "pendant", "evenement", "La célébration", "Cocktail et musique live", { durationMinutes: 150 }),
        // Meal
        createEvent("dj5", pivotTime + 20.5 * HOUR, "pendant", "evenement", "Le banquet", "Entrée en salle, discours et saveurs", { relations: [{ kind: "provider", id: "p2" }, { kind: "table", id: "tb1" }, { kind: "guest", id: "g1" }], durationMinutes: 120, resources: ["Salle de réception"] }),
        createEvent(nextId(), pivotTime + 22.5 * HOUR, "pendant", "evenement", "Le gâteau", "Moment sucré et pétillant", { durationMinutes: 30 }),
        // First dance
        createEvent("dj6", pivotTime + 23 * HOUR, "pendant", "evenement", "L'ouverture du bal", "Premiers pas sur la piste de danse", { relations: [{ kind: "provider", id: "p4" }, { kind: "music", id: "m3" }], durationMinutes: 30, resources: ["Piste de danse"] }),
        // Party
        createEvent("dj7", pivotTime + 23.5 * HOUR, "pendant", "evenement", "Jusqu'au bout de la nuit", "La fête bat son plein", { durationMinutes: 150 }),
        createEvent(nextId(), pivotTime + 26 * HOUR, "pendant", "evenement", "Encas de nuit", "Redonner de l'énergie", { durationMinutes: 30 }),
        // Closing
        createEvent(nextId(), pivotTime + 28 * HOUR, "pendant", "evenement", "Fin de soirée", "Les dernières notes", { durationMinutes: 60 }),
        // Next day
        createEvent("after1", pivotTime + 34 * HOUR, "apres", "evenement", "Le retour à la réalité", "Brunch du lendemain", { durationMinutes: 180 }),
        createEvent(nextId(), pivotTime + 38 * HOUR, "apres", "evenement", "Départ", "Fermeture du domaine", { durationMinutes: 60 }),
        // Following days
        createEvent(nextId(), pivotTime + 3 * DAY, "apres", "jalon", "Détente", "Repos ou lune de miel"),
        createEvent(nextId(), pivotTime + 5 * DAY, "apres", "jalon", "Règlement final", "Paiement des soldes prestataires"),
        // Following weeks
        createEvent("after2", pivotTime + 10 * DAY, "apres", "message", "Les mots doux", "Envoi des remerciements", { relations: [{ kind: "message", id: "mt3" }, { kind: "memory", id: "mm3" }], durationMinutes: 30 }),
        createEvent("after3", pivotTime + 30 * DAY, "apres", "souvenir", "Mémoires figées", "Découverte de la galerie", { durationMinutes: 120 }),
        // Living archive
        createEvent(nextId(), pivotTime + 60 * DAY, "apres", "souvenir", "Le film", "Réception de la vidéo"),
        createEvent(nextId(), pivotTime + 365 * DAY, "apres", "souvenir", "Noces de coton", "Le premier anniversaire de mariage"),
    ].sort((a, b) => a.time - b.time);
}
//# sourceMappingURL=seed-data.js.map