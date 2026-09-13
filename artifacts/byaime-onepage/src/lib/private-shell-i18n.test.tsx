import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { Router } from "wouter";

import { OrbButton, PrivateHomeLink } from "@/components/PrivateLayout";
import { PhaseTimeCapsule } from "@/components/PhaseTimeCapsule";
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
    expect(fr).toContain('aria-label="Ouvrir le panneau AIME"');

    const en = render(<OrbButton />, "en");
    expect(en).toContain('aria-label="Open the AIME panel"');
    expect(en).not.toContain("Ouvrir");
  });

  it("traduit la capsule temporelle sans changer ses périodes", () => {
    const fr = render(<PhaseTimeCapsule phase="avant" onPhaseChange={vi.fn()} />, "fr");
    expect(fr).toContain("Avant");
    expect(fr).toContain("Le Jour J");
    expect(fr).toContain('aria-label="Contrôles temporels du Monde"');

    const en = render(<PhaseTimeCapsule phase="avant" onPhaseChange={vi.fn()} />, "en");
    expect(en).toContain("Before");
    expect(en).toContain("The big day");
    expect(en).toContain("After");
    expect(en).toContain('aria-label="World time controls"');
    // La période précédente n'existe pas depuis « Avant » : le message est traduit lui aussi.
    expect(en).toContain('aria-label="No earlier period"');
    expect(en).not.toContain("Le Jour J");
  });

  it("traduit le retour à l'accueil", () => {
    expect(render(<PrivateHomeLink />, "en")).toContain('aria-label="Back to the AIME home page"');
    expect(render(<PrivateHomeLink />, "fr")).toContain('aria-label="Retour à l’accueil AIME"');
  });

  it("reste en français quand aucune langue n'a été choisie", () => {
    const markup = renderToStaticMarkup(
      <Router hook={() => ["/user-portal", () => {}] as const}>
        <I18nProvider>
          <PhaseTimeCapsule phase="pendant" onPhaseChange={vi.fn()} />
        </I18nProvider>
      </Router>,
    );
    expect(markup).toContain("Le Jour J");
  });
});
