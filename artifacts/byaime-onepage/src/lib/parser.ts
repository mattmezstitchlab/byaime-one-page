import { WorldProject, fact } from './types';
import { normalizeProject } from './project-migration';
import { generateWeddingTimeline } from './seed-data';
import { DEFAULT_HERO_VISUAL } from './world-visuals';
import { defaultPublicPage } from './public-page';

/*
 * Lecture de la date dans une intention libre.
 *
 * Constat du 14/09 : l'ancien code ne lisait que l'année et le mois écrits en
 * toutes lettres. Le jour n'était JAMAIS pris en compte — il restait celui du
 * jour courant — et une date numérique (« 14/08/2027 ») ne donnait même pas le
 * mois. Résultat : la question « Quand a lieu le mariage ? » de l'onboarding
 * semblait ignorée.
 *
 * Cette dérivation est pure et testée (`parser.test.ts`) : elle rend le jour,
 * le mois et l'année réellement trouvés, et dit ce qui manque.
 */

const FR_MONTHS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];
const EN_MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const ACCENTS: Record<string, string> = { "à": "a", "â": "a", "ä": "a", "ç": "c", "é": "e", "è": "e", "ê": "e", "ë": "e", "î": "i", "ï": "i", "ô": "o", "ö": "o", "ù": "u", "û": "u", "ü": "u", "ÿ": "y" };

function deaccent(value: string): string {
  return value.toLowerCase().split("").map(char => ACCENTS[char] ?? char).join("");
}

/** Index du mois (0-11) dans un mot français ou anglais, -1 sinon. */
export function monthIndex(word: string): number {
  const clean = deaccent(word);
  const fr = FR_MONTHS.indexOf(clean);
  if (fr >= 0) return fr;
  return EN_MONTHS.indexOf(clean);
}

export type ParsedDate = {
  value: number;
  confidence: "deduit" | "confirme";
  /** Ce qui a réellement été lu dans le texte : ce qui manque vient de « maintenant ». */
  found: { day: boolean; month: boolean; year: boolean };
};

const MONTH_WORD = "(?:janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre|january|february|march|april|may|june|july|august|september|october|november|december)";

export function parseDateFromText(
  raw: string,
  options: { now?: Date; locale?: "fr" | "en" } = {},
): ParsedDate {
  const now = options.now ?? new Date();
  const locale = options.locale ?? "fr";
  const text = deaccent(raw.replace(/[\u00a0\s]+/g, " "));

  let day: number | undefined;
  let month: number | undefined;
  let year: number | undefined;

  /* 1. ISO : 2027-08-14. */
  const iso = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]) - 1;
    day = Number(iso[3]);
  }

  /* 2. Numérique court : 14/08/2027, 14.08.27, 08-14-2027. Ambiguïté jour/mois
        levée par la valeur (> 12), sinon par la langue du parcours. */
  if (month === undefined) {
    const short = text.match(/\b(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{2,4})\b/);
    if (short) {
      const first = Number(short[1]);
      const second = Number(short[2]);
      let fullYear = Number(short[3]);
      if (fullYear < 100) fullYear += fullYear > 50 ? 1900 : 2000;
      const dayFirst = locale === "fr" ? second <= 12 : first > 12;
      if (first > 12 || dayFirst) {
        day = first;
        month = second - 1;
      } else {
        month = first - 1;
        day = second;
      }
      year = fullYear;
    }
  }

  /* 3. Écrit en toutes lettres : « le 14 août 2027 » ou « August 14, 2027 ». */
  if (month === undefined) {
    const dayFirst = text.match(new RegExp(`\\b(\\d{1,2})(?:er)?\\s+(${MONTH_WORD})\\b`));
    if (dayFirst) {
      day = Number(dayFirst[1]);
      month = monthIndex(dayFirst[2]);
    } else {
      const monthFirst = text.match(new RegExp(`\\b(${MONTH_WORD})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`));
      if (monthFirst) {
        month = monthIndex(monthFirst[1]);
        day = Number(monthFirst[2]);
      }
    }
  }

  /* 4. Mois seul : « en août », « next August ». */
  if (month === undefined) {
    const monthOnly = text.match(new RegExp(`\\b(${MONTH_WORD})\\b`));
    if (monthOnly) month = monthIndex(monthOnly[1]);
  }

  /* 5. Année : n'importe quel format ci-dessus, ou « 2027 » isolé. */
  if (year === undefined) {
    const yearOnly = text.match(/\b(20\d{2})\b/);
    if (yearOnly) year = Number(yearOnly[1]);
  }

  const found = {
    day: day !== undefined,
    month: month !== undefined,
    year: year !== undefined,
  };

  /* Rien de lu : on garde le comportement historique (même jour, l'an prochain). */
  if (!found.day && !found.month && !found.year) {
    const fallback = new Date(now);
    fallback.setFullYear(fallback.getFullYear() + 1);
    return { value: fallback.getTime(), confidence: "deduit", found };
  }

  /*
   * Construction explicite, jamais par `setMonth` successif : poser un mois à
   * 30 jours quand le jour courant vaut 31 faisait basculer sur le mois suivant.
   * Un mois annoncé sans jour s'ancre au 1er, pas au quantième d'aujourd'hui.
   */
  const resolvedYear = year ?? now.getFullYear();
  const resolvedMonth = month ?? now.getMonth();
  const resolvedDay = day ?? (found.month ? 1 : now.getDate());
  const value = new Date(resolvedYear, resolvedMonth, resolvedDay, 12, 0, 0, 0).getTime();

  return { value, confidence: "confirme", found };
}

export function parseIntention(text: string): Partial<WorldProject> {
  const parsedDate = parseDateFromText(text);

  const pivotDate = new Date(parsedDate.value);
  const pivotConfidence: "deduit" | "confirme" | "manquant" = parsedDate.confidence;

  let guests = null;
  let guestsConf: "deduit" | "confirme" | "manquant" = "manquant";
  const guestsMatch = text.match(/(\d{2,4})\s*(?:invit|convive|personne|guests?|invitees)/i);
  if (guestsMatch) {
    guests = parseInt(guestsMatch[1]);
    guestsConf = "confirme";
  }

  let budget = null;
  let budgetConf: "deduit" | "confirme" | "manquant" = "manquant";
  let currency: string | undefined;
  /* Symbole après le montant (FR : « 20 000 € ») ou avant (EN : « $20,000 »).
     R$ doit être testé avant $ ; le « k » reste multiplicateur. */
  const currencyOf = (token: string) => {
    const t = token.toLowerCase();
    if (/r\$|brl/.test(t)) return "BRL";
    if (/\$|usd|dollar/.test(t)) return "USD";
    if (/£|gbp|livre/.test(t)) return "GBP";
    if (/chf/.test(t)) return "CHF";
    if (/mad|(^|\s)dh(\s|$)/.test(t)) return "MAD";
    if (/aed/.test(t)) return "AED";
    return "EUR";
  };
  const budgetSuffix = text.match(/(\d{1,3}(?:[.,\s]?\d{3})*)\s*(k)?\s*(€|euros?|k€|C\$|R\$|BRL|\$|USD|dollars?|£|GBP|livres?|CHF|MAD|DH|AED)/i);
  const budgetPrefix = budgetSuffix ? null : text.match(/(C\$|R\$|€|\$|£|CHF|MAD|AED)\s*(\d{1,3}(?:[.,\s]?\d{3})*)\s*(k)?/i);
  const budgetMatch = budgetSuffix ?? budgetPrefix;
  if (budgetMatch) {
    const suffix = Boolean(budgetSuffix);
    const raw = (suffix ? budgetMatch[1] : budgetMatch[2]).replace(/[.,\s]/g, '');
    const token = suffix ? budgetMatch[3] : budgetMatch[1];
    const kilo = suffix ? budgetMatch[2] : budgetMatch[3];
    budget = parseInt(raw);
    if (kilo === "k" || budgetMatch[0].toLowerCase().includes('k€')) budget *= 1000;
    currency = /c\$/.test(token.toLowerCase()) ? "CAD" : currencyOf(token);
    budgetConf = "confirme";
  }

  let city = null;
  let cityConf: "deduit" | "confirme" | "manquant" = "manquant";
  const cityMatch = text.match(/\b(?:à|a|près de|proche de|near|in)\s+([A-ZÀ-Ü][A-Za-zÀ-ÿ\s'-]+)\b/);
  if (cityMatch && cityMatch[1].trim().length > 2) {
    city = cityMatch[1].trim();
    cityConf = "confirme";
  }

  let universe = "Événement";
  if (/(mariage|marier|épouser|wedding|marry|married)/i.test(text)) universe = "Mariage";
  else if (/(anniversaire)/i.test(text)) universe = "Anniversaire";
  else if (/(séminaire|seminaire|entreprise|team building)/i.test(text)) universe = "Entreprise";
  else if (/(voyage|vacances|retraite)/i.test(text)) universe = "Voyage";

  let title = "Nouveau Projet";
  const coupleMatch = text.match(/\b([A-Z][a-z]+)\s+(?:et|&)\s+([A-Z][a-z]+)\b/);
  if (coupleMatch) {
    title = `${coupleMatch[1]} & ${coupleMatch[2]}`;
  } else if (universe === "Mariage") {
    title = "Notre Mariage";
  } else if (universe !== "Événement") {
    title = universe;
  }

  return {
    schemaVersion: 2,
    title,
    universe,
    pivot: fact(pivotDate.getTime(), pivotConfidence),
    guestsCount: fact(guests, guestsConf),
    budget: fact(budget, budgetConf),
    currency,
    city: fact(city, cityConf),
  };
}

/** Métadonnées du parcours d'onboarding (persona Couple/Pro, devise). */
export type IntentionProjectMeta = {
  persona?: "couple" | "pro";
  currency?: string;
};

export function createInitialProject(draft: Partial<WorldProject>, intentionText: string, meta: IntentionProjectMeta = {}): WorldProject {
  const pivotTime = draft.pivot?.value || Date.now() + 31536000000;
  const isWedding = draft.universe === "Mariage";
  const persona = meta.persona ?? draft.persona ?? "couple";
  const currency = draft.currency ?? meta.currency ?? "EUR";

  return normalizeProject({
    schemaVersion: 2,
    storyVersion: 1,
    id: crypto.randomUUID(),
    title: draft.title || "Projet",
    subtitle: intentionText,
    universe: draft.universe || "Général",
    persona,
    currency,
    /*
     * Le Monde s'ouvre toujours sur un grand visuel. Un nouveau projet n'a
     * aucune photo : sans valeur par défaut, le hero tombait sur un fond blanc
     * et l'éditeur de visuel restait caché dans le panneau de l'orbe. On pose
     * donc le visuel de réception du manifeste (remplaçable en un clic depuis
     * le hero lui-même).
     */
    heroVisual: draft.heroVisual ?? DEFAULT_HERO_VISUAL,
    pivot: draft.pivot || fact(pivotTime, "deduit"),
    city: draft.city || fact(null, "manquant"),
    venue: draft.venue || fact(null, "manquant"),
    guestsCount: draft.guestsCount || fact(null, "manquant"),
    budget: draft.budget || fact(null, "manquant"),

    // Use the rich timeline seed from the helper
    timeline: isWedding
      ? generateWeddingTimeline(pivotTime, draft.universe || "Général", intentionText)
      : generateWeddingTimeline(pivotTime, draft.universe || "Général", intentionText).filter(e => e.phase === "avant").slice(0, 5),

    tasks: isWedding ? [
      { id: "tk1", title: "Définir le budget global", phase: "12m+", status: "termine", priority: "haute" },
      { id: "tk2", title: "Trouver le lieu de réception", phase: "12m+", status: "en_cours", priority: "haute", owner: "Les deux", dueDate: pivotTime - 300 * 86400000 },
      { id: "tk3", title: "Créer la liste d'invités préliminaire", phase: "12m+", status: "en_cours", priority: "normale", owner: "Élise", dueDate: pivotTime - 270 * 86400000 },
      { id: "tk4", title: "Réserver le photographe", phase: "6-12m", status: "a_faire", priority: "haute", owner: "Paul", dueDate: pivotTime - 240 * 86400000 },
      { id: "tk5", title: "Choisir le traiteur", phase: "6-12m", status: "a_faire", priority: "haute" },
      { id: "tk6", title: "Envoyer les Save the Date", phase: "6-12m", status: "a_faire", priority: "normale" },
      { id: "tk7", title: "Choisir la robe / le costume", phase: "6-12m", status: "a_faire", priority: "haute" },
      { id: "tk8", title: "Planifier la cérémonie laïque", phase: "3-6m", status: "a_faire", priority: "normale" },
      { id: "tk9", title: "Envoyer les faire-part", phase: "3-6m", status: "a_faire", priority: "haute" },
      { id: "tk10", title: "Finaliser le plan de table", phase: "1-3m", status: "a_faire", priority: "haute", owner: "Élise", dueDate: pivotTime - 30 * 86400000 },
    ] : [],

    guests: isWedding ? [
      { id: "g1", name: "Sophie Martin", role: "temoin", rsvp: "confirme", dietary: "Végétarien", attendance: { ceremony: true, cocktail: true, dinner: true, brunch: true } },
      { id: "g2", name: "Lucas Dubois", role: "temoin", rsvp: "confirme", attendance: { ceremony: true, cocktail: true, dinner: true, brunch: true } },
      { id: "g3", name: "Marie Laurent", role: "famille", householdId: "h2", adults: 1, children: 0, plusOne: false, invitationSent: true, rsvp: "en_attente", attendance: { ceremony: true, cocktail: true, dinner: true, brunch: false } },
      { id: "g4", name: "Jean Laurent", role: "famille", householdId: "h2", adults: 1, children: 0, plusOne: false, invitationSent: true, rsvp: "en_attente", dietary: "Sans gluten", attendance: { ceremony: true, cocktail: true, dinner: true, brunch: false } },
      { id: "g5", name: "Hugo Bernard", role: "invite", rsvp: "confirme", tableId: "tb1", attendance: { ceremony: true, cocktail: true, dinner: true, brunch: false } },
      { id: "g6", name: "Camille Petit", role: "invite", rsvp: "decline", attendance: { ceremony: false, cocktail: false, dinner: false, brunch: false } },
    ] : [],

    tables: isWedding ? [
      { id: "tb1", name: "Table d'Honneur", capacity: 8 },
      { id: "tb2", name: "Table Famille", capacity: 10 },
      { id: "tb3", name: "Table Amis", capacity: 10 },
    ] : [],

    providers: isWedding ? [
      { id: "p1", category: "lieu", role: "Lieu de réception", name: "Château de la Tour", status: "reserve", amountCents: 450000, paidCents: 150000, nextAction: "Visite technique prévue le mois prochain" },
      { id: "p2", category: "traiteur", role: "Traiteur", status: "devis", amountCents: 850000, nextAction: "Validation du menu dégustation" },
      { id: "p3", category: "photo", role: "Photographe", name: "Studio Lumière", status: "contacte" },
      { id: "p4", category: "musique", role: "DJ", status: "recherche" },
      { id: "p5", category: "fleuriste", role: "Fleuriste", status: "recherche" },
    ] : [],

    payments: isWedding ? [
      { id: "pay1", label: "Acompte Lieu", amountCents: 150000, at: Date.now() - 30*86400000, state: "paye", providerId: "p1" },
      { id: "pay2", label: "Solde Lieu", amountCents: 300000, at: pivotTime - 30*86400000, state: "du", providerId: "p1" },
    ] : [],

    documents: isWedding ? [
      { id: "d1", title: "Contrat de location", kind: "contrat", providerId: "p1", at: Date.now() - 30*86400000 },
      { id: "d2", title: "Devis Traiteur (Option 1)", kind: "devis", providerId: "p2", at: Date.now() - 5*86400000 },
      { id: "d3", title: "Brochure Photographe", kind: "autre", providerId: "p3", at: Date.now() - 2*86400000 },
    ] : [],

    communications: isWedding ? [
      { id: "c1", subject: "Save the Date", type: "invitation", status: "brouillon", audience: "Tous les invités" },
      { id: "c2", subject: "Demande de devis DJ", type: "info", status: "envoye", sentAt: Date.now() - 2*86400000, audience: "Prestataires potentiels" },
    ] : [],

    logistics: {
      accommodations: isWedding ? [
        { id: "a1", name: "Hôtel du Centre", capacity: 20, booked: 12, address: "15 Rue Principale" }
      ] : [],
      shuttles: isWedding ? [
        { id: "s1", route: "Domaine -> Hôtels", departure: "02:00", capacity: 50 },
        { id: "s2", route: "Domaine -> Hôtels", departure: "04:00", capacity: 50 },
      ] : [],
      parking: isWedding ? "Parking visiteurs à 250 m du domaine. Navette PMR sur demande." : "",
      accessibility: isWedding ? "Accès de plain-pied à la salle, rampe côté jardin, chambre PMR à réserver." : "",
      weatherFallback: isWedding ? "Repli du cocktail sous la verrière. Prévoir 40 chaises supplémentaires." : "",
      emergencyContacts: isWedding ? [
        { id: "ec1", name: "Claire Martin", phone: "06 42 18 73 20", role: "Coordination jour J" },
        { id: "ec2", name: "Domaine de la Tour", phone: "03 20 54 18 90", role: "Lieu" }
      ] : [],
      packing: isWedding ? [
        { id: "pk1", label: "Urne et livre d'or", done: false },
        { id: "pk2", label: "Alliances", done: false },
        { id: "pk3", label: "Kit retouches et urgence", done: true },
        { id: "pk4", label: "Signalétique et plans de table", done: false }
      ] : []
    },

    ceremony: isWedding ? {
      structure: ["Accueil des invités", "Entrée des mariés", "Lecture de Sophie", "Échange des vœux", "Échange des alliances", "Signature", "Sortie"],
      notes: "Une cérémonie laïque courte, intime et lumineuse. Prévoir un pupitre et deux chaises pour les témoins.",
      readings: [{ id: "r1", title: "Lecture à choisir", reader: "Sophie Martin", text: "À compléter avec un texte qui vous ressemble." }],
      vows: [{ id: "v1", person: "Élise", text: "" }, { id: "v2", person: "Paul", text: "" }],
      traditions: ["Échange des alliances", "Discours des témoins"],
      menu: "Entrée fraîche · plat végétal ou volaille · dessert de saison",
      drinks: "Champagne à l'arrivée, vins du domaine, bar sans alcool",
      cake: "Pièce montée aux fruits rouges",
      firstDance: "À choisir"
    } : { structure: [], notes: "", readings: [], vows: [], traditions: [], menu: "", drinks: "", cake: "", firstDance: "" },
    music: isWedding ? [
      { id: "m1", moment: "Entrée des mariés", title: "À choisir", artist: "", status: "a_choisir", provenance: "demo", timelineEventIds: [] },
      { id: "m2", moment: "Cérémonie · sortie", title: "Home", artist: "Edward Sharpe & The Magnetic Zeros", status: "valide", provenance: "demo", timelineEventIds: ["dj3"] },
      { id: "m3", moment: "Ouverture du bal", title: "À choisir", artist: "", status: "a_choisir", provenance: "demo", timelineEventIds: ["dj6"] },
      { id: "m4", moment: "Fin de soirée", title: "Playlist libre", artist: "", status: "valide", notes: "Prévoir un set dansant, sans obligation de décennie.", provenance: "demo", timelineEventIds: [] }
    ] : [],
    team: isWedding ? [
      { id: "tm1", name: "Élise & Paul", role: "Couple", contact: "", responsibilities: ["Décisions finales", "Vœux", "Invités"] },
      { id: "tm2", name: "Claire Martin", role: "Coordination jour J", contact: "06 42 18 73 20", responsibilities: ["Run sheet", "Prestataires", "Urgences"] },
      { id: "tm3", name: "Sophie Martin", role: "Témoin", contact: "", responsibilities: ["Lecture", "Livre d'or", "Kit urgence"] }
    ] : [],
    /* La page publique naît composée : le kit livre ses liaisons par défaut,
       l'utilisateur n'assemble rien (pont AIME-COMPOSER, tranche 1). */
    publicPage: defaultPublicPage(),
    memoryChecklist: isWedding ? [
      { id: "mc1", label: "La première rencontre des familles", done: false },
      { id: "mc2", label: "Les vœux", done: false },
      { id: "mc3", label: "La photo de groupe complète", done: false },
      { id: "mc4", label: "La première danse", done: false },
      { id: "mc5", label: "Le lancer de bouquet", done: false }
    ] : [],
    memories: isWedding ? [
      { id: "mm1", kind: "shot", title: "Portraits des grands-parents", owner: "Photographe", status: "a_faire" },
      { id: "mm2", kind: "shot", title: "Photo de groupe complète", owner: "Claire", status: "a_faire" },
      { id: "mm3", kind: "album", title: "Choisir les photos de l'album", owner: "Les deux", status: "a_faire" },
      { id: "mm4", kind: "rappel", title: "Anniversaire de mariage · 1 an", owner: "AIME", status: "a_faire" }
    ] : [],
    messageTemplates: isWedding ? [
      { id: "mt1", title: "Relance RSVP", type: "rappel", body: "Bonjour, petit rappel pour confirmer votre présence avant le 15 juin. À très vite !" },
      { id: "mt2", title: "Informations pratiques", type: "pratique", body: "Retrouvez ici les horaires, l'adresse, le parking et les navettes." },
      { id: "mt3", title: "Merci pour votre présence", type: "remerciement", body: "Merci d'avoir partagé cette journée avec nous. Votre présence nous a beaucoup touchés." }
    ] : [],
    messageLogs: isWedding ? [
      { id: "ml1", templateId: "mt1", recipient: "Marie Laurent", sentAt: Date.now() - 3 * 86400000, status: "simule", note: "Envoi local simulé" }
    ] : [],
    media: [],
    messages: [],
    missing: isWedding ? ["Adresse définitive du lieu", "Choix de la musique d'entrée", "Texte des vœux"] : []
  });
}
