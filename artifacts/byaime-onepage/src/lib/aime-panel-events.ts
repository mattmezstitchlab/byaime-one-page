import type { WeddingPanelId } from "./wedding-navigation";

/*
 * Événements du Panneau AIME : le Monde (ProjectStage) décide, le panneau
 * (monté dans PrivateLayout, donc en dehors de ProjectStage) exécute.
 *
 * La file `pending` couvre le premier chargement : ProjectStage consomme un
 * focus en attente dès son montage et demande le panneau AVANT que le
 * Panneau AIME n'ait enregistré son écouteur — la demande est donc mise en
 * file, puis reprise par le panneau à son montage.
 */
export const AIME_SHOW_PANEL_EVENT = "aime:show-panel";

export type AimePanelShowRequest = { panel: WeddingPanelId; momentId?: string | null };

let pending: AimePanelShowRequest | null = null;

/** Demande au Panneau AIME d'ouvrir un panneau (file + événement). */
export function requestAimePanelShow(request: AimePanelShowRequest): void {
  pending = request;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(AIME_SHOW_PANEL_EVENT, { detail: request }));
  }
}

/** Le Panneau AIME reprend la demande en file à son montage. */
export function takePendingAimePanelShow(): AimePanelShowRequest | null {
  const value = pending;
  pending = null;
  return value;
}
