import { useEffect, useRef, useState } from "react";
import { ArrowUp, BookOpen, LoaderCircle } from "lucide-react";
import { useProject } from "@/store/project-store";
import { useI18n } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics";
import {
  askAssistant,
  assistantSuggestions,
  type AssistantReply,
} from "@/lib/assistant";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  from: "user" | "aime";
  text: string;
  sources: AssistantReply["sources"];
  mode: AssistantReply["mode"];
};

let messageSeq = 0;
const nextId = () => `assistant-message-${Date.now()}-${(messageSeq += 1)}`;

/**
 * La conversation avec AIME : une question, une réponse ancrée sur le Monde,
 * ses sources, son régime (connecté ou local — jamais masqué). Sans Monde
 * synchronisé, le guidage local répond quand même : une question ne reste
 * jamais sans réponse, mais on ne fait pas semblant d'être connecté.
 */
export function AssistantChat() {
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
      setMessages(previous => [...previous, { id: nextId(), from: "aime", text: reply.answer, sources: reply.sources, mode: reply.mode }]);
      trackEvent("assistant_question_asked", { mode: reply.mode, hasProject: !!project, viaSuggestion });
    } catch {
      setError(t("assistant.chat.error"));
    } finally {
      setPending(false);
    }
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
