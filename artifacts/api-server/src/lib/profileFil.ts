import type { ProjectRole } from "./permissions";
import { buildAuthorizedWeddingBrief } from "./weddingBrief";

type UnknownRecord = Record<string, unknown>;
type FilSourceCollection = "project" | "timeline" | "task" | "payment" | "guide" | "public_aggregate";
type FilCard = {
  id: string;
  category: "now" | "world" | "learn" | "inspiration";
  type: "task" | "fact" | "alert" | "suggestion" | "tutorial" | "inspiration";
  title: string;
  summary: string;
  priority: "urgent" | "high" | "normal" | "low";
  reason: string;
  source: { collection: FilSourceCollection; id: string; label: string };
  action: { kind: "open_timeline" | "open_world" | "none"; label: string; targetId?: string };
  visibility: "prive" | "equipe" | "audience";
  status: "active";
  evidenceStatus: "verified" | "unverified";
};

const records = (value: unknown): UnknownRecord[] =>
  Array.isArray(value) ? value.filter((item): item is UnknownRecord => Boolean(item) && typeof item === "object") : [];
const text = (value: unknown): string | undefined => typeof value === "string" && value.trim() ? value.trim() : undefined;
const number = (value: unknown): number | undefined => typeof value === "number" && Number.isFinite(value) ? value : undefined;

function eventVisibleToRole(event: UnknownRecord, role: ProjectRole): boolean {
  const visibility = text(event.visibility) ?? "prive";
  const financial = ["paiement", "facture", "devis"].includes(text(event.kind) ?? "");
  if (financial && role !== "owner") return false;
  if (role === "owner") return true;
  if (role === "planner" || role === "family") return visibility !== "prive";
  return visibility === "audience";
}

function cardVisibility(value: unknown): FilCard["visibility"] {
  return value === "equipe" || value === "audience" ? value : "prive";
}

function dateLabel(value: number): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(value);
}

export function buildAuthorizedProfileFil(input: {
  projectId: string;
  title: string;
  data: unknown;
  role: ProjectRole;
  now?: number;
}) {
  const now = input.now ?? Date.now();
  const data = input.data && typeof input.data === "object" ? input.data as UnknownRecord : {};
  const timeline = records(data.timeline);
  const visibleEvents = timeline.filter(event =>
    text(event.confidence) === "confirme"
    && text(event.provenance) !== "demo"
    && eventVisibleToRole(event, input.role)
  );
  const eventById = new Map(timeline.map(event => [text(event.id), event]));
  const brief = buildAuthorizedWeddingBrief({
    projectId: input.projectId,
    title: input.title,
    data,
    role: input.role,
    useWorldLocation: false,
    now,
  });

  const cards: FilCard[] = brief.segments
    .filter(segment => segment.id !== "brief-introduction" && segment.id !== "brief-empty" && segment.source.collection !== "task")
    .map(segment => {
      const sourceCollection = segment.source.collection as FilSourceCollection;
      const sourceEvent = sourceCollection === "timeline" ? eventById.get(segment.source.id) : undefined;
      const type: FilCard["type"] = segment.kind === "alert"
        ? "alert"
        : segment.kind === "suggestion" ? "suggestion" : "fact";
      const priority: FilCard["priority"] = segment.kind === "alert" ? "high" : segment.kind === "suggestion" ? "low" : "normal";
      const action: FilCard["action"] = sourceCollection === "timeline"
        ? { kind: "open_timeline", label: "Voir dans la Timeline", targetId: segment.source.id }
        : { kind: "open_world", label: "Ouvrir mon Monde" };
      return {
        id: `fil-${segment.id}`,
        category: segment.kind === "alert" ? "now" : "world",
        type,
        title: segment.title,
        summary: segment.narration,
        priority,
        reason: `Affiché à partir de ${segment.source.label}, une source que votre rôle peut consulter.`,
        source: {
          collection: sourceCollection,
          id: segment.source.id,
          label: segment.source.label,
        },
        action,
        visibility: sourceEvent ? cardVisibility(sourceEvent.visibility) : "prive",
        status: "active",
        evidenceStatus: segment.evidenceStatus,
      };
    });

  if (input.role !== "viewer") {
    const pendingTasks = records(data.tasks)
      .flatMap(task => {
        const id = text(task.id);
        const title = text(task.title);
        const status = text(task.status);
        return id && title && status !== "termine"
          ? [{ id, title, priority: text(task.priority), dueDate: number(task.dueDate) }]
          : [];
      })
      .sort((a, b) => {
        const importance = (value?: string) => value === "haute" ? 0 : value === "normale" ? 1 : 2;
        return importance(a.priority) - importance(b.priority)
          || (a.dueDate ?? Number.MAX_SAFE_INTEGER) - (b.dueDate ?? Number.MAX_SAFE_INTEGER);
      })
      .slice(0, 4);

    cards.push(...pendingTasks.map(task => ({
      id: `fil-task-${task.id}`,
      category: "now" as const,
      type: "task" as const,
      title: task.title,
      summary: task.dueDate === undefined
        ? "Cette étape reste à organiser dans votre Monde."
        : `Cette étape est prévue pour le ${dateLabel(task.dueDate)}.`,
      priority: task.priority === "haute" ? "high" as const : task.priority === "basse" ? "low" as const : "normal" as const,
      reason: "Cette carte apparaît parce que cette étape n’est pas encore terminée.",
      source: { collection: "task" as const, id: task.id, label: task.title },
      action: { kind: "open_world" as const, label: "Ouvrir mon Monde" },
      visibility: "equipe" as const,
      status: "active" as const,
      evidenceStatus: "verified" as const,
    })));
  }

  if (visibleEvents.length === 0) {
    cards.push({
      id: "fil-guide-first-moment",
      category: "learn",
      type: "tutorial",
      title: "Relier un premier Moment",
      summary: "Ajoutez une date, une décision ou un souvenir confirmé pour commencer la Timeline du Profil.",
      priority: "low",
      reason: "Aucun Moment confirmé et visible par votre rôle n’est encore présent.",
      source: { collection: "guide", id: "timeline-first-moment-v1", label: "Guide AIME · Timeline" },
      action: { kind: input.role === "viewer" ? "none" : "open_world", label: input.role === "viewer" ? "Consultation uniquement" : "Ajouter dans mon Monde" },
      visibility: "prive",
      status: "active",
      evidenceStatus: "verified",
    });
  }

  if (input.role !== "viewer" && !records(data.tasks).some(task => text(task.status) !== "termine")) {
    cards.push({
      id: "fil-guide-first-task",
      category: "learn",
      type: "tutorial",
      title: "Préparer la prochaine étape",
      summary: "Créez une étape concrète, puis attribuez-la à la bonne personne et à la bonne période.",
      priority: "low",
      reason: "Aucune étape à faire n’est actuellement enregistrée dans ce Monde.",
      source: { collection: "guide", id: "planning-first-task-v1", label: "Guide AIME · Organisation" },
      action: { kind: "open_world", label: "Ouvrir mon Monde" },
      visibility: "equipe",
      status: "active",
      evidenceStatus: "verified",
    });
  }

  const priorityOrder: Record<FilCard["priority"], number> = { urgent: 0, high: 1, normal: 2, low: 3 };
  cards.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || a.id.localeCompare(b.id));

  return {
    projectId: input.projectId,
    role: input.role,
    generatedAt: now,
    cards,
  };
}