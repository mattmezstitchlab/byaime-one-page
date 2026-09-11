/**
 * Devises comprises dès la porte d'entrée (le budget est annoncé dans la
 * devise du mariage). L'ordre met en tête les marchés de lancement.
 */
export const CURRENCIES = [
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "USD", symbol: "$", label: "Dollar US" },
  { code: "GBP", symbol: "£", label: "Livre sterling" },
  { code: "CHF", symbol: "CHF", label: "Franc suisse" },
  { code: "CAD", symbol: "C$", label: "Dollar canadien" },
  { code: "BRL", symbol: "R$", label: "Réal brésilien" },
  { code: "MAD", symbol: "DH", label: "Dirham marocain" },
  { code: "AED", symbol: "AED", label: "Dirham des EAU" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export const DEFAULT_CURRENCY = "EUR" satisfies CurrencyCode;

export function isCurrencyCode(value: string | null | undefined): value is CurrencyCode {
  return Boolean(value && CURRENCIES.some((item) => item.code === value));
}

export function currencySymbol(code: string | null | undefined): string {
  return CURRENCIES.find((item) => item.code === code)?.symbol ?? "€";
}

const PREFIX_CURRENCIES = new Set(["USD", "GBP", "CAD", "BRL"]);

/** Le jeton de budget tel qu'écrit dans la phrase d'intention, lisible par le parseur. */
export function budgetToken(amount: string, code: CurrencyCode | string, locale: "fr" | "en" = "fr"): string {
  const symbol = currencySymbol(code);
  const normalized = amount.replace(/[^\d.,\s]/g, "").replace(/[.,\s]/g, "");
  if (!normalized) return "";
  const grouped = locale === "en"
    ? Number(normalized).toLocaleString("en-US")
    // Espace sécable fine (U+202F) remplacé par un espace simple : le parseur
    // et les comparaisons de chaînes n'y voient qu'un séparateur banal.
    : Number(normalized).toLocaleString("fr-FR").replace(/[\u202F ]/g, " ");
  return PREFIX_CURRENCIES.has(code) ? `${symbol}${grouped}` : `${grouped} ${symbol}`;
}

/** Montant « unitaire » (20 000 = vingt mille), comme le budget annoncé à l'onboarding. */
export function formatBudget(amount: number, currency?: string | null): string {
  const code = isCurrencyCode(currency) ? currency : DEFAULT_CURRENCY;
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount.toLocaleString("fr-FR")} ${currencySymbol(currency)}`;
  }
}

/** Montants en centimes (prestataires, paiements). */
export function formatCents(amountCents: number, currency?: string | null): string {
  return formatBudget(amountCents / 100, currency);
}
