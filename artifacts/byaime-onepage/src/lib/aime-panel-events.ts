import type { WeddingPanelId, WorldPhase } from "./wedding-navigation";

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

/*
 * Le mode a changé et le panneau présenté n'existe plus ici : le Monde le DIT
 * au panneau, qui garde sa fenêtre ouverte et se vide — au lieu d'un
 * `aime:close-world-panel` qui refermait tout (mesuré le 17/09 : on demandait
 * « Avant » depuis la colonne et on se faisait sortir du panneau).
 */
export const AIME_PANEL_FOLLOW_EVENT = "aime:panel-follow-mode";

export type AimePanelFollowRequest = { panel: WeddingPanelId; phase: WorldPhase };

/** Le panneau présenté n'existe pas dans le nouveau mode : à suivre, pas à fermer. */
export function requestAimePanelFollow(request: AimePanelFollowRequest): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AIME_PANEL_FOLLOW_EVENT, { detail: request }));
}
