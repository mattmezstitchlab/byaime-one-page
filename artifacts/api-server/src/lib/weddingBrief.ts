import type { ProjectRole } from "./permissions";

type UnknownRecord = Record<string, unknown>;
type BriefSource = {
  collection: "project" | "timeline" | "task" | "payment";
  id: string;
  label: string;
  amountCents?: number;
  paymentState?: "paye" | "du";
  recordedAt?: number;
};
type BriefSegment = {
  id: string;
  kind: "transition" | "fact" | "calculation" | "alert" | "suggestion";
  title: string;
  narration: string;
  source: BriefSource;
  supportingSources: BriefSource[];
  at?: number;
  evidenceStatus: "verified" | "unverified";
};

const records = (value: unknown): UnknownRecord[] =>
  Array.isArray(value) ? value.filter((item): item is UnknownRecord => Boolean(item) && typeof item === "object") : [];
const text = (value: unknown): string | undefined => typeof value === "string" && value.trim() ? value.trim() : undefined;
const number = (value: unknown): number | undefined => typeof value === "number" && Number.isFinite(value) ? value : undefined;
const date = (value: number) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(value);
const euros = (cents: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(cents / 100);

function factValue(value: unknown): { value?: string; confidence?: string } {
  if (!value || typeof value !== "object") return {};
  const row = value as UnknownRecord;
  return { value: text(row.value), confidence: text(row.confidence) };
}

function eventVisibleToRole(event: UnknownRecord, role: ProjectRole): boolean {
  const visibility = text(event.visibility) ?? "prive";
  const financial = ["paiement", "facture", "devis"].includes(text(event.kind) ?? "");
  if (financial && role !== "owner") return false;
  if (role === "owner") return true;
  if (role === "planner" || role === "family") return visibility !== "prive";
  return visibility === "audience";
}

function verifiedEvent(event: UnknownRecord): boolean {
  return text(event.confidence) === "confirme" && text(event.provenance) !== "demo";
}

export function buildAuthorizedWeddingBrief(input: {
  projectId: string;
  title: string;
  data: unknown;
  role: ProjectRole;
  useWorldLocation: boolean;
  now?: number;
}) {
  const now = input.now ?? Date.now();
  const data = input.data && typeof input.data === "object" ? input.data as UnknownRecord : {};
  const events = records(data.timeline)
    .filter(event => text(event.phase) === "avant" && verifiedEvent(event) && eventVisibleToRole(event, input.role))
    .sort((a, b) => (number(a.time) ?? 0) - (number(b.time) ?? 0));
  const segments: BriefSegment[] = [{
    id: "brief-introduction",
    kind: "transition",
    title: "Point de situation",
    narration: `Voici où en est ${input.title}, à partir des informations confirmées que vous pouvez consulter.`,
    source: { collection: "project", id: input.projectId, label: input.title },
    supportingSources: [],
    evidenceStatus: "verified",
  }];

  const completed = events.filter(event => text(event.status) === "execute" && (number(event.time) ?? Number.MAX_SAFE_INTEGER) <= now).at(-1);
  const completedTime = completed ? number(completed.time) : undefined;
  const completedId = completed ? text(completed.id) : undefined;
  const completedTitle = completed ? text(completed.title) : undefined;
  if (completed && completedId && completedTitle && completedTime !== undefined) {
    segments.push({
      id: `completed-${completedId}`,
      kind: "fact",
      title: "Dernière étape marquée comme terminée",
      narration: `${completedTitle} est terminé dans le Monde. Ce Moment était planifié pour le ${date(completedTime)}.`,
      source: { collection: "timeline", id: completedId, label: completedTitle },
      supportingSources: [],
      at: completedTime,
      evidenceStatus: "verified",
    });
  }

  const next = events.find(event => (number(event.time) ?? 0) >= now && text(event.status) !== "execute");
  const nextTime = next ? number(next.time) : undefined;
  const nextId = next ? text(next.id) : undefined;
  const nextTitle = next ? text(next.title) : undefined;
  if (next && nextId && nextTitle && nextTime !== undefined) {
    segments.push({
      id: `next-${nextId}`,
      kind: "fact",
      title: "Prochain Moment",
      narration: `${nextTitle} est prévu le ${date(nextTime)}.`,
      source: { collection: "timeline", id: nextId, label: nextTitle },
      supportingSources: [],
      at: nextTime,
      evidenceStatus: "verified",
    });
  }

  const blocked = events.find(event => ["bloque", "echoue"].includes(text(event.status) ?? ""));
  const blockedId = blocked ? text(blocked.id) : undefined;
  const blockedTitle = blocked ? text(blocked.title) : undefined;
  if (blocked && blockedId && blockedTitle) {
    segments.push({
      id: `blocked-${blockedId}`,
      kind: "alert",
      title: "Un point demande votre attention",
      narration: `${blockedTitle} est signalé comme ${text(blocked.status) === "bloque" ? "bloqué" : "en échec"}.`,
      source: { collection: "timeline", id: blockedId, label: blockedTitle },
      supportingSources: [],
      ...(number(blocked.time) === undefined ? {} : { at: number(blocked.time) }),
      evidenceStatus: "verified",
    });
  }

  if (input.role === "owner") {
    const pendingTask = records(data.tasks)
      .filter(task => text(task.status) !== "termine")
      .sort((a, b) => (number(a.dueDate) ?? Number.MAX_SAFE_INTEGER) - (number(b.dueDate) ?? Number.MAX_SAFE_INTEGER))[0];
    const taskId = pendingTask ? text(pendingTask.id) : undefined;
    const taskTitle = pendingTask ? text(pendingTask.title) : undefined;
    if (pendingTask && taskId && taskTitle) {
      const due = number(pendingTask.dueDate);
      segments.push({
        id: `task-${taskId}`,
        kind: text(pendingTask.priority) === "haute" ? "alert" : "fact",
        title: "À préparer",
        narration: `${taskTitle}${due === undefined ? " reste à organiser" : ` est attendu pour le ${date(due)}`}.`,
        source: { collection: "task", id: taskId, label: taskTitle },
        supportingSources: [],
        ...(due === undefined ? {} : { at: due }),
        evidenceStatus: "verified",
      });
    }

    const payments = records(data.payments).flatMap(payment => {
      const id = text(payment.id);
      const label = text(payment.label);
      const amountCents = number(payment.amountCents);
      const at = number(payment.at);
      const state = text(payment.state);
      return id && label && amountCents !== undefined && at !== undefined && (state === "paye" || state === "du")
        ? [{ id, label, amountCents, at, state: state as "paye" | "du" }]
        : [];
    });
    if (payments.length) {
      const paidTotal = payments.filter(payment => payment.state === "paye").reduce((sum, payment) => sum + payment.amountCents, 0);
      const dueTotal = payments.filter(payment => payment.state === "du").reduce((sum, payment) => sum + payment.amountCents, 0);
      const sources = payments.map(payment => ({
        collection: "payment" as const,
        id: payment.id,
        label: payment.label,
        amountCents: payment.amountCents,
        paymentState: payment.state,
        recordedAt: payment.at,
      }));
      segments.push({
        id: "financial-position",
        kind: "calculation",
        title: "Situation financière",
        narration: `${euros(paidTotal)} sont marqués comme payés et ${euros(dueTotal)} restent à régler. Chaque montant vient des paiements enregistrés.`,
        source: sources[0],
        supportingSources: sources.slice(1),
        at: payments[0].at,
        evidenceStatus: "verified",
      });
    }
  }

  if (segments.length === 1) {
    segments.push({
      id: "brief-empty",
      kind: "suggestion",
      title: "Le récit commence ici",
      narration: "Aucun Moment confirmé et visible ne permet encore de raconter l’avancement sans rien inventer.",
      source: { collection: "project", id: input.projectId, label: input.title },
      supportingSources: [],
      evidenceStatus: "verified",
    });
  }

  const city = factValue(data.city);
  const venue = factValue(data.venue);
  const verifiedLocation = venue.confidence === "confirme" && venue.value
    ? venue.value
    : city.confidence === "confirme" && city.value ? city.value : undefined;
  const nearbyCategories = input.role === "owner" && input.useWorldLocation && verifiedLocation
    ? [
        { id: "nearby-decoration", label: "Décoration et fleurs", reason: "Catégorie à comparer avec les prestataires déjà réservés.", evidenceStatus: "unverified" as const },
        { id: "nearby-sound", label: "Son et matériel", reason: "Catégorie à rechercher auprès d’une source locale vérifiée.", evidenceStatus: "unverified" as const },
        { id: "nearby-transport", label: "Transport et location", reason: "Catégorie à rechercher auprès d’une source locale vérifiée.", evidenceStatus: "unverified" as const },
      ]
    : [];

  return {
    projectId: input.projectId,
    role: input.role,
    generatedAt: now,
    segments,
    location: {
      available: input.role === "owner" && Boolean(verifiedLocation),
      ...(input.role === "owner" && input.useWorldLocation && verifiedLocation ? { label: verifiedLocation } : {}),
    },
    nearbyCategories,
  };
}