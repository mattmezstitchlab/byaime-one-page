import { z } from "zod";
import {
  fact,
  type Logistics,
  type Provider,
  type ProviderCategory,
  type TimelineEvent,
  type WorldProject,
} from "./types";

/*
 * Le Dossier Jour J, version 1 : le pont entre Dispoo et AIME.
 *
 * Dispoo prépare (chercher, comparer, composer l'équipe) ; AIME marie (le
 * Monde : invités, pilotage, Jour J, Après). Le dossier est le fichier qui
 * voyage de l'un à l'autre : déposé dans AIME, il prépare le Monde au lieu
 * d'être simplement classé comme document.
 *
 * SPEC v1 (partageable avec le côté Dispoo) :
 * - fichier JSON, `kind: "dispoo/dossier-jour-j"`, `version: 1` ;
 * - `identity` : `name` (nom de la journée, requis), `date` (AAAA-MM-JJ ou ISO
 *   complet, requis), `city?`, `venue?`, `guests?` (nombre d'invités) ;
 * - `team[]` : `metier` (libellé libre, ex. "Photographe", requis), `name?`
 *   (nom du pro choisi), `contact?`, `status?` ("recherche" | "contacte" |
 *   "devis" | "reserve"), `priceCents?` (entier, en centimes) ;
 * - `rundown[]` : les étapes du Jour J — `time` (ISO complet ou "HH:MM" dans
 *   la journée, requis), `title` (requis), `location?`, `detail?`,
 *   `durationMinutes?` ;
 * - `logistics?` : `parking?`, `accessibility?`, `weatherFallback?` (textes
 *   repris tels quels dans la logistique invitée) ;
 * - `budget?` : `total?` (en unités majeures, ex. 20000 = 20 000 €),
 *   `currency?` (code ISO, ex. "EUR").
 *
 * Règles de propagation : un dossier valide n'écrase jamais — il crée le Monde
 * s'il n'existe pas, sinon il complète les blancs et ignore les doublons
 * (même prestataire, même Moment). Une étape au horaire illisible n'invalide
 * pas le dossier : elle est signalée et ignorée.
 */

export const DISPOO_DOSSIER_KIND = "dispoo/dossier-jour-j";
export const DISPOO_DOSSIER_VERSION = 1;

const dossierSchemaV1 = z.object({
  kind: z.literal(DISPOO_DOSSIER_KIND),
  version: z.literal(DISPOO_DOSSIER_VERSION),
  identity: z.object({
    name: z.string().min(1),
    date: z.string().min(1),
    city: z.string().optional(),
    venue: z.string().optional(),
    guests: z.number().int().positive().optional(),
  }),
  team: z
    .array(
      z.object({
        metier: z.string().min(1),
        name: z.string().optional(),
        contact: z.string().optional(),
        status: z.enum(["recherche", "contacte", "devis", "reserve"]).optional(),
        priceCents: z.number().int().nonnegative().optional(),
      }),
    )
    .default([]),
  rundown: z
    .array(
      z.object({
        time: z.string().min(1),
        title: z.string().min(1),
        location: z.string().optional(),
        detail: z.string().optional(),
        durationMinutes: z.number().int().positive().optional(),
      }),
    )
    .default([]),
  logistics: z
    .object({
      parking: z.string().optional(),
      accessibility: z.string().optional(),
      weatherFallback: z.string().optional(),
    })
    .optional(),
  budget: z
    .object({
      total: z.number().nonnegative().optional(),
      currency: z.string().optional(),
    })
    .optional(),
});

export type DispooDossierV1 = z.infer<typeof dossierSchemaV1>;
export type DispooTeamMember = DispooDossierV1["team"][number];
export type DispooRundownStep = DispooDossierV1["rundown"][number];

export type DossierParseResult =
  | { ok: true; dossier: DispooDossierV1 }
  | { ok: false; errors: string[] };

function frenchIssue(path: string, code: string, expected?: string): string {
  const where = path || "dossier";
  switch (code) {
    case "invalid_type":
      return `${where} : type inattendu${expected ? ` (${expected} attendu)` : ""}`;
    case "too_small":
      return `${where} : valeur manquante ou vide`;
    case "invalid_literal":
      return `${where} : valeur inattendue`;
    case "invalid_enum_value":
      return `${where} : valeur inconnue`;
    default:
      return `${where} : valeur invalide`;
  }
}

export function parseDispooDossierText(text: string): DossierParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["notJson"] };
  }
  if (!raw || typeof raw !== "object" || (raw as { kind?: unknown }).kind !== DISPOO_DOSSIER_KIND) {
    return { ok: false, errors: ["notDossier"] };
  }
  const parsed = dossierSchemaV1.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map(issue =>
        frenchIssue(issue.path.join("."), issue.code, issue.code === "invalid_type" ? (issue as { expected?: string }).expected : undefined),
      ),
    };
  }
  if (dossierDayMs(parsed.data) === null) {
    return { ok: false, errors: ["identity.date : date du Jour J illisible (AAAA-MM-JJ attendu)"] };
  }
  return { ok: true, dossier: parsed.data };
}

/** Un fichier est candidat s'il ressemble à du JSON (extension ou type MIME). */
export function isDossierCandidate(name: string, mimeType: string): boolean {
  return name.toLowerCase().endsWith(".json") || mimeType.toLowerCase().includes("json");
}

/** Midi local du Jour J : pas de bascule de jour selon le fuseau. */
export function dossierDayMs(dossier: DispooDossierV1): number | null {
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dossier.identity.date.trim());
  if (day) return new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]), 12, 0, 0).getTime();
  const parsed = Date.parse(dossier.identity.date);
  return Number.isNaN(parsed) ? null : parsed;
}

/** Un horaire d'étape : ISO complet, ou "HH:MM" dans la journée du dossier. */
export function dossierStepMs(step: DispooRundownStep, dayMs: number): number | null {
  const clock = /^(\d{1,2}):(\d{2})$/.exec(step.time.trim());
  if (clock) {
    const day = new Date(dayMs);
    const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Number(clock[1]), Number(clock[2]));
    return Number.isNaN(at.getTime()) ? null : at.getTime();
  }
  const parsed = Date.parse(step.time);
  return Number.isNaN(parsed) ? null : parsed;
}

const stripAccents = (value: string) =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Le métier Dispoo (libellé libre) vers la catégorie AIME + le rôle affiché. */
export function metierToProvider(metier: string): { category: ProviderCategory; role: string } {
  const clean = stripAccents(metier.trim());
  const has = (...words: string[]) => words.some(word => clean.includes(word));
  let category: ProviderCategory = "autre";
  if (has("photo")) category = "photo";
  else if (has("video", "videaste", "cineaste", "cadreur", "drone")) category = "video";
  else if (has("traiteur", "chef", "cuisin", "restaur", "catering")) category = "traiteur";
  else if (has("fleur")) category = "fleuriste";
  else if (has("dj", "musique", "music", "groupe", "orchestre", "chanteur", "quatuor")) category = "musique";
  else if (has("lieu", "domaine", "salle", "chateau", "manoir", "ferme", "grange", "mas")) category = "lieu";
  else if (has("officiant", "celebrant")) category = "officiant";
  else if (has("robe", "costume", "tenue", "coutur", "atelier")) category = "tenue";
  else if (has("maquill", "coiff", "beaute", "esthetic", "barbier")) category = "beaute";
  else if (has("papeterie", "faire-part", "faire part", "graphiste", "calligraph")) category = "papeterie";
  else if (has("transport", "chauffeur", "navette", "voiture", "bus", "taxi")) category = "transport";
  else if (has("hotel", "heberg", "gite", "logement", "chambre")) category = "hebergement";
  const trimmed = metier.trim();
  return { category, role: trimmed ? trimmed[0]!.toUpperCase() + trimmed.slice(1) : trimmed };
}

export function dossierMemberToProvider(member: DispooTeamMember): Omit<Provider, "id"> {
  const { category, role } = metierToProvider(member.metier);
  return {
    category,
    role,
    ...(member.name?.trim() ? { name: member.name.trim() } : {}),
    ...(member.contact?.trim() ? { contact: member.contact.trim() } : {}),
    status: member.status ?? (member.name?.trim() ? "contacte" : "recherche"),
    ...(member.priceCents !== undefined ? { amountCents: member.priceCents } : {}),
  };
}

/** Une étape du déroulé devient un Moment audience du Jour J, tracé « intégration ». */
export function dossierStepToMoment(step: DispooRundownStep, time: number): Omit<TimelineEvent, "id"> {
  return {
    time,
    kind: "evenement",
    title: step.title.trim(),
    ...(step.location?.trim() ? { location: step.location.trim() } : {}),
    ...(step.detail?.trim() ? { detail: step.detail.trim() } : {}),
    ...(step.durationMinutes !== undefined ? { durationMinutes: step.durationMinutes } : {}),
    status: "prepare",
    confidence: "confirme",
    phase: "pendant",
    universe: "Mariage",
    visibility: "audience",
    provenance: "integration",
  };
}

export function dossierLogistics(dossier: DispooDossierV1): Logistics {
  return {
    accommodations: [],
    shuttles: [],
    parking: dossier.logistics?.parking?.trim() ?? "",
    accessibility: dossier.logistics?.accessibility?.trim() ?? "",
    weatherFallback: dossier.logistics?.weatherFallback?.trim() ?? "",
    emergencyContacts: [],
    packing: [],
  };
}

/** L'identité du dossier vers l'ébauche d'un Monde neuf (normalisée par le store). */
export function dossierToProjectDraft(dossier: DispooDossierV1): Partial<WorldProject> {
  const dayMs = dossierDayMs(dossier) ?? Date.now();
  const city = dossier.identity.city?.trim() || null;
  const venue = dossier.identity.venue?.trim() || null;
  const total = dossier.budget?.total;
  const guests = dossier.identity.guests;
  return {
    title: dossier.identity.name.trim(),
    universe: "Mariage",
    persona: "couple",
    ...(dossier.budget?.currency?.trim() ? { currency: dossier.budget.currency.trim().toUpperCase() } : {}),
    pivot: fact(dayMs, "confirme"),
    city: fact(city, city ? "confirme" : "manquant"),
    venue: fact(venue, venue ? "confirme" : "manquant"),
    budget: fact(total ?? null, total !== undefined ? "confirme" : "manquant"),
    guestsCount: fact(guests ?? null, guests !== undefined ? "confirme" : "manquant"),
    logistics: dossierLogistics(dossier),
  };
}

const normalizeName = (value: string) => stripAccents(value.trim());

/** Les membres vraiment nouveaux : même nom (ou même métier sans nom) = doublon. */
export function newDossierProviders(
  dossier: DispooDossierV1,
  project: WorldProject | null,
): DispooTeamMember[] {
  if (!project) return dossier.team;
  return dossier.team.filter(member => {
    const name = member.name?.trim();
    if (name) {
      return !project.providers.some(candidate => candidate.name && normalizeName(candidate.name) === normalizeName(name));
    }
    const { category, role } = metierToProvider(member.metier);
    return !project.providers.some(candidate => !candidate.name && candidate.category === category && candidate.role === role);
  });
}

export type DossierNewMoment = { step: DispooRundownStep; time: number };

/** Les étapes vraiment nouvelles : même titre à la même heure = doublon. */
export function newDossierMoments(dossier: DispooDossierV1, project: WorldProject | null): DossierNewMoment[] {
  const dayMs = dossierDayMs(dossier);
  if (dayMs === null) return [];
  const fresh: DossierNewMoment[] = [];
  for (const step of dossier.rundown) {
    const time = dossierStepMs(step, dayMs);
    if (time === null) continue;
    const duplicate = project?.timeline.some(
      event => event.time === time && normalizeName(event.title) === normalizeName(step.title),
    );
    if (!duplicate) fresh.push({ step, time });
  }
  return fresh;
}

export type LogisticsFill = Partial<Pick<Logistics, "parking" | "accessibility" | "weatherFallback">>;

/** Les champs logistique que le dossier remplit : les textes du couple sont conservés. */
export function dossierLogisticsFill(dossier: DispooDossierV1, project: WorldProject | null): LogisticsFill {
  const incoming = dossierLogistics(dossier);
  const current = project?.logistics;
  const fill: LogisticsFill = {};
  (["parking", "accessibility", "weatherFallback"] as const).forEach(field => {
    if (incoming[field] && !current?.[field]?.trim()) fill[field] = incoming[field];
  });
  return fill;
}

/** Les champs d'un Monde existant que le dossier complète (jamais d'écrasement). */
export function dossierMergeUpdates(
  dossier: DispooDossierV1,
  project: WorldProject,
): Partial<WorldProject> {
  const updates: Partial<WorldProject> = {};
  const city = dossier.identity.city?.trim();
  if (city && !project.city.value) updates.city = fact(city, "confirme");
  const venue = dossier.identity.venue?.trim();
  if (venue && !project.venue.value) updates.venue = fact(venue, "confirme");
  const total = dossier.budget?.total;
  if (total !== undefined && project.budget.value === null) updates.budget = fact(total, "confirme");
  const currency = dossier.budget?.currency?.trim().toUpperCase();
  if (currency && !project.currency) updates.currency = currency;
  const guests = dossier.identity.guests;
  if (guests !== undefined && project.guestsCount.value === null) updates.guestsCount = fact(guests, "confirme");
  const fill = dossierLogisticsFill(dossier, project);
  if (Object.keys(fill).length > 0) updates.logistics = { ...project.logistics, ...fill };
  return updates;
}

/* ------------------------------------------------------------------ */
/* Le plan de propagation : ce que l'écran de confirmation affiche.    */
/* ------------------------------------------------------------------ */

export type DossierPlanItem =
  | { group: "identity"; action: "create"; name: string; dayMs: number; place?: string }
  | { group: "identity"; action: "fill"; field: "city" | "venue" | "guests"; value: string }
  | { group: "providers"; member: DispooTeamMember; category: ProviderCategory; role: string }
  | { group: "moments"; step: DispooRundownStep; time: number }
  | { group: "logistics"; field: "parking" | "accessibility" | "weatherFallback"; value: string }
  | { group: "budget"; total: number; currency: string }
  | { group: "skipped"; label: string; reason: "duplicate" | "badTime" | "filled" };

export function planDossierPropagation(
  dossier: DispooDossierV1,
  project: WorldProject | null,
): DossierPlanItem[] {
  const items: DossierPlanItem[] = [];
  const dayMs = dossierDayMs(dossier) ?? Date.now();
  const city = dossier.identity.city?.trim();
  const venue = dossier.identity.venue?.trim();

  if (!project) {
    items.push({
      group: "identity",
      action: "create",
      name: dossier.identity.name.trim(),
      dayMs,
      ...(city || venue ? { place: [city, venue].filter(Boolean).join(" · ") } : {}),
    });
  } else {
    if (city && !project.city.value) items.push({ group: "identity", action: "fill", field: "city", value: city });
    else if (city) items.push({ group: "skipped", label: city, reason: "filled" });
    if (venue && !project.venue.value) items.push({ group: "identity", action: "fill", field: "venue", value: venue });
    else if (venue) items.push({ group: "skipped", label: venue, reason: "filled" });
    const guests = dossier.identity.guests;
    if (guests !== undefined) {
      if (project.guestsCount.value === null) {
        items.push({ group: "identity", action: "fill", field: "guests", value: String(guests) });
      } else {
        items.push({ group: "skipped", label: String(guests), reason: "filled" });
      }
    }
  }

  const freshProviders = newDossierProviders(dossier, project);
  for (const member of freshProviders) {
    const { category, role } = metierToProvider(member.metier);
    items.push({ group: "providers", member, category, role });
  }
  for (const member of dossier.team) {
    if (freshProviders.includes(member)) continue;
    items.push({ group: "skipped", label: member.name?.trim() || metierToProvider(member.metier).role, reason: "duplicate" });
  }

  const freshMoments = newDossierMoments(dossier, project);
  for (const moment of freshMoments) items.push({ group: "moments", ...moment });
  for (const step of dossier.rundown) {
    if (freshMoments.some(moment => moment.step === step)) continue;
    const time = dossierStepMs(step, dayMs);
    items.push({ group: "skipped", label: step.title.trim(), reason: time === null ? "badTime" : "duplicate" });
  }

  const fill = dossierLogisticsFill(dossier, project);
  (Object.entries(fill) as [keyof LogisticsFill, string][]).forEach(([field, value]) => {
    items.push({ group: "logistics", field, value });
  });

  const total = dossier.budget?.total;
  if (total !== undefined) {
    const currency = dossier.budget?.currency?.trim().toUpperCase() || project?.currency || "EUR";
    if (!project || project.budget.value === null) items.push({ group: "budget", total, currency });
    else items.push({ group: "skipped", label: `${total} ${currency}`, reason: "filled" });
  }

  return items;
}
