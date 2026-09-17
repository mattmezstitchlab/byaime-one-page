import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { useRouteMeta } from "@/lib/page-meta";

/*
 * /assistant — deep-link vers la section « Poser une question » du Panneau
 * AIME (phase 2, 17/09). Le chat et le partage de document vivent dans le
 * panneau ; la route reste pour les liens existants (assistant AIME,
 * architecture, favoris) : elle ouvre le panneau sur la bonne section.
 */
export function AssistantPage() {
  const { t, locale } = useI18n();

  useRouteMeta({
    title: locale === "en" ? "AIME · Assistant" : "AIME · Assistant",
    description: t("assistant.hero.subtitle"),
  });

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("aime:open-ai", { detail: { item: "ask" } }));
  }, []);

  return (
    <main data-testid="assistant-page" className="grid min-h-[70vh] place-items-center bg-background px-6 text-foreground">
      <div className="max-w-md text-center">
        <p className="aime-apple-eyebrow">{t("assistant.hero.eyebrow")}</p>
        <h1 className="aime-apple-title mt-4 text-3xl md:text-4xl">{t("assistant.hero.title")}</h1>
        <p className="aime-apple-lead mx-auto mt-4 text-sm md:text-base">{t("aime.deep.hint")}</p>
        <button
          type="button"
          data-testid="assistant-open-panel"
          onClick={() => window.dispatchEvent(new CustomEvent("aime:open-ai", { detail: { item: "ask" } }))}
          className="mt-6 inline-flex min-h-11 items-center rounded-full bg-foreground px-6 text-sm font-semibold text-background transition hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t("aime.deep.open")}
        </button>
      </div>
    </main>
  );
}
