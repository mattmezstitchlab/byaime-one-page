import { fact, type WorldProject } from "./types";
import { parseDateFromText } from "./parser";
import { budgetToken, type CurrencyCode } from "./money";

/*
 * Les réponses du mariage, et le projet qu'elles produisent.
 *
 * Avant ce module, le tunnel « Créer un mariage » faisait un aller-retour
 * inutile : cinq réponses → une phrase française → relecture de cette phrase
 * par `parseIntention` → projet. La phrase était donc le **transport** des
 * données, et chaque information devait survivre à deux transformations pour
 * arriver intacte.
 *
 * Ici, la donnée structurée est la source de vérité :
 *  - `weddingDraftFromAnswers` construit le projet **depuis les réponses** ;
 *  - `composeIntention` reste disponible, mais uniquement comme
 *    représentation humaine (sous-titre, export). Elle ne nourrit plus rien.
 */

export type WeddingFieldKey = "date" | "place" | "guests" | "budget" | "tone";
export type WeddingAnswers = Partial<Record<WeddingFieldKey, string>>;
export type Persona = "couple" | "pro";

export type WeddingComposeOptions = {
  persona?: Persona;
  currency?: CurrencyCode;
  locale?: "fr" | "en";
};

const digits = (value: string) => value.replace(/[^\d]/g, "");
const capitalise = (value: string) => value.charAt(0).toLocaleUpperCase() + value.slice(1);
/** Une réponse peut arriver avec sa préposition (« près de Nantes ») : elle ne fait pas partie du lieu. */
const barePlace = (value: string) =>
  value
    .trim()
    .replace(/^(à|dans la région de|près de|proche de|near|in)\s+/i, "")
    .trim();

/** Une phrase lisible, pour le sous-titre et l'export — jamais pour la donnée. */
export function composeIntention(
  answers: WeddingAnswers,
  options: WeddingComposeOptions = {},
): string {
  const persona: Persona = options.persona ?? "couple";
  const currency: CurrencyCode = options.currency ?? "EUR";
  const locale = options.locale ?? "fr";
  const parts: string[] = [];
  const date = answers.date?.trim();
  const place = barePlace(answers.place ?? "");
  const guests = digits(answers.guests ?? "");
  const budget = digits(answers.budget ?? "");

  if (locale === "en") {
    const prefix = persona === "pro" ? "A client wedding" : "Our wedding";
    if (date) parts.push(`on ${date}`);
    if (place) parts.push(`near ${capitalise(place)}`);
    if (guests) parts.push(`${guests} guests`);
    if (budget) parts.push(budgetToken(budget, currency, "en"));
    if (answers.tone?.trim()) parts.push(`${answers.tone.trim().toLowerCase()} mood`);
    return `${prefix}${parts.length ? ` ${parts.join(", ")}` : ""}.`;
  }

  const prefix = persona === "pro" ? "Le mariage client" : "Notre mariage";
  if (date) parts.push(`le ${date.toLocaleLowerCase("fr-FR")}`);
  if (place) parts.push(`près de ${capitalise(place)}`);
  if (guests) parts.push(`${guests} invités`);
  if (budget) parts.push(budgetToken(budget, currency, "fr"));
  if (answers.tone?.trim()) parts.push(`ambiance ${answers.tone.trim().toLocaleLowerCase("fr-FR")}`);
  return `${prefix}${parts.length ? ` ${parts.join(", ")}` : ""}.`;
}

/**
 * Le projet, construit depuis les réponses elles-mêmes.
 *
 * Chaque champ absent reste explicitement « manquant » : rien n'est inventé, et
 * la date lue directement (sans passer par une phrase) conserve son jour, son
 * mois et son année.
 */
export function weddingDraftFromAnswers(
  answers: WeddingAnswers,
  options: WeddingComposeOptions = {},
): Partial<WorldProject> {
  const locale = options.locale ?? "fr";
  const currency: CurrencyCode = options.currency ?? "EUR";
  const date = answers.date?.trim() ?? "";
  const place = barePlace(answers.place ?? "");
  const guests = digits(answers.guests ?? "");
  const budget = digits(answers.budget ?? "");

  const pivot = date
    ? (() => {
        const parsed = parseDateFromText(date, { locale });
        return fact(parsed.value, parsed.confidence);
      })()
    : fact(Date.now() + 31536000000, "deduit");

  return {
    schemaVersion: 2,
    /* Le titre d'un Monde neuf. Il se modifie ensuite depuis le Monde lui-même. */
    title: options.persona === "pro" ? "Mariage client" : "Notre Mariage",
    universe: "Mariage",
    pivot,
    city: place ? fact(capitalise(place), "confirme") : fact(null, "manquant"),
    guestsCount: guests ? fact(Number(guests), "confirme") : fact(null, "manquant"),
    budget: budget ? fact(Number(budget), "confirme") : fact(null, "manquant"),
    currency,
    persona: options.persona ?? "couple",
  };
}

/** Ce qui a réellement été répondu — pour ne jamais afficher une étape vide. */
export function answeredFields(answers: WeddingAnswers): WeddingFieldKey[] {
  return (Object.keys(answers) as WeddingFieldKey[]).filter((key) =>
    (answers[key] ?? "").trim().length > 0,
  );
}
