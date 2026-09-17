import { translate, type Locale } from "./i18n-dictionary";

export type SaveOutcome = "saved" | "error" | "conflict";

export function pendingSaveOutcomeNotice(
  outcome: SaveOutcome,
  successNotice?: string,
  syncError?: string,
  locale: Locale = "fr",
): string {
  if (outcome === "saved") {
    return successNotice ?? translate(locale, "sync.saved");
  }
  if (outcome === "conflict") {
    return translate(locale, "sync.conflict");
  }
  return syncError ?? translate(locale, "sync.local");
}
