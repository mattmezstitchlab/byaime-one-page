/**
 * Demande de focus dans le Monde.
 *
 * Un panneau, un Moment ou une entité peut être ouvert depuis n'importe quel
 * écran : la demande est conservée en mémoire de session (le Monde n'est pas
 * encore monté) puis rejouée par `ProjectStage` via l'événement
 * `aime:focus-world`.
 */
export type WorldFocusRequest = {
  route?: "/user-portal";
  phase?: string;
  view?: string;
  panel?: string;
  auditView?: string;
  graph?: boolean;
  /** Ouvre la synthèse du Monde (budget, progression, alertes de conflits). */
  overview?: boolean;
  momentId?: string;
  entityKind?: string;
  entityId?: string;
  musicTrackId?: string;
};

const WORLD_FOCUS_KEY = "aime:world-focus";

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
