import { answerAime } from "./aime-guidance";
import { translate, type I18nKey, type Locale } from "./i18n-dictionary";
import type { WorldProject } from "./types";
import type { WeddingFolderId } from "./wedding-folders";

/*
 * Le client de l'assistant AIME, le « JUMO du mariage » : poser une question,
 * partager un document, explorer ses dossiers. Quand le Monde est synchronisé
 * avec le serveur, la question part vers `/api/.../aime/chat` (réponse ancrée
 * sur le brief autorisé du mariage) ; sinon — hors-ligne, aperçu local, Monde
 * pas encore enregistré — le guidage local `answerAime` répond. On ne fait
 * jamais semblant : le mode de chaque réponse est exposé (`ai` ou `local`).
 */

export type AssistantSource = { label: string; detail?: string };

export type AssistantReply = {
  answer: string;
  sources: AssistantSource[];
  suggestions: string[];
  mode: "ai" | "local";
};

const SUGGESTION_KEYS: ReadonlyArray<I18nKey> = [
  "assistant.chat.suggest.budget",
  "assistant.chat.suggest.rsvp",
  "assistant.chat.suggest.next",
  "assistant.chat.suggest.providers",
];

export function assistantSuggestions(locale: Locale = "fr"): string[] {
  return SUGGESTION_KEYS.map(key => translate(locale, key));
}

export function answerLocally(
  message: string,
  options: { project: WorldProject | null; role?: string; locale?: Locale },
): AssistantReply {
  const locale = options.locale ?? "fr";
  const answer = answerAime(message, { project: options.project, role: options.role });
  const blocks = [answer.title, ...answer.paragraphs];
  if (answer.steps.length > 0) blocks.push(answer.steps.map(step => `• ${step}`).join("\n"));
  return {
    answer: blocks.filter(Boolean).join("\n\n"),
    sources: answer.matches.slice(0, 3).map(match => ({
      label: match.screen.label,
      detail: match.screen.purpose,
    })),
    suggestions: assistantSuggestions(locale),
    mode: "local",
  };
}

function normalizeReply(body: unknown, locale: Locale): AssistantReply | null {
  if (!body || typeof body !== "object") return null;
  const candidate = body as Partial<AssistantReply>;
  if (typeof candidate.answer !== "string" || !candidate.answer.trim()) return null;
  return {
    answer: candidate.answer,
    sources: Array.isArray(candidate.sources)
      ? candidate.sources
          .filter((source): source is AssistantSource => !!source && typeof source === "object" && typeof (source as AssistantSource).label === "string")
          .slice(0, 4)
      : [],
    suggestions: Array.isArray(candidate.suggestions)
      ? candidate.suggestions.filter((item): item is string => typeof item === "string").slice(0, 4)
      : assistantSuggestions(locale),
    mode: candidate.mode === "ai" ? "ai" : "local",
  };
}

export async function askAssistant(options: {
  project: WorldProject | null;
  message: string;
  locale?: Locale;
  role?: string;
  signal?: AbortSignal;
}): Promise<AssistantReply> {
  const locale = options.locale ?? "fr";
  const message = options.message.trim();
  if (options.project && message) {
    try {
      const response = await fetch(`/api/projects/${options.project.id}/aime/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, locale }),
        signal: options.signal,
      });
      if (response.ok) {
        const reply = normalizeReply(await response.json().catch(() => null), locale);
        if (reply) return reply;
      }
    } catch {
      // Repli local ci-dessous : une question ne reste jamais sans réponse.
    }
  }
  return answerLocally(message, { project: options.project, role: options.role, locale });
}

/*
 * Devinette locale du dossier d'un fichier, miroir volontairement réduit du
 * classifieur serveur (`aimeChat.ts`) : les deux tables se lisent de la même
 * façon, et le serveur tranche dès qu'il est joignable.
 */
const FOLDER_KEYWORDS: ReadonlyArray<{ folder: WeddingFolderId; test: RegExp }> = [
  { folder: "contracts", test: /(contrat|contract|devis.?sign|convention|cgv)/i },
  { folder: "budget", test: /(devis|quote|facture|invoice|avoir|budget|tarif|prix|acompte|paiement|payment|rib)/i },
  { folder: "program", test: /(déroulé|deroule|planning|programme|timeline|horaire|régie|regie|plan de salle|plan-de-salle|floor ?plan|timing|run ?of ?show)/i },
  { folder: "guests", test: /(invit|guest|rsvp|réponse|reponse|plan de table|table|menu enfants|allerg|regime|régime)/i },
  { folder: "memories", test: /(photo|video|vidéo|album|shooting|shot|galerie|gallery|média|media|\.(jpe?g|png|webp|heic|mp4|mov)$)/i },
  { folder: "messages", test: /(invitation|faire-part|fairepart|remerciement|discours|voeux|vœux|message|lettre)/i },
  { folder: "providers", test: /(prestataire|traiteur|fleuriste|photographe|dj|musique|lieu|salle|chateau|château|décor|decor)/i },
];

export function guessFolderLocally(fileName: string): WeddingFolderId {
  const normalized = fileName.trim().toLowerCase();
  return FOLDER_KEYWORDS.find(entry => entry.test.test(normalized))?.folder ?? "contracts";
}

export async function classifyDocument(options: {
  project: WorldProject | null;
  name: string;
  mimeType?: string;
}): Promise<{ folder: WeddingFolderId; mode: "ai" | "local" }> {
  if (options.project) {
    try {
      const response = await fetch(`/api/projects/${options.project.id}/aime/documents/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: options.name, mimeType: options.mimeType ?? "" }),
      });
      if (response.ok) {
        const body = (await response.json().catch(() => null)) as { folder?: unknown } | null;
        if (body && typeof body.folder === "string") {
          const folder = body.folder as WeddingFolderId;
          if (["guests", "budget", "contracts", "providers", "program", "memories", "messages"].includes(folder)) {
            return { folder, mode: "ai" };
          }
        }
      }
    } catch {
      // Devinette locale ci-dessous.
    }
  }
  return { folder: guessFolderLocally(options.name), mode: "local" };
}
