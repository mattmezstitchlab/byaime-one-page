import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Router } from "wouter";
import type { ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n";
import { AssistantPage } from "./Assistant";
import { FoldersPage } from "./Folders";
import { AdminSommairePage } from "./AdminSommaire";

/*
 * Phase 2 (17/09) : /assistant, /dossiers et /admin ne sont plus des écrans
 * à part — ce sont des liens profonds qui ouvrent le Panneau AIME sur la
 * bonne section. Le chat, le document et les sept dossiers vivent dans le
 * panneau ; ces pages gardent leur promesse en une phrase et un bouton.
 */
const renderable = (value: string) => value.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");

const render = (node: ReactNode, path = "/assistant") =>
  renderToStaticMarkup(
    <Router hook={() => [path, () => {}] as const}>
      <I18nProvider>{node}</I18nProvider>
    </Router>,
  );

describe("/assistant — lien profond vers la section « Poser une question »", () => {
  it("garde sa promesse en une phrase, avec un bouton qui ouvre le panneau", () => {
    const markup = render(<AssistantPage />);

    expect(markup).toContain('data-testid="assistant-page"');
    expect(markup.match(/<h1/g)).toHaveLength(1);
    expect(markup).toContain(renderable("Ouvrir le panneau AIME"));
    expect(markup).toContain('data-testid="assistant-open-panel"');
  });

  it("ne redouble plus ni le chat ni le partage : ils vivent dans le panneau", () => {
    const markup = render(<AssistantPage />);

    expect(markup).not.toContain('data-testid="assistant-chat"');
    expect(markup).not.toContain('data-testid="document-share"');
    expect(markup).not.toContain('href="/dossiers"');
  });
});

describe("/dossiers — lien profond vers la section « Le Monde »", () => {
  it("garde sa promesse en une phrase, avec un bouton qui ouvre le panneau", () => {
    const markup = render(<FoldersPage />, "/dossiers");

    expect(markup).toContain('data-testid="folders-page"');
    expect(markup.match(/<h1/g)).toHaveLength(1);
    expect(markup).toContain(renderable("Tout votre mariage, rangé au même endroit."));
    expect(markup).toContain(renderable("Ouvrir le panneau AIME"));
    expect(markup).toContain('data-testid="folders-open-panel"');
  });

  it("ne redouble plus la grille de dossiers : elle vit dans la colonne", () => {
    const markup = render(<FoldersPage />, "/dossiers");

    expect(markup).not.toContain('data-testid="wedding-folders"');
  });
});

describe("/admin — lien profond vers le panneau", () => {
  it("le guide garde son titre et ouvre le panneau", () => {
    const markup = render(<AdminSommairePage />, "/admin");

    expect(markup).toContain('data-testid="admin-page"');
    expect(markup).toContain("Le guide");
    expect(markup).toContain(renderable("Ouvrir le panneau AIME"));
    expect(markup).toContain('data-testid="admin-open-panel"');
  });
});
