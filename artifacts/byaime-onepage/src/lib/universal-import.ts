import {
  DISPOO_DOSSIER_KIND,
  DISPOO_DOSSIER_VERSION,
  parseDispooDossierText,
  type DispooDossierV1,
} from "./dispoo-dossier";

/*
 * L'import universel : un JSON venu de n'importe quel site de mariage (ou
 * d'un autre univers AIME) est passé au crible des infos standard — identité,
 * équipe, programme, logistique, budget, invités — puis normalisé en Dossier
 * v1, qui suit ensuite le chemin habituel (plan, confirmation, propagation).
 *
 * Méthode : synonymes multilingues insensibles aux accents, racine + un niveau
 * d'imbrication (wrappers type `wedding`, `event`, `data`), repli structurel
 * sur les tableaux d'objets. Seules les infos reconnues avec confiance sont
 * reprises ; le reste est listé comme ignoré, jamais inventé.
 */

export type UniversalDrop = { label: string; reason: "unmapped" | "badTime" };

export type CarteParseResult =
  | { ok: true; dossier: DispooDossierV1; source: "dispoo" | "universal"; dropped: UniversalDrop[] }
  | { ok: false };

/**
 * La carte, quel que soit son transport : fichier, code collé, ou reprise
 * d'un brouillon visiteur. Une seule lecture pour tous les chemins — Dossier
 * strict d'abord, puis import universel. Un JSON qui RESSEMBLE à un dossier
 * mais qui est invalide reste une erreur (pas un repli silencieux).
 */
export function parseCarteText(text: string, name: string): CarteParseResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false };
  const strict = parseDispooDossierText(trimmed);
  if (strict.ok) return { ok: true, dossier: strict.dossier, source: "dispoo", dropped: [] };
  const details = strict.errors.filter(issue => issue !== "notDossier" && issue !== "notJson");
  if (details.length > 0) return { ok: false };
  let raw: unknown = null;
  try {
    raw = JSON.parse(trimmed);
  } catch {
    raw = null;
  }
  const universal = raw !== null ? normalizeUniversalJson(raw, name) : { ok: false as const };
  return universal.ok
    ? { ok: true, dossier: universal.dossier, source: "universal", dropped: universal.dropped }
    : { ok: false };
}

export type UniversalResult =
  | { ok: true; dossier: DispooDossierV1; dropped: UniversalDrop[] }
  | { ok: false };

const cleanKey = (key: string) =>
  key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

const WRAPPERS = new Set([
  "wedding", "mariage", "event", "evenement", "journee", "jourj", "jourj",
  "data", "donnees", "dossier", "project", "projet", "celebration",
]);

const NAME_KEYS = new Set(["nom", "name", "titre", "title", "wedding", "mariage", "event", "evenement", "journee", "intitule", "label", "celebration"]);
const DATE_KEYS = new Set(["date", "weddingdate", "datedumariage", "jour", "day", "datetime", "when", "datedebut", "startdate", "jourj"]);
const CITY_KEYS = new Set(["ville", "city", "town", "commune", "localite", "cityname"]);
const VENUE_KEYS = new Set(["lieu", "venue", "location", "salle", "domaine", "place", "endroit", "adresse", "address", "localisation", "reception"]);
const GUESTS_KEYS = new Set(["invites", "guests", "convives", "nombreinvites", "guestcount", "participants", "nombredepersonnes", "effectif"]);
const TEAM_KEYS = new Set(["prestataires", "vendors", "providers", "pros", "equipe", "team", "intervenants", "partenaires", "partners", "suppliers", "fournisseurs", "artisans", "dreamteam"]);
const RUNDOWN_KEYS = new Set(["programme", "program", "deroule", "deroulement", "rundown", "schedule", "timeline", "etapes", "steps", "moments", "events", "evenements", "agenda", "ordre", "planningdujourouj", "runoforder"]);
const LOGISTICS_KEYS = new Set(["logistique", "logistics", "infos", "infospractiques", "practical", "practicalinfo", "acces", "access", "informations", "details"]);
const BUDGET_KEYS = new Set(["budget", "enveloppe", "total", "cout", "cost", "prix", "price", "montant", "amount", "finances", "depenses"]);

const MEMBER_METIER = new Set(["metier", "role", "category", "categorie", "type", "profession", "job", "specialite", "specialty", "activite", "corpsdemetier"]);
const MEMBER_NAME = new Set(["name", "nom", "societe", "company", "prestataire", "vendor", "provider", "raison", "raisonsociale", "enseigne", "titre", "title", "label"]);
const MEMBER_CONTACT = new Set(["contact", "email", "mail", "telephone", "phone", "tel", "portable", "mobile", "e-mail", "courriel", "numero"]);
const MEMBER_PRICE = new Set(["price", "prix", "tarif", "montant", "amount", "cout", "cost", "total"]);

const STEP_TIME = new Set(["time", "heure", "heures", "horaire", "horaires", "datetime", "start", "debut", "date", "hour", "hora", "debutetape"]);
const STEP_TITLE = new Set(["title", "titre", "nom", "name", "label", "etape", "step", "moment", "intitule", "libelle", "activite", "event", "evenement"]);
const STEP_PLACE = new Set(["location", "lieu", "place", "endroit", "salle", "ou", "where", "venue"]);
const STEP_DETAIL = new Set(["detail", "details", "description", "notes", "commentaire", "info", "infos", "texte", "text", "resume"]);

const PARKING_KEYS = new Set(["parking", "stationnement", "parkingvisiteurs", "seplanet"]);
const ACCESS_KEYS = new Set(["accessibilite", "acces", "access", "handicap", "pmr", "mobilitereduite", "accessibility"]);
const WEATHER_KEYS = new Set(["meteo", "repli", "replimeteo", "weather", "planb", "pluie", "secours", "weatherfallback", "intemperies"]);

/*
 * Carte AIME v1 : accroche, visuel, musique, devise. Correspondance EXACTE
 * seulement — ces clés décrivent la journée (contexte du premier site), pas
 * une donnée du Jour J, et une sous-chaîne trop large ferait des erreurs
 * (« subtitle » contient « title », « photographe » contient « photo »).
 * `kind`/`version` (l'enveloppe de la carte) ne correspondent à rien : ils
 * sont ignorés proprement, jamais inventés. `category`/`skills` n'ont pas de
 * destination v1 : ignorés (destination agence plus tard).
 */
const SUBTITLE_KEYS = new Set(["headline", "slogan", "tagline", "bio", "biographie", "description", "accroche", "subtitle", "soustitre"]);
const VISUAL_KEYS = new Set(["imageurl", "image", "photo", "photourl", "picture", "avatar", "visuel", "cover", "couverture", "heroimage", "herovisual", "imageprincipale", "pochette"]);
const MUSIC_KEYS = new Set(["music", "musique", "song", "chanson", "morceau"]);
const CURRENCY_KEYS = new Set(["currency", "devise", "monnaie"]);
const MUSIC_TITLE_KEYS = new Set(["title", "titre", "nom", "name", "label", "intitule"]);
const MUSIC_ARTIST_KEYS = new Set(["artist", "artiste", "chanteur", "chanteuse", "groupe", "interprete", "band"]);
const MUSIC_URL_KEYS = new Set(["url", "link", "lien", "href", "spotify", "deezer", "applemusic", "ecouter", "listen"]);

const keyMatches = (cleaned: string, tokens: Set<string>): boolean => {
  if (tokens.has(cleaned)) return true;
  for (const token of tokens) {
    if (token.length >= 5 && cleaned.includes(token)) return true;
  }
  return false;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const asText = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
};

const asCount = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value.replace(/[^0-9]/g, ""), 10);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return undefined;
};

/** Une date : ISO, AAAA-MM-JJ, JJ/MM/AAAA, ou timestamp (s ou ms). */
function asDateText(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value < 1_000_000_000_000 ? value * 1000 : value;
    const at = new Date(ms);
    if (Number.isNaN(at.getTime())) return undefined;
    return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`;
  }
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (!text) return undefined;
  const fr = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(text);
  if (fr) return `${fr[3]}-${fr[2]!.padStart(2, "0")}-${fr[1]!.padStart(2, "0")}`;
  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  return new Date(parsed).toISOString();
}

function mapStatus(value: unknown): "recherche" | "contacte" | "devis" | "reserve" | undefined {
  if (typeof value !== "string") return undefined;
  const clean = cleanKey(value);
  if (/(reserve|confirme|booked|confirmed|valide|choisi|retained|done|termine)/.test(clean)) return "reserve";
  if (/(devis|quote|chiffrage|proposition|estimate)/.test(clean)) return "devis";
  if (/(contact|rdv|rencontre|echange|discussion|shortlist)/.test(clean)) return "contacte";
  return undefined;
}

/*
 * Un prix n'est repris qu'en centimes explicites : `{ priceCents }`, une clé
 * qui dit les centimes, ou un objet `{ amount, unit: "cents" }`. Sinon il est
 * ignoré avec un motif — mieux vaut perdre un prix qu'inventer un budget.
 */
function mapPrice(record: Record<string, unknown>): { priceCents?: number; dropped?: boolean } {
  for (const [rawKey, value] of Object.entries(record)) {
    const key = cleanKey(rawKey);
    if (key.includes("cent")) {
      const cents = asCount(value);
      if (cents !== undefined) return { priceCents: cents };
    }
    if (key === "pricecents" || key === "montantcentimes") {
      const cents = asCount(value);
      if (cents !== undefined) return { priceCents: cents };
    }
    if (isRecord(value) && (key.includes("prix") || key.includes("price") || key.includes("tarif"))) {
      const unit = typeof value.unit === "string" ? cleanKey(value.unit) : "";
      const amount = asCount(value.amount ?? value.value ?? value.montant);
      if (amount !== undefined && unit.includes("cent")) return { priceCents: amount };
      if (amount !== undefined) return { dropped: true };
    }
  }
  for (const [rawKey, value] of Object.entries(record)) {
    if (keyMatches(cleanKey(rawKey), MEMBER_PRICE) && (typeof value === "number" || typeof value === "string")) {
      return { dropped: true };
    }
  }
  return { dropped: false };
}

function pickText(record: Record<string, unknown>, keys: Set<string>, exclude?: (key: string) => boolean): string | undefined {
  for (const [rawKey, value] of Object.entries(record)) {
    if (exclude?.(cleanKey(rawKey))) continue;
    if (keyMatches(cleanKey(rawKey), keys)) {
      const text = asText(value);
      if (text) return text;
    }
  }
  return undefined;
}

/* Correspondance exacte : pour les champs de contexte de la Carte AIME. */
function pickExactText(root: Record<string, unknown>, keys: Set<string>): string | undefined {
  for (const scope of scopesOf(root)) {
    for (const [rawKey, value] of Object.entries(scope)) {
      if (keys.has(cleanKey(rawKey))) {
        const text = asText(value);
        if (text) return text;
      }
    }
  }
  return undefined;
}

function pickExactRecord(root: Record<string, unknown>, keys: Set<string>): Record<string, unknown> | undefined {
  for (const scope of scopesOf(root)) {
    for (const [rawKey, value] of Object.entries(scope)) {
      if (keys.has(cleanKey(rawKey)) && isRecord(value)) return value;
    }
  }
  return undefined;
}

/** Les scopes de recherche : la racine, puis un niveau de wrappers connus. */
function scopesOf(root: Record<string, unknown>): Record<string, unknown>[] {
  const scopes = [root];
  for (const [rawKey, value] of Object.entries(root)) {
    if (WRAPPERS.has(cleanKey(rawKey)) && isRecord(value)) scopes.push(value);
  }
  return scopes;
}

function pickArray(root: Record<string, unknown>, keys: Set<string>): unknown[] | undefined {
  for (const scope of scopesOf(root)) {
    for (const [rawKey, value] of Object.entries(scope)) {
      if (keyMatches(cleanKey(rawKey), keys) && Array.isArray(value)) return value;
    }
  }
  return undefined;
}

function pickRecord(root: Record<string, unknown>, keys: Set<string>): Record<string, unknown> | undefined {
  for (const scope of scopesOf(root)) {
    for (const [rawKey, value] of Object.entries(scope)) {
      if (keyMatches(cleanKey(rawKey), keys) && isRecord(value)) return value;
    }
  }
  return undefined;
}

/* Repli structurel : un tableau d'objets « étape » ou « membre » sans clé connue. */
function looksLikeStep(item: Record<string, unknown>): boolean {
  const keys = Object.keys(item).map(cleanKey);
  return keys.some(key => keyMatches(key, STEP_TIME)) && keys.some(key => keyMatches(key, STEP_TITLE));
}

function looksLikeMember(item: Record<string, unknown>): boolean {
  const keys = Object.keys(item).map(cleanKey);
  return keys.some(key => keyMatches(key, MEMBER_METIER) || keyMatches(key, MEMBER_NAME));
}

function scanArrays(root: Record<string, unknown>, like: (item: Record<string, unknown>) => boolean): unknown[] | undefined {
  for (const scope of scopesOf(root)) {
    for (const value of Object.values(scope)) {
      if (!Array.isArray(value) || value.length === 0) continue;
      const records = value.filter(isRecord);
      if (records.length >= Math.max(1, Math.ceil(value.length / 2)) && records.some(like)) return value;
    }
  }
  return undefined;
}

export function normalizeUniversalJson(raw: unknown, fallbackName: string): UniversalResult {
  if (!isRecord(raw)) return { ok: false };
  const dropped: UniversalDrop[] = [];

  /* Les champs de contexte de la carte ne nomment jamais le mariage :
     « subtitle » contient « title », « weddingdate » contient « wedding » —
     sans ce filtre, l'accroche ou la date deviendraient le nom. */
  const reserved = (key: string) =>
    SUBTITLE_KEYS.has(key) || VISUAL_KEYS.has(key) || MUSIC_KEYS.has(key) || CURRENCY_KEYS.has(key) || keyMatches(key, DATE_KEYS);
  const name = pickText(raw, NAME_KEYS, reserved)
    ?? scopesOf(raw).map(scope => pickText(scope, NAME_KEYS, reserved)).find(Boolean)
    ?? fallbackName.replace(/\.json$/i, "").trim()
    ?? "Import JSON";
  const safeName = name.trim() || "Import JSON";
  const dateRaw = scopesOf(raw).map(scope => {
    for (const [rawKey, value] of Object.entries(scope)) {
      if (keyMatches(cleanKey(rawKey), DATE_KEYS)) return asDateText(value);
    }
    return undefined;
  }).find(Boolean);
  if (!dateRaw) return { ok: false };

  const city = scopesOf(raw).map(scope => {
    for (const [rawKey, value] of Object.entries(scope)) {
      if (keyMatches(cleanKey(rawKey), CITY_KEYS)) return asText(value);
    }
    return undefined;
  }).find(Boolean);
  const venue = scopesOf(raw).map(scope => {
    for (const [rawKey, value] of Object.entries(scope)) {
      if (keyMatches(cleanKey(rawKey), VENUE_KEYS)) return asText(value);
    }
    return undefined;
  }).find(Boolean);
  const guests = scopesOf(raw).map(scope => {
    for (const [rawKey, value] of Object.entries(scope)) {
      if (keyMatches(cleanKey(rawKey), GUESTS_KEYS)) return asCount(value);
    }
    return undefined;
  }).find(value => value !== undefined);

  const teamRaw = pickArray(raw, TEAM_KEYS) ?? scanArrays(raw, looksLikeMember) ?? [];
  const team: DispooDossierV1["team"] = [];
  for (const entry of teamRaw) {
    if (!isRecord(entry)) continue;
    const metier = pickText(entry, MEMBER_METIER) ?? pickText(entry, MEMBER_NAME);
    if (!metier) {
      dropped.push({ label: asText(entry.name ?? entry.title) ?? "prestataire", reason: "unmapped" });
      continue;
    }
    const price = mapPrice(entry);
    if (price.dropped) dropped.push({ label: `prix de ${metier}`, reason: "unmapped" });
    team.push({
      metier,
      ...(pickText(entry, MEMBER_NAME) ? { name: pickText(entry, MEMBER_NAME)! } : {}),
      ...(pickText(entry, MEMBER_CONTACT) ? { contact: pickText(entry, MEMBER_CONTACT)! } : {}),
      ...(mapStatus(entry.status ?? entry.statut ?? entry.state) ? { status: mapStatus(entry.status ?? entry.statut ?? entry.state)! } : {}),
      ...(price.priceCents !== undefined ? { priceCents: price.priceCents } : {}),
    });
  }

  const rundownRaw = pickArray(raw, RUNDOWN_KEYS) ?? scanArrays(raw, looksLikeStep) ?? [];
  const rundown: DispooDossierV1["rundown"] = [];
  for (const entry of rundownRaw) {
    if (!isRecord(entry)) continue;
    const title = pickText(entry, STEP_TITLE);
    const time = pickText(entry, STEP_TIME) ?? (typeof entry.date === "string" ? entry.date : undefined);
    if (!title || !time) {
      dropped.push({ label: title ?? asText(entry.time ?? entry.heure) ?? "étape", reason: !title ? "unmapped" : "badTime" });
      continue;
    }
    rundown.push({
      time,
      title,
      ...(pickText(entry, STEP_PLACE) ? { location: pickText(entry, STEP_PLACE)! } : {}),
      ...(pickText(entry, STEP_DETAIL) ? { detail: pickText(entry, STEP_DETAIL)! } : {}),
      ...(asCount(entry.duree ?? entry.duration ?? entry.minutes) ? { durationMinutes: asCount(entry.duree ?? entry.duration ?? entry.minutes)! } : {}),
    });
  }

  const logisticsRaw = pickRecord(raw, LOGISTICS_KEYS);
  const logistics = logisticsRaw
    ? {
        ...(pickText(logisticsRaw, PARKING_KEYS) ? { parking: pickText(logisticsRaw, PARKING_KEYS)! } : {}),
        ...(pickText(logisticsRaw, ACCESS_KEYS) ? { accessibility: pickText(logisticsRaw, ACCESS_KEYS)! } : {}),
        ...(pickText(logisticsRaw, WEATHER_KEYS) ? { weatherFallback: pickText(logisticsRaw, WEATHER_KEYS)! } : {}),
      }
    : undefined;

  let budget: DispooDossierV1["budget"] = undefined;
  for (const scope of scopesOf(raw)) {
    for (const [rawKey, value] of Object.entries(scope)) {
      if (!keyMatches(cleanKey(rawKey), BUDGET_KEYS)) continue;
      if (typeof value === "number" && value > 0) budget = { total: value };
      else if (isRecord(value)) {
        const total = asCount(value.total ?? value.amount ?? value.montant ?? value.enveloppe);
        const currency = typeof value.currency === "string" || typeof value.devise === "string"
          ? String(value.currency ?? value.devise)
          : undefined;
        if (total !== undefined) budget = { total, ...(currency ? { currency } : {}) };
      }
      if (budget) break;
    }
    if (budget) break;
  }

  /* Carte AIME v1 : accroche, visuel, musique, devise. */
  const subtitle = pickExactText(raw, SUBTITLE_KEYS);
  const visualUrl = pickExactText(raw, VISUAL_KEYS);
  const currencyRoot = pickExactText(raw, CURRENCY_KEYS);
  const musicRecord = pickExactRecord(raw, MUSIC_KEYS);
  const music = musicRecord
    ? {
        title: pickExactText(musicRecord, MUSIC_TITLE_KEYS),
        artist: pickExactText(musicRecord, MUSIC_ARTIST_KEYS),
        url: pickExactText(musicRecord, MUSIC_URL_KEYS),
      }
    : undefined;
  const hasMusic = !!(music && (music.title || music.artist || music.url));
  const budgetOut: DispooDossierV1["budget"] = budget
    ? { ...budget, ...(currencyRoot && !budget.currency ? { currency: currencyRoot } : {}) }
    : currencyRoot
      ? { currency: currencyRoot }
      : undefined;

  const recognized = team.length > 0 || rundown.length > 0 || (logistics && Object.keys(logistics).length > 0) || budget !== undefined || guests !== undefined || subtitle !== undefined || visualUrl !== undefined || hasMusic;
  if (!recognized) return { ok: false };

  return {
    ok: true,
    dropped,
    dossier: {
      kind: DISPOO_DOSSIER_KIND,
      version: DISPOO_DOSSIER_VERSION,
      identity: {
        name: safeName,
        date: dateRaw,
        ...(city ? { city } : {}),
        ...(venue ? { venue } : {}),
        ...(guests !== undefined ? { guests } : {}),
      },
      team,
      rundown,
      ...(logistics && Object.keys(logistics).length > 0 ? { logistics } : {}),
      ...(budgetOut ? { budget: budgetOut } : {}),
      ...(subtitle ? { subtitle } : {}),
      ...(visualUrl ? { visual: visualUrl } : {}),
      ...(hasMusic ? { music } : {}),
    },
  };
}
