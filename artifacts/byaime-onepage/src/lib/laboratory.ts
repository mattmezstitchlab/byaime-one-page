export const LABORATORY_FEEDBACK_TYPES = [
  "bug",
  "remarque",
  "suggestion",
  "idee",
  "question",
  "positif",
  "ux",
  "contenu_donnees",
] as const;

export const LABORATORY_FEEDBACK_STATUSES = [
  "nouveau",
  "en_cours",
  "a_verifier",
  "resolu",
  "archive",
] as const;

export type LaboratoryFeedbackType = (typeof LABORATORY_FEEDBACK_TYPES)[number];
export type LaboratoryFeedbackStatus = (typeof LABORATORY_FEEDBACK_STATUSES)[number];

export type LaboratoryContext = {
  projectId?: string;
  role?: string;
  route?: "profile" | "world" | "network" | "laboratory";
  path?: string;
  source?: string;
  view?: string;
  phase?: string;
  panel?: string;
  auditView?: string;
  syncStatus?: string;
  momentId?: string;
  momentTitle?: string;
  entityKind?: string;
  entityId?: string;
  entityLabel?: string;
  narrative?: string;
};

export type LaboratoryFeedbackItem = {
  id: string;
  labId: string;
  type: LaboratoryFeedbackType;
  status: LaboratoryFeedbackStatus;
  message: string;
  context: LaboratoryContext;
  createdAt: string;
  updatedAt: string;
  authoredByCurrentUser: boolean;
};

export type LaboratoryDraft = {
  type?: LaboratoryFeedbackType;
  message?: string;
  context?: Partial<LaboratoryContext>;
};

export type WorldFocusRequest = {
  route?: "/user-portal";
  phase?: string;
  view?: string;
  panel?: string;
  auditView?: string;
  momentId?: string;
  entityKind?: string;
  entityId?: string;
  musicTrackId?: string;
};

const LAB_DRAFT_KEY = "aime:laboratory:pending-draft";
const WORLD_FOCUS_KEY = "aime:world-focus";

export const laboratoryTypeLabels: Record<LaboratoryFeedbackType, string> = {
  bug: "Bug",
  remarque: "Remarque",
  suggestion: "Suggestion",
  idee: "Idée",
  question: "Je ne comprends pas",
  positif: "Retour positif",
  ux: "Amélioration UX",
  contenu_donnees: "Contenu ou données",
};

export const laboratoryStatusLabels: Record<LaboratoryFeedbackStatus, string> = {
  nouveau: "Nouveau",
  en_cours: "En cours",
  a_verifier: "À vérifier",
  resolu: "Résolu",
  archive: "Archivé",
};

export function cleanLaboratoryContext(
  context: Partial<LaboratoryContext> | undefined,
): LaboratoryContext {
  return Object.fromEntries(
    Object.entries(context || {}).filter(([, value]) =>
      value !== undefined && value !== null && String(value).trim() !== "",
    ),
  ) as LaboratoryContext;
}

export function queueLaboratoryDraft(draft: LaboratoryDraft): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    LAB_DRAFT_KEY,
    JSON.stringify({
      ...draft,
      context: cleanLaboratoryContext(draft.context),
    }),
  );
}

export function consumeLaboratoryDraft(): LaboratoryDraft | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = window.sessionStorage.getItem(LAB_DRAFT_KEY);
  if (!raw) return undefined;
  window.sessionStorage.removeItem(LAB_DRAFT_KEY);
  try {
    const parsed = JSON.parse(raw) as LaboratoryDraft;
    return {
      ...parsed,
      context: cleanLaboratoryContext(parsed.context),
    };
  } catch {
    return undefined;
  }
}

export function openLaboratory(draft: LaboratoryDraft = {}): void {
  if (typeof window === "undefined") return;
  const detail = {
    ...draft,
    context: cleanLaboratoryContext(draft.context),
  };
  queueLaboratoryDraft(detail);
  window.dispatchEvent(new CustomEvent("aime:open-laboratory", { detail }));
}

export function queueWorldFocus(request: WorldFocusRequest): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(WORLD_FOCUS_KEY, JSON.stringify(request));
}

export function consumeWorldFocus(): WorldFocusRequest | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = window.sessionStorage.getItem(WORLD_FOCUS_KEY);
  if (!raw) return undefined;
  window.sessionStorage.removeItem(WORLD_FOCUS_KEY);
  try {
    return JSON.parse(raw) as WorldFocusRequest;
  } catch {
    return undefined;
  }
}

export function focusWorld(request: WorldFocusRequest): void {
  if (typeof window === "undefined") return;
  queueWorldFocus(request);
  window.dispatchEvent(new CustomEvent("aime:focus-world", { detail: request }));
}

export function describeLaboratoryContext(context: LaboratoryContext): string[] {
  return [
    context.route === "world" ? "Monde" : context.route === "profile" ? "Profil" : context.route === "network" ? "Carte" : context.route === "laboratory" ? "Laboratoire" : undefined,
    context.phase ? `Phase ${context.phase}` : undefined,
    context.view ? `Vue ${context.view}` : undefined,
    context.panel ? `Panneau ${context.panel}` : undefined,
    context.momentTitle ? `Moment ${context.momentTitle}` : undefined,
    context.entityLabel ? `${context.entityKind || "Élément"} · ${context.entityLabel}` : undefined,
    context.narrative,
  ].filter(Boolean) as string[];
}
