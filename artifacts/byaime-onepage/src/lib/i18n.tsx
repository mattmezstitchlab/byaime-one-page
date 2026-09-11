import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * Fondation d'internationalisation. La porte d'entrée (hero et onboarding
 * guidé) est bilingue FR/EN ; les écrans de l'espace privé seront traduits
 * écran par écran — le dictionnaire est volontairement regroupé par surface.
 */
export type Locale = "fr" | "en";

export const LOCALE_STORAGE_KEY = "aime-locale";

function detectLocale(): Locale {
  if (typeof window === "undefined") return "fr";
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored === "fr" || stored === "en") return stored;
  const nav = typeof navigator !== "undefined" ? navigator.language : "";
  return nav.toLowerCase().startsWith("en") ? "en" : "fr";
}

/** Toutes les clés de la porte d'entrée. Les valeurs manquantes retombent en FR. */
const fr = {
  // Header
  "nav.howItWorks": "Comment ça marche",
  "nav.signIn": "Se connecter",
  "nav.signUp": "Créer mon espace",
  "nav.openSpace": "Accéder à mon espace",
  "nav.language": "Langue",
  // Hero
  "hero.eyebrow": "L’art de créer des liens",
  "hero.title": "AIME",
  "hero.subtitle": "Cinq questions pour ouvrir votre espace privé de mariage — de la première idée au Jour J.",
  "hero.free": "Gratuit pour commencer. Aucun engagement.",
  "hero.scroll": "Défiler",
  // Choix Persona
  "persona.label": "Vous préparez ce mariage en tant que…",
  "persona.couple": "Couple",
  "persona.couple.sub": "Je prépare mon mariage",
  "persona.pro": "Professionnel·le",
  "persona.pro.sub": "J’accompagne des mariages (wedding planner, coordinatrice…)",
  // Composer — commun
  "composer.universe.couple": "Notre mariage",
  "composer.universe.pro": "Mariage client",
  "composer.skip": "Passer",
  "composer.next": "Question suivante",
  "composer.create": "Créer mon espace",
  "composer.createPro": "Créer l’espace professionnel",
  "composer.open": "Ouvrir mon espace",
  "composer.openPro": "Ouvrir l’espace professionnel",
  "composer.done": "AIME a tout ce qu’il lui faut.",
  "composer.hint.done": "Touchez une pastille pour modifier une réponse, puis créez votre espace.",
  "composer.finishEarly": "Terminer avec ces réponses",
  "composer.facts": "AIME retient déjà :",
  "composer.error.empty": "Répondez ou touchez « Passer » : cette question est facultative.",
  "composer.error.min": "Une seule réponse suffit : une date, un lieu, une ambiance…",
  "composer.currency": "Devise du budget",
  // Composer — questions Couple
  "q.couple.date": "La date du mariage, même approximative ?",
  "q.couple.date.placeholder": "14 août 2027",
  "q.couple.date.hint": "Une saison ou une année suffisent : AIME ajuste ensuite.",
  "q.couple.place": "Près de quelle ville, ou de quel lieu ?",
  "q.couple.place.placeholder": "Lille",
  "q.couple.place.hint": "La région, la ville ou déjà le domaine.",
  "q.couple.guests": "Combien d’invités au repas ?",
  "q.couple.guests.placeholder": "120",
  "q.couple.guests.hint": "Une estimation : les réponses viendront des RSVP.",
  "q.couple.budget": "Quel budget pour le mariage ?",
  "q.couple.budget.placeholder": "20 000",
  "q.couple.budget.hint": "Le montant de départ, il évoluera avec vos choix.",
  "q.couple.tone": "L’ambiance du mariage, en un mot ?",
  "q.couple.tone.placeholder": "champêtre, intime, festif…",
  "q.couple.tone.hint": "Le ton que vous voulez donner à ce jour.",
  // Composer — questions Pro
  "q.pro.date": "La date du mariage que vous organisez, même approximative ?",
  "q.pro.date.placeholder": "14 août 2027",
  "q.pro.date.hint": "Une saison ou une année suffisent, le Monde s’ajustera ensuite.",
  "q.pro.place": "Où ce mariage a-t-il lieu ?",
  "q.pro.place.placeholder": "Lille",
  "q.pro.place.hint": "La région, la ville ou déjà le domaine de vos clients.",
  "q.pro.guests": "Combien de convives sont prévus au repas ?",
  "q.pro.guests.placeholder": "120",
  "q.pro.guests.hint": "Une estimation de départ, les RSVP l’affineront.",
  "q.pro.budget": "Quel budget vos clients prévoient-ils ?",
  "q.pro.budget.placeholder": "20 000",
  "q.pro.budget.hint": "Le montant de départ du mariage, modifiable à tout moment.",
  "q.pro.tone": "L’ambiance souhaitée par vos clients, en un mot ?",
  "q.pro.tone.placeholder": "champêtre, intime, festif…",
  "q.pro.tone.hint": "Le ton que les mariés veulent donner à leur jour.",
  // Section guides
  "guides.eyebrow": "Guides",
  "guides.title": "Comprendre avant de cliquer.",
  "guides.subtitle": "Six repères pour commencer, et une vingtaine de démonstrations animées sur la page Guides.",
  "guides.all": "Tous les guides",
  // Section repérage
  "spot.eyebrow": "Tout au même endroit",
  "spot.title": "Votre mariage, enfin réuni.",
  "spot.1.title": "Invités & RSVP",
  "spot.1.text": "Réponses, foyers, régimes et plans de table sans tableur.",
  "spot.2.title": "Budget & prestataires",
  "spot.2.text": "Engagements, paiements, relances et documents reliés.",
  "spot.3.title": "Jour J & souvenirs",
  "spot.3.text": "Le programme en direct, puis les photos et remerciements.",
  "spot.cta": "Créer mon espace gratuitement",
  "spot.guides": "Voir les guides",
  "spot.alt": "Les invités du mariage, en astronautes, célèbrent avec les mariés dans une station spatiale",
  // Pied de page
  "footer.guides": "Guides",
  "footer.terms": "Conditions d’utilisation",
  "footer.privacy": "Confidentialité",
  "footer.legal": "En créant un espace, vous acceptez les conditions et la politique de confidentialité. Vos données restent les vôtres.",
} as const;

export type I18nKey = keyof typeof fr;

const en: Record<I18nKey, string> = {
  "nav.howItWorks": "How it works",
  "nav.signIn": "Sign in",
  "nav.signUp": "Create my space",
  "nav.openSpace": "Open my space",
  "nav.language": "Language",
  "hero.eyebrow": "The art of bringing people together",
  "hero.title": "AIME",
  "hero.subtitle": "Five questions to open your private wedding space — from the first idea to the big day.",
  "hero.free": "Free to start. No commitment.",
  "hero.scroll": "Scroll",
  "persona.label": "You’re preparing this wedding as…",
  "persona.couple": "A couple",
  "persona.couple.sub": "I’m planning my own wedding",
  "persona.pro": "A professional",
  "persona.pro.sub": "I plan weddings (wedding planner, coordinator…)",
  "composer.universe.couple": "Our wedding",
  "composer.universe.pro": "Client wedding",
  "composer.skip": "Skip",
  "composer.next": "Next question",
  "composer.create": "Create my space",
  "composer.createPro": "Create the professional space",
  "composer.open": "Open my space",
  "composer.openPro": "Open the professional space",
  "composer.done": "AIME has everything it needs.",
  "composer.hint.done": "Tap a chip to edit an answer, then create your space.",
  "composer.finishEarly": "Finish with these answers",
  "composer.facts": "AIME already noted:",
  "composer.error.empty": "Answer or tap “Skip”: this question is optional.",
  "composer.error.min": "A single answer is enough: a date, a place, a mood…",
  "composer.currency": "Budget currency",
  "q.couple.date": "The wedding date, even an approximate one?",
  "q.couple.date.placeholder": "August 14, 2027",
  "q.couple.date.hint": "A season or a year is enough — AIME adjusts later.",
  "q.couple.place": "Near which city or venue?",
  "q.couple.place.placeholder": "Lille",
  "q.couple.place.hint": "The region, the city, or already the estate.",
  "q.couple.guests": "How many guests at the dinner?",
  "q.couple.guests.placeholder": "120",
  "q.couple.guests.hint": "An estimate — RSVP replies will refine it.",
  "q.couple.budget": "What is the wedding budget?",
  "q.couple.budget.placeholder": "20,000",
  "q.couple.budget.hint": "The starting amount; it evolves with your choices.",
  "q.couple.tone": "The wedding mood, in one word?",
  "q.couple.tone.placeholder": "rustic, intimate, festive…",
  "q.couple.tone.hint": "The tone you want for that day.",
  "q.pro.date": "The date of the wedding you’re planning, even approximate?",
  "q.pro.date.placeholder": "August 14, 2027",
  "q.pro.date.hint": "A season or a year is enough — the World adjusts later.",
  "q.pro.place": "Where does this wedding take place?",
  "q.pro.place.placeholder": "Lille",
  "q.pro.place.hint": "The region, city, or already your clients’ venue.",
  "q.pro.guests": "How many guests are expected at dinner?",
  "q.pro.guests.placeholder": "120",
  "q.pro.guests.hint": "A starting estimate; RSVP replies will refine it.",
  "q.pro.budget": "What budget are your clients planning?",
  "q.pro.budget.placeholder": "20,000",
  "q.pro.budget.hint": "The wedding’s starting amount, editable at any time.",
  "q.pro.tone": "The mood your clients want, in one word?",
  "q.pro.tone.placeholder": "rustic, intimate, festive…",
  "q.pro.tone.hint": "The tone the couple wants for their day.",
  "guides.eyebrow": "Guides",
  "guides.title": "Understand before you click.",
  "guides.subtitle": "Six starting points, and about twenty animated demos on the Guides page.",
  "guides.all": "All guides",
  "spot.eyebrow": "Everything in one place",
  "spot.title": "Your wedding, finally together.",
  "spot.1.title": "Guests & RSVP",
  "spot.1.text": "Replies, households, diets and seating charts, no spreadsheets.",
  "spot.2.title": "Budget & vendors",
  "spot.2.text": "Commitments, payments, follow-ups and linked documents.",
  "spot.3.title": "Big day & memories",
  "spot.3.text": "The live run sheet, then photos and thank-you notes.",
  "spot.cta": "Create my space for free",
  "spot.guides": "View the guides",
  "spot.alt": "The wedding guests, dressed as astronauts, celebrate with the couple in a space station",
  "footer.guides": "Guides",
  "footer.terms": "Terms of use",
  "footer.privacy": "Privacy",
  "footer.legal": "By creating a space, you accept the terms and privacy policy. Your data stays yours.",
};

const dictionaries: Record<Locale, Record<I18nKey, string>> = { fr, en };

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: I18nKey) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function useI18nState(): I18nValue {
  const [locale, setLocaleState] = useState<Locale>(() => detectLocale());
  const setLocale = (next: Locale) => {
    setLocaleState(next);
    if (typeof window !== "undefined") window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
  };
  return {
    locale,
    setLocale,
    t: (key) => dictionaries[locale][key] ?? fr[key] ?? key,
  };
}

export function I18nProvider({ children }: { children: ReactNode }) {
  return <I18nContext.Provider value={useI18nState()}>{children}</I18nContext.Provider>;
}

/** Fonctionne aussi hors provider (rendu SSR isolé) : chaque surface retombe sur FR. */
export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  const local = useI18nState();
  return context ?? local;
}
