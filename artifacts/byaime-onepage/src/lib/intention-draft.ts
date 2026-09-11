/**
 * L'intention libre qui ouvre un Monde : sa longueur minimale est la seule
 * règle partagée entre le champ de l'accueil, le compositeur du Monde et le
 * store — un seuil différent ailleurs rendrait le bouton d'envoi incohérent.
 */
export const MIN_INTENTION_LENGTH = 12;

export const INTENTION_DRAFT_KEY = "aime-intention-draft";

/**
 * L'intention saisie sur l'accueil survit à la création du compte : elle reste
 * en local, puis le store la reprend dès qu'une session existe.
 */
export function saveIntentionDraft(text: string): void {
  if (typeof window === "undefined") return;
  const value = text.trim();
  if (value.length < MIN_INTENTION_LENGTH) {
    window.localStorage.removeItem(INTENTION_DRAFT_KEY);
    return;
  }
  window.localStorage.setItem(INTENTION_DRAFT_KEY, value);
}

export function readIntentionDraft(): string {
  if (typeof window === "undefined") return "";
  const value = window.localStorage.getItem(INTENTION_DRAFT_KEY)?.trim() ?? "";
  return value.length >= MIN_INTENTION_LENGTH ? value : "";
}

export function clearIntentionDraft(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(INTENTION_DRAFT_KEY);
}
