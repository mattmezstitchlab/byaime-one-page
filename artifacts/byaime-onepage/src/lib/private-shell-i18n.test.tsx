import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { Router } from "wouter";

import { OrbButton, PrivateHomeLink } from "@/components/PrivateLayout";
import { I18nProvider } from "@/lib/i18n";

/*
 * Le rendu réel de la coque privée, langue par langue : c'est ce que voit le
 * visiteur qui a basculé en anglais et ouvre ensuite son espace. Sans langue
 * imposée, le français reste le repli.
 */

vi.mock("@/store/project-store", () => ({
  useProject: () => ({ currentRole: "owner", project: null }),
}));

const render = (node: ReactNode, locale: "fr" | "en") =>
  renderToStaticMarkup(
    <Router hook={() => ["/user-portal", () => {}] as const}>
      <I18nProvider initialLocale={locale}>{node}</I18nProvider>
    </Router>,
  );

describe("coque privée rendue dans les deux langues", () => {
  it("traduit le bouton orbe unique", () => {
    const fr = render(<OrbButton />, "fr");
    expect(fr).toContain('aria-label="Ouvrir le menu AIME"');

    const en = render(<OrbButton />, "en");
    expect(en).toContain('aria-label="Open the AIME menu"');
    expect(en).not.toContain("Ouvrir");
  });

  it("traduit le retour à l'accueil", () => {
    expect(render(<PrivateHomeLink />, "en")).toContain('aria-label="Back to the AIME home page"');
    expect(render(<PrivateHomeLink />, "fr")).toContain('aria-label="Retour à l’accueil AIME"');
  });


});
