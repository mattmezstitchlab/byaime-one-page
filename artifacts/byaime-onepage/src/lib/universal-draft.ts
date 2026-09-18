import type { UniversalActorKind } from "./types";

export const UNIVERSAL_DRAFT_KEY = "aime-universal-zero-draft-v1";

export type UniversalZeroDraft = {
  step: "A" | "I" | "M" | "E" | null;
  actorKind?: UniversalActorKind;
  actorDetail?: string;
  actorSub?: string; // e.g., "artiste / musicien"
  intention: string[];
  situation: string[];
  situationFree?: string;
  ecosystem: string[];
  updatedAt: number;
};

export function saveUniversalDraft(draft: UniversalZeroDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(UNIVERSAL_DRAFT_KEY, JSON.stringify(draft));
  } catch {}
}

export function loadUniversalDraft(): UniversalZeroDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(UNIVERSAL_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UniversalZeroDraft;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearUniversalDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(UNIVERSAL_DRAFT_KEY);
  } catch {}
}
