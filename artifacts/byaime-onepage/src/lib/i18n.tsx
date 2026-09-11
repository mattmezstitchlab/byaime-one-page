import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  LOCALE_STORAGE_KEY,
  dictionaries,
  translate,
  type I18nKey,
  type Locale,
} from "./i18n-dictionary";

/**
 * Fondation d'internationalisation. La porte d'entrée (hero, onboarding guidé,
 * guides animés et page invité RSVP) est bilingue FR/EN ; l'espace privé est
 * traduit par lots — le dictionnaire est volontairement regroupé par surface et
 * vit dans `i18n-dictionary.ts` pour rester importable hors React.
 */
export { LOCALE_STORAGE_KEY, dictionaries, translate };
export type { I18nKey, Locale };

function detectLocale(): Locale {
  if (typeof window === "undefined") return "fr";
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored === "fr" || stored === "en") return stored;
  const nav = typeof navigator !== "undefined" ? navigator.language : "";
  return nav.toLowerCase().startsWith("en") ? "en" : "fr";
}

export type Translate = (key: I18nKey, vars?: Record<string, string | number>) => string;

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translate;
};

const I18nContext = createContext<I18nValue | null>(null);

function useI18nState(initialLocale?: Locale): I18nValue {
  const [locale, setLocaleState] = useState<Locale>(() => initialLocale ?? detectLocale());
  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof window !== "undefined") window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
  }, []);
  /* `lang` suit la langue choisie : lecteurs d'écran, césure et traduction
     automatique du navigateur s'appuient dessus. */
  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = locale;
  }, [locale]);
  const t = useCallback<Translate>((key, vars) => translate(locale, key, vars), [locale]);
  return useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
}

/**
 * `initialLocale` impose la langue de départ au lieu de la déduire du stockage
 * et du navigateur : utile pour une surface servie dans une langue décidée
 * ailleurs (rendu hors navigateur, lien porteur d'une langue).
 */
export function I18nProvider({ children, initialLocale }: { children: ReactNode; initialLocale?: Locale }) {
  return <I18nContext.Provider value={useI18nState(initialLocale)}>{children}</I18nContext.Provider>;
}

/** Fonctionne aussi hors provider (rendu SSR isolé) : chaque surface retombe sur FR. */
export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  const local = useI18nState();
  return context ?? local;
}
