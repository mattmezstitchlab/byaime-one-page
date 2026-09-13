/*
 * L'apparence (sombre/clair) partagée : le bouton unique et la coque privée
 * lisent et basculent le même état, persisté en `localStorage` et appliqué
 * sur `documentElement` — même patron sans dépendance que `world-nav-state`.
 */

export type AimeAppearance = "dark" | "light";

const STORAGE_KEY = "aime-appearance";

function readStored(): AimeAppearance {
  if (typeof window === "undefined") return "dark";
  return window.localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
}

let current: AimeAppearance = readStored();
const listeners = new Set<(appearance: AimeAppearance) => void>();

function apply(appearance: AimeAppearance): void {
  if (typeof document !== "undefined") document.documentElement.dataset.aimeTheme = appearance;
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, appearance);
}

export function getAppearance(): AimeAppearance {
  return current;
}

export function subscribeAppearance(listener: (appearance: AimeAppearance) => void): () => void {
  listeners.add(listener);
  listener(current);
  return () => listeners.delete(listener);
}

export function toggleAppearance(): AimeAppearance {
  current = current === "dark" ? "light" : "dark";
  apply(current);
  listeners.forEach(listener => listener(current));
  return current;
}

/** Applique l'apparence stockée au démarrage de la coque privée. */
export function initAppearance(): void {
  current = readStored();
  apply(current);
}
