/*
 * LE FAIT TEL QU'IL EST MONTRÉ À LA CONTREPARTIE — partagé client / serveur.
 *
 * Une attestation ne vaut que pour le fait exact qu'on a montré : le client
 * l'affiche, le serveur l'empreinte au moment de la réponse, le Monde la
 * recompare ensuite. Les trois doivent calculer la même chose depuis les
 * mêmes données brutes du projet ; ce module est donc le seul endroit où la
 * vue du fait et son empreinte sont définies.
 *
 * Aucune dépendance : il lit des objets JSON (le `data` du projet tel qu'il
 * est en base) et ne présume que la forme minimale nécessaire.
 */

type JsonObject = Record<string, unknown>;

const object = (value: unknown): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : {};
const array = (value: unknown): JsonObject[] =>
  Array.isArray(value) ? value.map(object) : [];
const num = (value: unknown): number | undefined => (typeof value === "number" && Number.isFinite(value) ? value : undefined);
const str = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

export type FactView = {
  eventId: string;
  providerId: string;
  title: string;
  time: number;
  endTime?: number;
  location?: string;
  amountCents: number;
  documentIds: string[];
  paymentIds: string[];
};

/** Empreinte FNV-1a 32 bits, hexadécimale — témoin d'état, pas signature cryptographique. */
export function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function eventEnd(event: JsonObject): number | undefined {
  const time = num(event.time) ?? 0;
  const endTime = num(event.endTime);
  if (endTime !== undefined && endTime >= time) return endTime;
  const duration = num(event.durationMinutes);
  if (duration !== undefined && duration > 0) return time + duration * 60_000;
  return undefined;
}

function relatesToDocument(event: JsonObject, documentId: string): boolean {
  return array(event.relations).some(relation => relation.kind === "document" && relation.id === documentId);
}

/** Même règle que `paymentsForDocument` côté client : explicite d'abord, sinon prestataire commun. */
function paymentsForDocument(document: JsonObject, payments: JsonObject[]): JsonObject[] {
  const explicit = payments.filter(payment => payment.documentId === document.id);
  if (explicit.length > 0) return explicit;
  if (!document.providerId) return [];
  return payments.filter(payment => payment.providerId === document.providerId && !payment.documentId);
}

/** Le Moment d'un projet brut, ou undefined. */
export function findEvent(data: unknown, eventId: string): JsonObject | undefined {
  return array(object(data).timeline).find(event => event.id === eventId);
}

/** Le prestataire d'un projet brut, ou undefined. */
export function findProvider(data: unknown, providerId: string): JsonObject | undefined {
  return array(object(data).providers).find(provider => provider.id === providerId);
}

/** Le Moment relie-t-il ce prestataire ? Une attestation ne se demande qu'à une contrepartie réelle. */
export function eventRelatesProvider(event: JsonObject, providerId: string): boolean {
  return array(event.relations).some(relation => relation.kind === "provider" && relation.id === providerId);
}

/**
 * La vue du fait : le Moment, les documents financiers du prestataire reliés
 * à ce Moment (à défaut, tous ses documents financiers), les règlements qui
 * les couvrent. Déterministe pour un même projet.
 */
export function buildFactView(data: unknown, eventId: string, providerId: string): FactView | undefined {
  const project = object(data);
  const event = findEvent(project, eventId);
  if (!event || !str(event.id)) return undefined;
  const documents = array(project.documents);
  const payments = array(project.payments);
  const ofProvider = documents.filter(document => document.providerId === providerId && document.kind !== "autre" && str(document.id));
  const linked = ofProvider.filter(document => relatesToDocument(event, String(document.id)));
  const chosen = linked.length > 0 ? linked : ofProvider;
  const settled = chosen
    .flatMap(document => paymentsForDocument(document, payments))
    .filter(payment => payment.state === "paye" && str(payment.id));
  const unique = [...new Map(settled.map(payment => [String(payment.id), payment])).values()]
    .sort((a, b) => (num(a.at) ?? 0) - (num(b.at) ?? 0) || String(a.id).localeCompare(String(b.id)));
  return {
    eventId: String(event.id),
    providerId,
    title: str(event.title) ?? "",
    time: num(event.time) ?? 0,
    endTime: eventEnd(event),
    location: str(event.location),
    amountCents: unique.reduce((sum, payment) => sum + (num(payment.amountCents) ?? 0), 0),
    documentIds: chosen.map(document => String(document.id)).sort(),
    paymentIds: unique.map(payment => String(payment.id)),
  };
}

/** L'empreinte du fait tel que montré : change si la date, la durée, le lieu ou les règlements changent. */
export function factViewFingerprint(view: FactView): string {
  return fnv1a([
    view.eventId,
    view.providerId,
    view.title,
    view.time,
    view.endTime ?? "",
    view.location ?? "",
    view.amountCents,
    view.paymentIds.join(","),
  ].join("\u001f"));
}
