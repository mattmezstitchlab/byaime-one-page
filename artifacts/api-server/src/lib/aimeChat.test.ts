import { describe, expect, it, vi } from "vitest";
import {
  answerLocally,
  buildChatContext,
  chatConfigFromEnv,
  classifyDocument,
  completeWithModel,
  type AimeChatBrief,
} from "./aimeChat";

const brief = {
  projectId: "project-1",
  role: "owner",
  generatedAt: 0,
  segments: [
    {
      id: "brief-introduction",
      kind: "transition",
      title: "Point de situation",
      narration: "Voici où en est Notre mariage, à partir des informations confirmées.",
      source: { collection: "project", id: "project-1", label: "Notre mariage" },
      supportingSources: [],
      evidenceStatus: "verified",
    },
    {
      id: "budget-1",
      kind: "fact",
      title: "Budget confirmé",
      narration: "Le budget du mariage est de 20 000 €, avec 5 000 € déjà réglés au traiteur.",
      source: { collection: "project", id: "project-1", label: "Notre mariage" },
      supportingSources: [],
      evidenceStatus: "verified",
    },
    {
      id: "guests-1",
      kind: "alert",
      title: "Réponses en attente",
      narration: "12 invités n’ont pas encore répondu à l’invitation.",
      source: { collection: "project", id: "project-1", label: "Notre mariage" },
      supportingSources: [],
      evidenceStatus: "verified",
    },
  ],
  location: { available: false },
  nearbyCategories: [],
} as unknown as AimeChatBrief;

describe("aimeChat (server brain)", () => {
  it("builds a compact context from the authorized brief", () => {
    const context = buildChatContext(brief);
    expect(context).toContain("Budget confirmé");
    expect(context).toContain("20 000 €");
    expect(context.length).toBeLessThanOrEqual(6001);
  });

  it("answers locally with the closest brief segments", () => {
    const reply = answerLocally("Où en est le budget ?", brief, "fr");
    expect(reply.mode).toBe("local");
    expect(reply.answer).toContain("Budget confirmé");
    expect(reply.answer).toContain("20 000 €");
    expect(reply.suggestions).toHaveLength(4);
    expect(reply.sources.length).toBeGreaterThan(0);
  });

  it("falls back to the situation point when nothing matches", () => {
    const reply = answerLocally("xyzzy plugh", brief, "fr");
    expect(reply.answer).toContain("Point de situation");
  });

  it("reads the model config from the environment, null without a key", () => {
    expect(chatConfigFromEnv({})).toBeNull();
    expect(chatConfigFromEnv({ AIME_CHAT_API_KEY: "sk-test" })).toMatchObject({
      apiKey: "sk-test",
      apiUrl: "https://api.openai.com/v1/chat/completions",
      model: "gpt-4o-mini",
    });
    expect(chatConfigFromEnv({
      AIME_CHAT_API_KEY: "sk-test",
      AIME_CHAT_API_URL: "https://proxy.example/v1/chat/completions",
      AIME_CHAT_MODEL: "custom",
    })).toMatchObject({ apiUrl: "https://proxy.example/v1/chat/completions", model: "custom" });
  });

  it("returns the model answer on success, null on provider failure", async () => {
    let sentBody = "";
    const ok = (async (_url: unknown, init?: { body?: unknown }) => {
      sentBody = String(init?.body ?? "");
      return new Response(JSON.stringify({
        choices: [{ message: { content: "Le budget est de 20 000 €." } }],
      }), { status: 200 });
    }) as unknown as typeof fetch;
    const reply = await completeWithModel("Budget ?", brief, "fr", {
      apiKey: "sk-test",
      apiUrl: "https://api.example/chat",
      model: "test",
    }, ok);
    expect(reply?.mode).toBe("ai");
    expect(reply?.answer).toContain("20 000 €");
    const sent = JSON.parse(sentBody) as { messages: { content: string }[] };
    expect(sent.messages[0].content).toContain("UNIQUEMENT");
    expect(sent.messages[1].content).toContain("Budget confirmé");

    const ko = vi.fn(async () => new Response("{}", { status: 500 }));
    expect(await completeWithModel("Budget ?", brief, "fr", {
      apiKey: "sk-test",
      apiUrl: "https://api.example/chat",
      model: "test",
    }, ko as unknown as typeof fetch)).toBeNull();
  });

  it("classifies documents by file name and media type", () => {
    expect(classifyDocument({ name: "Devis traiteur.pdf" })).toEqual({ folder: "budget", confident: true });
    expect(classifyDocument({ name: "Contrat salle.pdf" })).toEqual({ folder: "contracts", confident: true });
    expect(classifyDocument({ name: "Déroulé Jour J.xlsx" })).toEqual({ folder: "program", confident: true });
    expect(classifyDocument({ name: "photo-groupe.jpg", mimeType: "image/jpeg" })).toEqual({ folder: "memories", confident: true });
    expect(classifyDocument({ name: "clip.mp4", mimeType: "video/mp4" })).toEqual({ folder: "memories", confident: true });
    expect(classifyDocument({ name: "note-sans-indice.txt", mimeType: "text/plain" })).toEqual({ folder: "contracts", confident: false });
  });
});
