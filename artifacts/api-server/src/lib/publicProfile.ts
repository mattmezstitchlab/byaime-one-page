import { buildRapport, type RapportSource } from "@workspace/aime-domain";

type UnknownRecord = Record<string, unknown>;

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
] as const;
const privateFinancialEventKinds = new Set(["paiement", "facture", "devis"]);

function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function publicEvent(value: unknown): UnknownRecord | null {
  const event = record(value);
  if (!event || event.visibility !== "audience" || typeof event.id !== "string" || typeof event.time !== "number") return null;
  if (privateFinancialEventKinds.has(String(event.kind ?? ""))) return null;
  return Object.fromEntries(
    publicEventFields
      .filter((field) => event[field] !== undefined)
      .map((field) => [field, event[field]]),
  );
}

export function projectToPublicProfile(project: { id: string; title: string; data: unknown }) {
  const data = record(project.data);
  const settings = record(data?.publicProfile);
  if (!data || settings?.published !== true) return null;

  const timeline = Array.isArray(data.timeline)
    ? data.timeline.map(publicEvent).filter((event): event is UnknownRecord => event !== null).sort((a, b) => Number(a.time) - Number(b.time))
    : [];
  const city = record(data.city);
  const pivot = record(data.pivot);
  const venue = record(data.venue);
  const logistics = record(data.logistics) ?? {};
  const practical = {
    ...(typeof venue?.value === "string" && venue.value.trim() ? { venue: venue.value.trim() } : {}),
    ...(["parking", "accessibility", "weatherFallback"] as const).reduce<Record<string, string>>((acc, key) => {
      const value = logistics[key];
      if (typeof value === "string" && value.trim()) acc[key] = value.trim();
      return acc;
    }, {}),
  };

  return {
    id: project.id,
    title: project.title,
    ...(typeof data.subtitle === "string" && data.subtitle.trim() ? { subtitle: data.subtitle.trim() } : {}),
    ...(typeof data.universe === "string" ? { universe: data.universe } : {}),
    ...(typeof city?.value === "string" && city.value.trim() ? { city: city.value.trim() } : {}),
    ...(typeof pivot?.value === "number" ? { pivot: pivot.value } : {}),
    ...(Object.keys(practical).length ? { practical } : {}),
    timeline,
  };
}

/*
 * Le bilan partagé : projection publique du rapport, gated par
 * `publicProfile.shareReport`. Indépendant de `published` : on peut partager
 * le bilan avec les mariés sans publier le mini-site invités, et réciproquement.
 * Les collections absentes deviennent des listes vides plutôt que des crashes.
 */
export function projectToPublicReport(project: { id: string; title: string; data: unknown }) {
  const data = record(project.data);
  const settings = record(data?.publicProfile);
  if (!data || settings?.shareReport !== true) return null;

  const source: RapportSource = {
    timeline: Array.isArray(data.timeline) ? data.timeline as RapportSource["timeline"] : [],
    tasks: Array.isArray(data.tasks) ? data.tasks as RapportSource["tasks"] : [],
    guests: Array.isArray(data.guests) ? data.guests as RapportSource["guests"] : [],
    documents: Array.isArray(data.documents) ? data.documents as RapportSource["documents"] : [],
    payments: Array.isArray(data.payments) ? data.payments as RapportSource["payments"] : [],
    providers: Array.isArray(data.providers) ? data.providers as RapportSource["providers"] : [],
  };

  return {
    id: project.id,
    title: project.title,
    ...(typeof data.subtitle === "string" && data.subtitle.trim() ? { subtitle: data.subtitle.trim() } : {}),
    ...(typeof data.currency === "string" && data.currency.trim() ? { currency: data.currency.trim() } : {}),
    rapport: buildRapport(source),
  };
}
