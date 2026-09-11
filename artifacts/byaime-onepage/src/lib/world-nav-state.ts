import type { TimelineView } from "./timeline-graph";
import type { WeddingPanelId, WorldPhase } from "./wedding-navigation";

/*
 * La barre latérale globale (PrivateLayout) survit au contenu du Monde
 * (ProjectStage), qui porte pourtant l'état « phase / vue / panneau ». Ce petit
 * store sans dépendance permet au Monde de publier sa position et à la barre
 * latérale d'éclairer la catégorie active, sans faire remonter l'état dans
 * toute l'arbre. Les actions, elles, passent par les événements
 * `aime:focus-world` déjà compris par ProjectStage.
 */
export type WorldNavState = {
  active: boolean;
  phase: WorldPhase;
  view: TimelineView;
  panel: WeddingPanelId | null;
  /** Rôle effectif (l'aperçu invité publie alors « viewer »). */
  role: string;
};

const initial: WorldNavState = { active: false, phase: "avant", view: "chronological", panel: null, role: "owner" };
let current: WorldNavState = initial;
const listeners = new Set<(state: WorldNavState) => void>();

export function setWorldNavState(patch: Partial<WorldNavState>) {
  current = { ...current, ...patch };
  listeners.forEach(listener => listener(current));
}

export function getWorldNavState(): WorldNavState {
  return current;
}

export function subscribeWorldNav(listener: (state: WorldNavState) => void): () => void {
  listeners.add(listener);
  listener(current);
  return () => listeners.delete(listener);
}

/** Ouvre une destination du Monde (vue ou panneau) depuis la barre latérale. */
export function focusWorldDestination(destination:
  | { kind: "view"; view: TimelineView }
  | { kind: "panel"; panel: WeddingPanelId },
) {
  window.dispatchEvent(
    new CustomEvent("aime:focus-world", {
      detail: { route: "/user-portal", ...(destination.kind === "view" ? { view: destination.view } : { panel: destination.panel }) },
    }),
  );
}
