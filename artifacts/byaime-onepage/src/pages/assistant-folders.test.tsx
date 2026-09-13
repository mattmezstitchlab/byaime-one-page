import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, type Mock } from "vitest";
import { Router } from "wouter";
import type { ReactNode } from "react";

vi.mock("@/store/project-store", () => ({ useProject: vi.fn() }));

import { useProject } from "@/store/project-store";
import { I18nProvider } from "@/lib/i18n";
import type { WorldProject } from "@/lib/types";
import { WEDDING_FOLDER_IDS } from "@/lib/wedding-folders";
import { AssistantPage } from "./Assistant";
import { FoldersPage } from "./Folders";

const mockUseProject = useProject as unknown as Mock;

const project = {
  id: "project-1",
  city: { value: "Lille", confidence: "confirme" },
  providers: [{ id: "p1", role: "Photographe", status: "recherche" }],
  guests: [],
  payments: [],
  documents: [],
  timeline: [],
  memories: [],
  media: [],
  communications: [],
  messageLogs: [],
  messages: [],
} as unknown as WorldProject;

const store = (overrides: Record<string, unknown> = {}) => ({
  project: null,
  currentRole: "owner",
  canEdit: true,
  addEntity: vi.fn(),
  ...overrides,
});

/* Le rendu statique de React échappe « & » et l'apostrophe : on compare la forme rendue. */
const renderable = (value: string) => value.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");

const render = (node: ReactNode, path = "/assistant") =>
  renderToStaticMarkup(
    <Router hook={() => [path, () => {}] as const}>
      <I18nProvider>{node}</I18nProvider>
    </Router>,
  );

describe("AssistantPage (le JUMO du mariage)", () => {
  it("tient sa promesse en une phrase, puis trois sections numérotées", () => {
    mockUseProject.mockReturnValue(store({ project }));
    const markup = render(<AssistantPage />);

    expect(markup).toContain('data-testid="assistant-page"');
    expect(markup.match(/<h1/g)).toHaveLength(1);
    expect(markup).toContain("AIME · Assistant");
    expect(markup).toContain(renderable("Posez une question, partagez un document, explorez vos dossiers."));
    for (const section of ["assistant-ask", "assistant-doc", "assistant-folders"]) {
      expect(markup).toContain(`data-testid="${section}"`);
    }
    expect(markup).toContain("01 · Poser une question");
    expect(markup).toContain("02 · Partager un document");
    expect(markup).toContain("03 · Explorer vos dossiers");
  });

  it("ouvre le chat avec ses suggestions et le partage de documents", () => {
    mockUseProject.mockReturnValue(store({ project }));
    const markup = render(<AssistantPage />);

    expect(markup).toContain('data-testid="assistant-chat"');
    expect(markup).toContain('data-testid="assistant-chat-input"');
    expect(markup).toContain('data-testid="assistant-chat-send"');
    expect(markup).toContain('data-testid="assistant-suggest-0"');
    expect(markup).toContain('data-testid="document-share"');
    expect(markup).toContain('data-testid="document-share-choose"');
    expect(markup).toContain('data-testid="wedding-folders"');
    expect(markup).toContain('href="/dossiers"');
  });

  it("invite à créer un Monde quand il n’y en a pas, sans cacher l’assistant", () => {
    mockUseProject.mockReturnValue(store({ project: null }));
    const markup = render(<AssistantPage />);

    expect(markup).toContain('data-testid="assistant-empty"');
    expect(markup).toContain('data-testid="assistant-empty-cta"');
    expect(markup).toContain('href="/user-portal"');
    // Le chat local reste utilisable : une question ne reste jamais sans réponse.
    expect(markup).toContain('data-testid="assistant-chat"');
  });

  it("pré-remplit la passerelle dispoo avec le poste manquant et la ville", () => {
    mockUseProject.mockReturnValue(store({ project }));
    const markup = render(<AssistantPage />);

    expect(markup).toContain('data-testid="dispoo-banner-providers"');
    expect(markup).toContain("dispoo.app/recherche");
    expect(markup).toContain("q=Photographe");
    expect(markup).toContain("ville=Lille");
    expect(markup).toContain("utm_source=byaime");
  });
});

describe("FoldersPage (le miroir du BURO)", () => {
  it("range le mariage en sept dossiers, chacun ouvert sur son panneau", () => {
    mockUseProject.mockReturnValue(store({ project }));
    const markup = render(<FoldersPage />, "/dossiers");

    expect(markup).toContain('data-testid="folders-page"');
    expect(markup.match(/<h1/g)).toHaveLength(1);
    expect(markup).toContain(renderable("Tout votre mariage, rangé au même endroit."));
    for (const id of WEDDING_FOLDER_IDS) {
      expect(markup).toContain(`data-testid="wedding-folder-${id}"`);
      expect(markup).toContain(`data-testid="wedding-folder-${id}-open"`);
    }
  });

  it("verrouille le budget et les contrats pour les rôles non autorisés", () => {
    mockUseProject.mockReturnValue(store({ project, currentRole: "viewer", canEdit: false }));
    const markup = render(<FoldersPage />, "/dossiers");

    // Les mêmes dossiers pour tout le monde : affichés, mais non cliquables.
    for (const id of WEDDING_FOLDER_IDS) {
      expect(markup).toContain(`data-testid="wedding-folder-${id}"`);
    }
    expect(markup).toContain(renderable("Réservé aux responsables du Monde"));
    expect(markup).not.toContain('data-testid="wedding-folder-budget-open"');
    expect(markup).not.toContain('data-testid="wedding-folder-contracts-open"');
    expect(markup).toContain('data-testid="wedding-folder-guests-open"');
  });

  it("ramène vers le Monde, l’assistant et le compositeur dispoo", () => {
    mockUseProject.mockReturnValue(store({ project }));
    const markup = render(<FoldersPage />, "/dossiers");

    expect(markup).toContain('data-testid="folders-back-world"');
    expect(markup).toContain('data-testid="folders-back-assistant"');
    expect(markup).toContain('href="/assistant"');
    expect(markup).toContain('data-testid="dispoo-banner-composer"');
    expect(markup).toContain("dispoo.app/composer");
  });
});
