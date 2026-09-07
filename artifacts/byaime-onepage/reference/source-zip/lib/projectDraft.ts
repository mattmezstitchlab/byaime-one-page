import type { WorldProject } from "./types";

const KEY = "aime.project.draft.v1";
const ACTIVE_PREFIX = "aime.project.active.v1.";

type DraftEnvelope = {
  story: string;
  project: WorldProject;
  savedAt: number;
};

function sameStory(a: string, b: string) {
  return a.trim().replace(/\s+/g, " ") === b.trim().replace(/\s+/g, " ");
}

export function loadProjectDraft(story: string): WorldProject | null {
  if (typeof window === "undefined" || !story.trim()) return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as DraftEnvelope;
    return envelope?.project && sameStory(envelope.story ?? "", story)
      ? envelope.project
      : null;
  } catch {
    return null;
  }
}

/** Le brouillon en attente, quelle que soit son histoire (retour de connexion). */
export function loadAnyProjectDraft(): { story: string; project: WorldProject } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as DraftEnvelope;
    return envelope?.project ? { story: envelope.story ?? "", project: envelope.project } : null;
  } catch {
    return null;
  }
}

export function saveProjectDraft(story: string, project: WorldProject) {
  if (typeof window === "undefined" || !story.trim()) return;
  const envelope: DraftEnvelope = { story: story.trim(), project, savedAt: Date.now() };
  window.localStorage.setItem(KEY, JSON.stringify(envelope));
}

export function clearProjectDraft() {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
}

export function saveActiveProject(project: WorldProject) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${ACTIVE_PREFIX}${project.id}`, JSON.stringify(project));
}

export function loadActiveProject(id: string): WorldProject | null {
  if (typeof window === "undefined" || !id) return null;
  try {
    const raw = window.localStorage.getItem(`${ACTIVE_PREFIX}${id}`);
    return raw ? (JSON.parse(raw) as WorldProject) : null;
  } catch {
    return null;
  }
}
