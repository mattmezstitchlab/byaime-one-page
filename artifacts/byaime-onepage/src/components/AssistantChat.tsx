import { useEffect, useRef, useState } from "react";
import { ArrowUp, BookOpen, LoaderCircle, Sparkles } from "lucide-react";
import { useProject } from "@/store/project-store";
import { useI18n } from "@/lib/i18n";
import { parseIntention } from "@/lib/parser";
import { trackEvent } from "@/lib/analytics";
import {
  askAssistant,
  assistantSuggestions,
  type AssistantReply,
} from "@/lib/assistant";
import { cn } from "@/lib/utils";
import type { WorldProject } from "@/lib/types";

type ChatMessage = {
  id: string;
  from: "user" | "aime";
  text: string;
  sources: AssistantReply["sources"];
  mode: AssistantReply["mode"];
  /** Faits reconnus dans la phrase de l'utilisateur, en attente de confirmation. */
  projectUpdates?: Partial<WorldProject>;
  applied?: boolean;
};

function projectUpdatesFromMessage(message: string): Partial<WorldProject> | undefined {
  const parsed = parseIntention(message);
  const updates: Partial<WorldProject> = {};
  const hasWeddingSignal = /(mariage|marier|épouser|wedding|marry|married)/i.test(message);

  if (hasWeddingSignal && parsed.title && parsed.universe) {
    updates.title = parsed.title;
    updates.universe = parsed.universe;
  }
  if (parsed.pivot && parsed.pivot.confidence !== "deduit") updates.pivot = parsed.pivot;
  if (parsed.city?.value) updates.city = parsed.city;
  if (parsed.guestsCount?.value !== null && parsed.guestsCount?.value !== undefined) {
    updates.guestsCount = parsed.guestsCount;
  }
  if (parsed.budget?.value !== null && parsed.budget?.value !== undefined) {
    updates.budget = parsed.budget;
    if (parsed.currency) updates.currency = parsed.currency;
  }

  return Object.keys(updates).length ? updates : undefined;
}

type ProjectPreviewRow = { label: string; value: string };

function projectPreviewRows(updates: Partial<WorldProject>, locale: string): ProjectPreviewRow[] {
  const isEnglish = locale === "en";
  const rows: ProjectPreviewRow[] = [];
  if (updates.title) rows.push({ label: isEnglish ? "Title" : "Titre", value: updates.title });
  if (updates.universe) rows.push({ label: isEnglish ? "Space" : "Espace", value: updates.universe });
  if (updates.pivot) {
    rows.push({
      label: isEnglish ? "Date" : "Date",
      value: new Intl.DateTimeFormat(isEnglish ? "en-US" : "fr-FR", { dateStyle: "long" }).format(updates.pivot.value),
    });
  }
  if (updates.city?.value) rows.push({ label: isEnglish ? "Place" : "Lieu", value: updates.city.value });
  if (updates.guestsCount?.value !== null && updates.guestsCount?.value !== undefined) {
    rows.push({
      label: isEnglish ? "Guests" : "Invités",
      value: `${updates.guestsCount.value} ${isEnglish ? "guests" : "invités"}`,
    });
  }
  if (updates.budget?.value !== null && updates.budget?.value !== undefined) {
    rows.push({
      label: isEnglish ? "Budget" : "Budget",
      value: new Intl.NumberFormat(isEnglish ? "en-US" : "fr-FR", {
        style: "currency",
        currency: updates.currency ?? "EUR",
        maximumFractionDigits: 0,
      }).format(updates.budget.value),
    });
  }
  return rows;
}

let messageSeq = 0;
const nextId = () => `assistant-message-${Date.now()}-${(messageSeq += 1)}`;

/**
 * La conversation avec AIME : une question, une réponse ancrée sur le Monde,
 * ses sources, son régime (connecté ou local — jamais masqué). Sans Monde
 * synchronisé, le guidage local répond quand même : une question ne reste
 * jamais sans réponse, mais on ne fait pas semblant d'être connecté.
 */
export function AssistantChat({
  onApplyProject,
}: {
  /** Écriture explicite après confirmation : l'agent ne modifie jamais le Monde en silence. */
  onApplyProject?: (updates: Partial<WorldProject>) => void;
} = {}) {
  const { project, currentRole } = useProject();
  const { t, locale } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const suggestions = assistantSuggestions(locale);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
  }, [messages.length, pending]);

  const send = async (raw: string, viaSuggestion = false) => {
    const message = raw.trim();
    if (!message || pending) return;
    setError("");
    setInput("");
    setPending(true);
    setMessages(previous => [...previous, { id: nextId(), from: "user", text: message, sources: [], mode: "local" }]);
    try {
      const reply = await askAssistant({ project, message, locale, role: currentRole });
      setMessages(previous => [
        ...previous,
        {
          id: nextId(),
          from: "aime",
          text: reply.answer,
          sources: reply.sources,
          mode: reply.mode,
          projectUpdates: project && onApplyProject ? projectUpdatesFromMessage(message) : undefined,
        },
      ]);
      trackEvent("assistant_question_asked", { mode: reply.mode, hasProject: !!project, viaSuggestion });
    } catch {
      setError(t("assistant.chat.error"));
    } finally {
      setPending(false);
    }
  };

  const applyProjectUpdates = (messageId: string, updates: Partial<WorldProject>) => {
    if (!onApplyProject) return;
    onApplyProject(updates);
    setMessages(previous => previous.map(message =>
      message.id === messageId ? { ...message, applied: true } : message,
    ));
    trackEvent("assistant_project_prefill_applied", { fields: Object.keys(updates).join(",") });
  };

  return (
    <div data-testid="assistant-chat" className="overflow-hidden rounded-[2rem] border border-border bg-card">
      <div
        role="log"
        aria-live="polite"
        aria-label={t("assistant.ask.title")}
        className="max-h-[60vh] space-y-5 overflow-y-auto p-6 md:p-8"
      >
        {messages.length === 0 && !pending && (
          <div className="text-center">
            <p className="text-sm font-light text-foreground/55">{t("assistant.chat.empty")}</p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  type="button"
                  data-testid={`assistant-suggest-${index}`}
                  onClick={() => send(suggestion, true)}
                  className="rounded-full border border-border px-4 py-2 text-xs text-foreground/75 transition hover:border-foreground/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map(message => (
          <div key={message.id} className={cn("flex", message.from === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-3xl px-5 py-4",
                message.from === "user"
                  ? "rounded-br-lg bg-foreground text-background"
                  : "rounded-bl-lg border border-border bg-foreground/[0.03] text-foreground",
              )}
            >
              {message.from === "aime" && (
                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-foreground/50">
                  <span
                    aria-hidden
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      message.mode === "ai" ? "bg-brand-accent" : "bg-foreground/40",
                    )}
                  />
                  {t(message.mode === "ai" ? "assistant.chat.mode.ai" : "assistant.chat.mode.local")}
                </p>
              )}
              <RichText text={message.text} />
              {message.from === "aime" && message.sources.length > 0 && (
                <div className="mt-3 border-t border-border/60 pt-3">
                  <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-foreground/45">
                    <BookOpen aria-hidden className="h-3 w-3" />
                    {t("assistant.chat.sources")}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {message.sources.map(source => (
                      <li key={`${source.label}-${source.detail}`} className="text-xs text-foreground/60">
                        <span className="font-medium text-foreground/80">{source.label}</span>
                        {source.detail && <span> — {source.detail}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {message.from === "aime" && message.projectUpdates && onApplyProject && (
                <div className="mt-4 rounded-2xl border border-brand-accent/25 bg-brand-accent/5 p-3">
                  <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-foreground/55">
                    <Sparkles aria-hidden className="h-3 w-3" />
                    {t("assistant.chat.fillProposal")}
                  </p>
                  <ul
                    data-testid={`assistant-preview-${message.id}`}
                    className="mt-3 space-y-1.5 border-t border-brand-accent/15 pt-3"
                  >
                    {projectPreviewRows(message.projectUpdates, locale).map(row => (
                      <li key={row.label} className="flex items-baseline justify-between gap-4 text-xs">
                        <span className="text-foreground/50">{row.label}</span>
                        <span className="text-right font-medium text-foreground/80">{row.value}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs leading-relaxed text-foreground/60">
                    {t("assistant.chat.fillHint")}
                  </p>
                  <button
                    type="button"
                    data-testid={`assistant-fill-${message.id}`}
                    disabled={message.applied}
                    onClick={() => applyProjectUpdates(message.id, message.projectUpdates!)}
                    className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-foreground px-4 text-xs font-semibold text-background transition hover:bg-foreground/90 disabled:cursor-default disabled:opacity-50"
                  >
                    <Sparkles aria-hidden className="h-3.5 w-3.5" />
                    {message.applied ? t("assistant.chat.filled") : t("assistant.chat.fill")}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {pending && (
          <p className="flex items-center gap-2 text-sm font-light text-foreground/55" role="status">
            <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />
            {t("assistant.chat.thinking")}
          </p>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-border p-4 md:p-5">
        <form
          onSubmit={event => {
            event.preventDefault();
            void send(input);
          }}
          className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 focus-within:border-foreground/40"
        >
          <label htmlFor="assistant-chat-input" className="sr-only">
            {t("assistant.ask.title")}
          </label>
          <input
            id="assistant-chat-input"
            data-testid="assistant-chat-input"
            value={input}
            onChange={event => setInput(event.target.value)}
            placeholder={t("assistant.chat.placeholder")}
            autoComplete="off"
            disabled={pending}
            className="w-full bg-transparent py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-foreground/40 disabled:opacity-60"
          />
          <button
            type="submit"
            data-testid="assistant-chat-send"
            disabled={pending || !input.trim()}
            aria-label={t("assistant.chat.send")}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foreground text-background transition hover:bg-foreground/90 disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowUp aria-hidden className="h-4 w-4" />
          </button>
        </form>
        {error && (
          <p role="alert" className="mt-2 px-2 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

/** Rendu sûr du texte des réponses : gras **…**, puces et paragraphes, sans HTML. */
function RichText({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-sm font-light leading-relaxed">
      {text.split("\n\n").map((block, blockIndex) => {
        const lines = block.split("\n");
        const bullets = lines.filter(line => line.startsWith("• ") || line.startsWith("- "));
        if (bullets.length > 0 && bullets.length === lines.length) {
          return (
            <ul key={blockIndex} className="space-y-1">
              {bullets.map((line, lineIndex) => (
                <li key={lineIndex} className="flex gap-2">
                  <span aria-hidden className="text-foreground/50">•</span>
                  <span><Inline text={line.replace(/^[•-] /, "")} /></span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={blockIndex}>
            {lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {lineIndex > 0 && <br />}
                <Inline text={line} />
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith("**") && part.endsWith("**")
          ? <strong key={index} className="font-semibold">{part.slice(2, -2)}</strong>
          : <span key={index}>{part}</span>,
      )}
    </>
  );
}
