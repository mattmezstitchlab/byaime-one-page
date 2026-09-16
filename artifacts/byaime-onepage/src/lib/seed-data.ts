import { TimelineEvent } from "./types";

const MONTH = 30 * 86400000;
const DAY = 86400000;
const HOUR = 3600000;

/*
 * L'ancre du Jour J : l'heure de la cérémonie.
 *
 * Constat du 15/09 : le déroulé était généré en heures fixes depuis le pivot
 * (« Réveil » à +7 h, cérémonie à +16 h…), et le pivot portait l'heure du
 * texte — souvent 12 h — si bien que la cérémonie tombait à 4 h du matin le
 * lendemain sur le chemin réel de création. Le déroulé s'ancre désormais sur
 * le début du jour du pivot et sur l'heure de cérémonie : chaque étape est
 * un décalage autour de cette ancre, et une cérémonie à 15 h ou 16 h décale
 * toute la journée avec elle.
 *
 * Sans heure dans l'intention, l'ancre reste 16 h — la valeur historique du
 * germe, celle que verrouille `seed.test.ts`.
 */
export const DEFAULT_CEREMONY_HOUR = 16;

/** La préparation ne commence jamais avant 6 h du matin. */
const EARLIEST_PREP_HOUR = 6;
/** L'avance du bloc préparatifs sur la cérémonie (le delta du « Réveil »). */
const PREP_LEAD_HOURS = 9;
/** Compression minimale de cette avance quand la cérémonie est tôt (jamais moins de 3 h). */
const MIN_PREP_LEAD_HOURS = 3;

const deaccent = (value: string): string =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const FR_HOUR = "(\\d{1,2})\\s*h(?:eure?s?)?(?:\\s*(\\d{2}))?";
const CEREMONY_WORD = "(?:ceremon\\w*|engagement|voe?ux)";
const UNION_WORD = "(?:mariage|noces|wedding)";

function readHour(match: RegExpMatchArray, meridiem?: string): number | null {
  const hour = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || minutes > 59) return null;
  const value = hour + minutes / 60;
  if (/p\.?m\.?/i.test(meridiem ?? "")) return hour < 12 ? value + 12 : value;
  if (/a\.?m\.?/i.test(meridiem ?? "")) return hour === 12 ? value - 12 : value;
  return value;
}

/**
 * L'heure de cérémonie lue dans l'intention, ou null.
 *
 * Recherche déterministe, sans IA : « cérémonie à 15h30 », « à 16 heures la
 * cérémonie », « ceremony at 3pm », puis à défaut « mariage à 16h ». Une heure
 * invalide (« à 25h ») vaut absence : l'ancre par défaut prend le relais.
 * Vivre ici et non dans `parser.ts` évite le cycle parser → seed-data → parser.
 */
export function ceremonyHourFromIntention(raw: string): number | null {
  const text = deaccent(raw ?? "");
  if (!text) return null;
  const windows = [
    new RegExp(`${CEREMONY_WORD}[^.!?]{0,40}?\\ba\\s+${FR_HOUR}`),
    new RegExp(`\\ba\\s+${FR_HOUR}[^.!?]{0,40}?${CEREMONY_WORD}`),
    new RegExp(`${CEREMONY_WORD}[^.!?]{0,40}?\\bat\\s+(\\d{1,2})(?::(\\d{2}))?\\s*(a\\.?m\\.?|p\\.?m\\.?)?`),
    new RegExp(`\\bat\\s+(\\d{1,2})(?::(\\d{2}))?\\s*(a\\.?m\\.?|p\\.?m\\.?)?[^.!?]{0,40}?${CEREMONY_WORD}`),
    new RegExp(`${UNION_WORD}[^.!?]{0,40}?\\ba\\s+${FR_HOUR}`),
    new RegExp(`\\ba\\s+${FR_HOUR}[^.!?]{0,40}?${UNION_WORD}`),
  ];
  for (const pattern of windows) {
    const match = text.match(pattern);
    if (!match) continue;
    const hour = readHour(match, match[3]);
    if (hour !== null) return hour;
  }
  return null;
}

function startOfLocalDay(time: number): number {
  const day = new Date(time);
  day.setHours(0, 0, 0, 0);
  return day.getTime();
}

export function generateWeddingTimeline(pivotTime: number, universe: string, intentionText: string): TimelineEvent[] {
  let idCounter = 100;
  const nextId = () => `seed_${idCounter++}`;

  const ceremonyHour = ceremonyHourFromIntention(intentionText) ?? DEFAULT_CEREMONY_HOUR;
  const dayStart = startOfLocalDay(pivotTime);
  /* Une cérémonie tôt compresse l'avance des préparatifs sans jamais la faire
     passer sous 3 h ; une cérémonie à 15 h ou plus garde l'avance complète. */
  const prepLead = Math.min(
    PREP_LEAD_HOURS,
    Math.max(ceremonyHour - EARLIEST_PREP_HOUR, MIN_PREP_LEAD_HOURS),
  );
  /** Un Moment du Jour J : décalage en heures autour de l'ancre cérémonie. */
  const at = (deltaHours: number): number =>
    dayStart + (ceremonyHour + (deltaHours < 0 ? deltaHours * (prepLead / PREP_LEAD_HOURS) : deltaHours)) * HOUR;

  const baseEvent = {
    status: "prepare" as const,
    confidence: "suggere" as const,
    universe: universe || "Général",
    provenance: "suggested" as const,
    visibility: "equipe" as const,
    relations: [],
    dependencyIds: [],
    resources: [],
    propagation: { state: "none" as const }
  };

  const createEvent = (
    id: string,
    time: number,
    phase: "avant" | "pendant" | "apres",
    kind: TimelineEvent["kind"],
    title: string,
    detail: string,
    overrides: Partial<TimelineEvent> = {}
  ): TimelineEvent => ({
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

    // Jour J — chaque étape est un décalage autour de l'ancre cérémonie (16 h par défaut)
    createEvent(nextId(), at(-9), "pendant", "evenement", "Réveil", "Un moment de calme", { durationMinutes: 60 }),
    createEvent(nextId(), at(-8), "pendant", "evenement", "Petit déjeuner", "Prendre des forces", { durationMinutes: 60 }),

    // Preparations
    createEvent("dj1", at(-6), "pendant", "evenement", "Le temps pour soi", "Coiffure et maquillage", { relations: [{ kind: "team", id: "tm2" }], durationMinutes: 180, resources: ["Suite préparatifs"] }),
    createEvent(nextId(), at(-3), "pendant", "evenement", "Habillage", "L'instant où tout devient réel", { durationMinutes: 60 }),

    // Setup
    createEvent(nextId(), at(-5), "pendant", "evenement", "Installation", "Les prestataires s'installent", { durationMinutes: 240, visibility: "equipe" }),

    // First look — le photographe du Monde (p3) couvre la découverte des tenues
    createEvent("dj2", at(-1.5), "pendant", "evenement", "La première rencontre", "Découverte des tenues", { relations: [{ kind: "provider", id: "p3" }], durationMinutes: 30 }),

    // Guest arrival
    createEvent(nextId(), at(-0.75), "pendant", "evenement", "L'accueil", "Arrivée des premiers invités", { durationMinutes: 45 }),

    // Detailed ceremony — l'ancre du Jour J
    createEvent("dj3", at(0), "pendant", "evenement", "L'engagement", "Échange des vœux et regards croisés", { location: "Domaine", relations: [{ kind: "guest", id: "g1", role: "lecture" }, { kind: "provider", id: "p3" }, { kind: "music", id: "m2" }], durationMinutes: 90, dependencyIds: ["dj1"], resources: ["Espace cérémonie"] }),

    // After ceremony
    createEvent(nextId(), at(1.5), "pendant", "evenement", "La sortie", "Haie d'honneur et effervescence", { durationMinutes: 30 }),

    // Cocktail
    createEvent("dj4", at(2), "pendant", "evenement", "La célébration", "Cocktail et musique live", { durationMinutes: 150 }),

    // Meal
    createEvent("dj5", at(4.5), "pendant", "evenement", "Le banquet", "Entrée en salle, discours et saveurs", { relations: [{ kind: "provider", id: "p2" }, { kind: "table", id: "tb1" }, { kind: "guest", id: "g1" }], durationMinutes: 120, resources: ["Salle de réception"] }),
    createEvent(nextId(), at(6.5), "pendant", "evenement", "Le gâteau", "Moment sucré et pétillant", { durationMinutes: 30 }),

    // First dance
    createEvent("dj6", at(7), "pendant", "evenement", "L'ouverture du bal", "Premiers pas sur la piste de danse", { relations: [{ kind: "provider", id: "p4" }, { kind: "music", id: "m3" }], durationMinutes: 30, resources: ["Piste de danse"] }),

    // Party
    createEvent("dj7", at(7.5), "pendant", "evenement", "Jusqu'au bout de la nuit", "La fête bat son plein", { durationMinutes: 150 }),
    createEvent(nextId(), at(10), "pendant", "evenement", "Encas de nuit", "Redonner de l'énergie", { durationMinutes: 30 }),

    // Closing
    createEvent(nextId(), at(12), "pendant", "evenement", "Fin de soirée", "Les dernières notes", { durationMinutes: 60 }),

    // Next day — le brunch et le départ suivent l'heure de la fête
    createEvent("after1", at(18), "apres", "evenement", "Le retour à la réalité", "Brunch du lendemain", { durationMinutes: 180 }),
    createEvent(nextId(), at(22), "apres", "evenement", "Départ", "Fermeture du domaine", { durationMinutes: 60 }),

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
