import { buildAuthorizedWeddingBrief } from "./weddingBrief";

/*
 * Le cerveau serveur de l'assistant AIME : chaque réponse est ancrée sur le
 * brief autorisé du mariage (les informations confirmées que le rôle peut
 * consulter — jamais plus). Deux régimes, jamais de bluff :
 * - `ai` : un modèle de langage compatible OpenAI (`AIME_CHAT_*`) rédige la
 *   réponse à partir du contexte, avec interdiction de sortir des sources ;
 * - `local` : sans clé configurée ou si le fournisseur échoue, un appariement
 *   par mots-clés renvoie les segments du brief qui parlent de la question.
 */

export type AimeChatBrief = ReturnType<typeof buildAuthorizedWeddingBrief>;

export type AimeChatSource = { label: string; detail?: string };

export type AimeChatReply = {
  answer: string;
  sources: AimeChatSource[];
  suggestions: string[];
  mode: "ai" | "local";
};

export type WeddingFolderId =
  | "guests"
  | "budget"
  | "contracts"
  | "providers"
  | "program"
  | "memories"
  | "messages";

const MAX_CONTEXT_CHARS = 6000;
const MAX_MESSAGE_CHARS = 2000;

const SUGGESTIONS: Record<"fr" | "en", string[]> = {
  fr: [
    "Où en est le budget ?",
    "Qui n’a pas répondu ?",
    "Que dois-je faire ensuite ?",
    "Quels prestataires restent à trouver ?",
  ],
  en: [
    "How is the budget doing?",
    "Who hasn’t replied?",
    "What should I do next?",
    "Which vendors are still missing?",
  ],
};

const STOP_WORDS = new Set(
  "le|la|les|de|des|du|un|une|et|est|où|ou|qui|que|quoi|comment|combien|dans|mon|ma|mes|notre|nos|votre|vos|the|a|an|of|in|on|is|are|my|our|your|how|what|who|to".split("|"),
);

const tokenize = (value: string): string[] =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));

/** Contexte compact envoyé au modèle : titre + narration de chaque segment. */
export function buildChatContext(brief: AimeChatBrief): string {
  const lines = brief.segments.map(segment => `- ${segment.title} : ${segment.narration}`);
  const joined = lines.join("\n");
  return joined.length > MAX_CONTEXT_CHARS ? `${joined.slice(0, MAX_CONTEXT_CHARS)}…` : joined;
}

function scoreSegment(messageWords: string[], segment: AimeChatBrief["segments"][number]): number {
  const haystack = `${segment.title} ${segment.narration}`.toLowerCase();
  let score = 0;
  for (const word of messageWords) {
    if (haystack.includes(word)) score += word.length >= 6 ? 2 : 1;
  }
  // Le bonus d'alerte ne fait que départager : sans aucun mot trouvé, le
  // segment ne colle pas et le point de situation répond à la place.
  if (score === 0) return 0;
  if (segment.kind === "alert") score += 1;
  return score;
}

/**
 * Réponse locale : les trois segments du brief les plus proches de la
 * question, sans invention. Si rien ne colle, le premier segment (le point de
 * situation) répond à la place d'un silence.
 */
export function answerLocally(message: string, brief: AimeChatBrief, locale: "fr" | "en" = "fr"): AimeChatReply {
  const words = tokenize(message.slice(0, MAX_MESSAGE_CHARS));
  const ranked = [...brief.segments]
    .map(segment => ({ segment, score: words.length ? scoreSegment(words, segment) : 0 }))
    .sort((a, b) => b.score - a.score);
  const picked = ranked.filter(entry => entry.score > 0).slice(0, 3).map(entry => entry.segment);
  const fallback = brief.segments[0];
  const kept = picked.length > 0 ? picked : fallback ? [fallback] : [];
  const intro = locale === "en"
    ? "Here is what your World confirms on this subject:"
    : "Voici ce que votre Monde confirme à ce sujet :";
  return {
    answer: kept.length
      ? `${intro}\n\n${kept.map(segment => `**${segment.title}**\n${segment.narration}`).join("\n\n")}`
      : (locale === "en" ? "Your World has nothing confirmed on this yet." : "Votre Monde ne confirme encore rien à ce sujet."),
    sources: kept.slice(0, 4).map(segment => ({
      label: segment.source.label,
      detail: segment.title,
    })),
    suggestions: SUGGESTIONS[locale],
    mode: "local",
  };
}

type ChatConfig = { apiKey: string; apiUrl: string; model: string };

export function chatConfigFromEnv(env: NodeJS.ProcessEnv = process.env): ChatConfig | null {
  const apiKey = env.AIME_CHAT_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    apiUrl: env.AIME_CHAT_API_URL?.trim() || "https://api.openai.com/v1/chat/completions",
    model: env.AIME_CHAT_MODEL?.trim() || "gpt-4o-mini",
  };
}

function systemPrompt(locale: "fr" | "en"): string {
  return locale === "en"
    ? "You are AIME, the wedding assistant. Answer ONLY from the confirmed context below, in English, briefly. If the context says nothing about the question, say so and suggest what to fill in the World. Never invent names, amounts or dates."
    : "Tu es AIME, l'assistant du mariage. Réponds UNIQUEMENT à partir du contexte confirmé ci-dessous, en français, brièvement. Si le contexte ne dit rien sur la question, dis-le et suggère quoi renseigner dans le Monde. N'invente jamais ni nom, ni montant, ni date.";
}

/**
 * Appel au modèle (format OpenAI `/chat/completions`, donc compatible avec
 * tout fournisseur OpenAI-compatible). `null` = repli local à utiliser.
 */
export async function completeWithModel(
  message: string,
  brief: AimeChatBrief,
  locale: "fr" | "en",
  config: ChatConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<AimeChatReply | null> {
  try {
    const response = await fetchImpl(config.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.2,
        max_tokens: 600,
        messages: [
          { role: "system", content: systemPrompt(locale) },
          { role: "user", content: `Contexte confirmé :\n${buildChatContext(brief)}\n\nQuestion : ${message.slice(0, MAX_MESSAGE_CHARS)}` },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return null;
    const body = (await response.json().catch(() => null)) as {
      choices?: { message?: { content?: string } }[];
    } | null;
    const content = body?.choices?.[0]?.message?.content?.trim();
    if (!content) return null;
    return {
      answer: content,
      sources: brief.segments.slice(0, 3).map(segment => ({ label: segment.source.label, detail: segment.title })),
      suggestions: SUGGESTIONS[locale],
      mode: "ai",
    };
  } catch {
    return null;
  }
}

/*
 * Classifieur de documents : le nom du fichier (et son type MIME pour les
 * photos/vidéos) désigne le dossier universel. Miroir serveur de
 * `guessFolderLocally` côté client — le serveur tranche dès qu'il est là.
 */
const FOLDER_KEYWORDS: ReadonlyArray<{ folder: WeddingFolderId; test: RegExp }> = [
  { folder: "contracts", test: /(contrat|contract|devis.?sign|convention|cgv)/i },
  { folder: "budget", test: /(devis|quote|facture|invoice|avoir|budget|tarif|prix|acompte|paiement|payment|rib)/i },
  { folder: "program", test: /(déroulé|deroule|planning|programme|timeline|horaire|régie|regie|plan de salle|plan-de-salle|floor ?plan|timing|run ?of ?show)/i },
  { folder: "guests", test: /(invit|guest|rsvp|réponse|reponse|plan de table|table|menu enfants|allerg|regime|régime)/i },
  { folder: "memories", test: /(photo|video|vidéo|album|shooting|shot|galerie|gallery|média|media)/i },
  { folder: "messages", test: /(invitation|faire-part|fairepart|remerciement|discours|voeux|vœux|message|lettre)/i },
  { folder: "providers", test: /(prestataire|traiteur|fleuriste|photographe|dj|musique|lieu|salle|chateau|château|décor|decor)/i },
];

const IMAGE_OR_VIDEO = /\.(jpe?g|png|webp|heic|heif|gif|bmp|mp4|mov|webm|m4v)$/i;

export function classifyDocument(input: { name: string; mimeType?: string }): { folder: WeddingFolderId; confident: boolean } {
  const name = input.name.trim();
  const keyword = FOLDER_KEYWORDS.find(entry => entry.test.test(name));
  if (keyword) return { folder: keyword.folder, confident: true };
  if (IMAGE_OR_VIDEO.test(name) || /^(image|video)\//.test(input.mimeType ?? "")) {
    return { folder: "memories", confident: true };
  }
  return { folder: "contracts", confident: false };
}
