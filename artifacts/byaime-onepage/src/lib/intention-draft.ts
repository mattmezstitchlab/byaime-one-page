import { DEFAULT_CURRENCY, isCurrencyCode, type CurrencyCode } from "./money";

/**
 * L'intention libre qui ouvre un Monde : sa longueur minimale est la seule
 * règle partagée entre le champ de l'accueil, le compositeur du Monde et le
 * store — un seuil différent ailleurs rendrait le bouton d'envoi incohérent.
 */
export const MIN_INTENTION_LENGTH = 12;

export const INTENTION_DRAFT_KEY = "aime-intention-draft";
/** Métadonnées du parcours (persona Couple/Pro, devise, langue), à côté du texte. */
export const INTENTION_META_KEY = "aime-intention-meta";

export type Persona = "couple" | "pro";

export type IntentionMeta = {
  persona: Persona;
  currency: CurrencyCode;
  locale: "fr" | "en";
};

export const DEFAULT_INTENTION_META: IntentionMeta = {
  persona: "couple",
  currency: DEFAULT_CURRENCY,
  locale: "fr",
};

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
  window.localStorage.removeItem(INTENTION_META_KEY);
}

export function saveIntentionMeta(meta: Partial<IntentionMeta>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INTENTION_META_KEY, JSON.stringify({ ...readIntentionMeta(), ...meta }));
}

export function readIntentionMeta(): IntentionMeta {
  if (typeof window === "undefined") return DEFAULT_INTENTION_META;
  try {
    const raw = window.localStorage.getItem(INTENTION_META_KEY);
    if (!raw) return DEFAULT_INTENTION_META;
    const parsed = JSON.parse(raw) as Partial<IntentionMeta>;
    return {
      persona: parsed.persona === "pro" ? "pro" : "couple",
      currency: isCurrencyCode(parsed.currency) ? parsed.currency : DEFAULT_CURRENCY,
      locale: parsed.locale === "en" ? "en" : "fr",
    };
  } catch {
    return DEFAULT_INTENTION_META;
  }
}

/*
 * La carte confirmée par un visiteur non connecté : le même cycle de vie que
 * la phrase — stockée en local, consommée UNE FOIS à l'hydratation qui suit
 * la création du compte, puis supprimée. On conserve le texte brut : la
 * lecture (parseCarteText) est rejouée à la reprise, jamais inventée.
 */
export const CARTE_PENDING_KEY = "aime-carte-pending";

export type PendingCarte = { text: string; name: string };

export function savePendingCarte(pending: PendingCarte): void {
  if (typeof window === "undefined") return;
  const text = pending.text.trim();
  if (!text) {
    window.localStorage.removeItem(CARTE_PENDING_KEY);
    return;
  }
  window.localStorage.setItem(CARTE_PENDING_KEY, JSON.stringify({ text, name: pending.name }));
}

export function readPendingCarte(): PendingCarte | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CARTE_PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingCarte>;
    if (typeof parsed.text !== "string" || !parsed.text.trim()) return null;
    return { text: parsed.text, name: typeof parsed.name === "string" && parsed.name ? parsed.name : "carte-aime.json" };
  } catch {
    return null;
  }
}

export function clearPendingCarte(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CARTE_PENDING_KEY);
}
