/**
 * Le récit du futur marié : comprendre, sans jamais inventer.
 * Seules les informations réellement présentes dans la phrase sont extraites ;
 * tout le reste sera marqué comme déduit ou suggéré par le modèle.
 */
import { WEDDING_ROLES } from "./wedding";
import { blueprintFor, buildProject } from "./blueprints";
import type { WorldProject } from "./types";

const MONTHS = [
  "janvier",
  "fevrier",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "aout",
  "septembre",
  "octobre",
  "novembre",
  "decembre",
];

function strip(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function titleCase(s: string) {
  return s
    .split(/\s+/)
    .map((w) => (w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ")
    .trim();
}

  /** Valeur d'un fait extensible : jamais d'invention, jamais de structure libre. */
export type DetailValue = string | number | boolean;

export type StoryReading = {
  day: number | null;
  city: string | null;
  venue: string | null;
  guests: number | null;
  ceremonyH: number | null;
  couple: string | null;
  booked: { role: string; name?: string }[];
  /**
   * Faits bruts destinés à `WorldProject.details` : clés stables snake_case,
   * valeurs telles que répondues (conversion nombre uniquement quand la
   * question le déclare). Voir le registre de questions (mapsTo « detail:* »).
   */
  details?: Record<string, DetailValue>;
};

const ROLE_WORDS: { re: RegExp; role: string }[] = [
  { re: /photographe/, role: "Photographe" },
  { re: /videaste|video/, role: "Vidéaste" },
  { re: /traiteur/, role: "Traiteur" },
  { re: /\bdj\b|musique|groupe/, role: "Musique / DJ" },
  { re: /fleuriste|fleurs/, role: "Fleuriste" },
  { re: /coiffeur|coiffure|maquill/, role: "Coiffure & maquillage" },
  { re: /patisser|gateau|piece montee/, role: "Pâtisserie" },
  { re: /officiant|ceremonie laique/, role: "Officiant / cérémonie" },
  { re: /navette|transport/, role: "Transport" },
  { re: /hebergement|chambres|hotel/, role: "Hébergement" },
  { re: /lieu|chateau|domaine|salle|ferme|manoir/, role: "Lieu de réception" },
  { re: /decoration|deco\b/, role: "Décoration" },
];

/** Lit une phrase libre et en tire les informations explicites. */
export function readStory(text: string, now = new Date()): StoryReading {
  const t = strip(text);

  // Date : « 12 septembre 2027 » ou « 12/09/2027 »
  let day: number | null = null;
  const dm = t.match(/\b(\d{1,2})\s+([a-z]+)\s*(\d{4})?/);
  const dmy = t.match(/\b(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})\b/);
  if (dmy) {
    const y = Number(dmy[3]);
    day = new Date(y < 100 ? 2000 + y : y, Number(dmy[2]) - 1, Number(dmy[1])).getTime();
  } else if (dm) {
    const idx = MONTHS.indexOf(dm[2] ?? "");
    if (idx >= 0) {
      const y = dm[3] ? Number(dm[3]) : now.getFullYear();
      const d = new Date(y, idx, Number(dm[1]));
      if (!dm[3] && d.getTime() < now.getTime()) d.setFullYear(y + 1);
      day = d.getTime();
    }
  }

  // Heure de cérémonie
  let ceremonyH: number | null = null;
  const hour = t.match(/(?:ceremonie|mairie|eglise)[^.]{0,40}?(\d{1,2})\s*h\s*(\d{2})?/);
  const anyHour = hour ?? t.match(/\ba\s+(\d{1,2})\s*h\s*(\d{2})?/);
  if (anyHour) ceremonyH = Number(anyHour[1]) + Number(anyHour[2] ?? 0) / 60;

  // Invités
  const guestsMatch = t.match(/(\d{2,4})\s*(?:invit|convive|personne)/);
  const guests = guestsMatch ? Number(guestsMatch[1]) : null;

  // Ville : « à Lille » (on garde le texte original pour la casse)
  let city: string | null = null;
  const cityMatch = text.match(/\b(?:à|a)\s+([A-ZÉÈÀÂÎÔÛ][\wÀ-ÿ'’-]+(?:[- ][A-ZÉÈÀÂÎÔÛ][\wÀ-ÿ'’-]+)?)/);
  if (cityMatch?.[1]) city = cityMatch[1].trim();

  // Lieu : « au Château X », « au Domaine … »
  let venue: string | null = null;
  const venueMatch = text.match(
    /\b(?:au|à la|a la|dans le|dans la)\s+((?:Château|Chateau|Domaine|Manoir|Ferme|Salle|Grange|Villa|Mas)[\wÀ-ÿ'’ -]{0,40})/i,
  );
  if (venueMatch?.[1]) venue = titleCase(venueMatch[1].trim().replace(/\s+(à|a)\s+.*$/i, ""));

  // Prestataires cités comme déjà réservés
  const booked: { role: string }[] = [];
  if (/(reserv|choisi|trouve|signe|bloque)/.test(t)) {
    for (const { re, role } of ROLE_WORDS) {
      if (re.test(t) && WEDDING_ROLES.includes(role)) booked.push({ role });
    }
  }

  // Couple : « Camille et Sofiane »
  let couple: string | null = null;
  const coupleMatch = text.match(
    /\b([A-ZÉÈÀ][\wÀ-ÿ'’-]+)\s+(?:et|&)\s+([A-ZÉÈÀ][\wÀ-ÿ'’-]+)\b/,
  );
  if (coupleMatch) couple = `${coupleMatch[1]} & ${coupleMatch[2]}`;

  return { day, city, venue, guests, ceremonyH, couple, booked };
}

/**
 * Lecture d'AIME mise de côté pour le récit en cours : la page du projet
 * retrouve exactement ce que l'agent a compris, sans le relire une seconde fois.
 */
const CACHE_KEY = (text: string) => `aime:lecture:${text.trim().slice(0, 400)}`;

export function rememberReading(text: string, reading: StoryReading) {
  try {
    sessionStorage.setItem(CACHE_KEY(text), JSON.stringify(reading));
  } catch {
    /* stockage indisponible : la lecture par expressions reste utilisée */
  }
}

export function cachedReading(text: string): StoryReading | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY(text));
    return raw ? (JSON.parse(raw) as StoryReading) : null;
  } catch {
    return null;
  }
}

/** Récit → modèle complet du projet, prêt à alimenter toutes les vues. */
export function projectFromStory(
  text: string,
  now = Date.now(),
  typeId?: string | null,
): WorldProject {
  const cached = typeof window === "undefined" ? null : cachedReading(text);
  return projectFromReading(cached ?? readStory(text, new Date(now)), text, now, typeId);
}

/**
 * Une lecture (par AIME ou par repérage) → le modèle complet du projet.
 * Le modèle employé dépend du type de projet choisi : le mariage n'en est
 * qu'un parmi d'autres.
 */
export function projectFromReading(
  reading: StoryReading,
  text: string,
  now = Date.now(),
  typeId?: string | null,
): WorldProject {
  /* Aucun type explicite : on retombe sur le blueprint générique existant,
     jamais sur un mariage supposé. */
  const bp = blueprintFor(typeId);
  const fallback = new Date(now + 400 * 86_400_000);

  fallback.setHours(0, 0, 0, 0);
  const dayDate = reading.day ? new Date(reading.day) : fallback;
  dayDate.setHours(0, 0, 0, 0);

  return buildProject(bp, {
    title: reading.couple,
    day: dayDate.getTime(),
    dayConfidence: reading.day ? "confirme" : "a_confirmer",
    city: reading.city,
    venue: reading.venue,
    guests: reading.guests,
    pivotH: reading.ceremonyH,
    booked: reading.booked.filter((b) => bp.roles.includes(b.role)),
    story: text,
    now,
    ...(reading.details && Object.keys(reading.details).length
      ? { details: reading.details }
      : {}),
    ...(typeId ? { typeId } : {}),
  });
}

