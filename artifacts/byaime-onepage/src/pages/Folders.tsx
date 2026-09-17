import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { useRouteMeta } from "@/lib/page-meta";

/*
 * /dossiers — deep-link vers la section « Le Monde » du Panneau AIME
 * (phase 2, 17/09). Les sept dossiers vivent dans la colonne du panneau,
 * les mêmes que partout ; la route reste pour les liens existants : elle
 * ouvre le panneau sur la section Monde.
 */
export function FoldersPage() {
  const { t, locale } = useI18n();

  useRouteMeta({
    title: locale === "en" ? "AIME · Folders" : "AIME · Dossiers",
    description: t("dossier.hero.subtitle"),
  });

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("aime:open-ai", { detail: { section: "monde" } }));
  }, []);

  return (
    <main data-testid="folders-page" className="grid min-h-[70vh] place-items-center bg-background px-6 text-foreground">
      <div className="max-w-md text-center">
        <p className="aime-apple-eyebrow">{t("dossier.hero.eyebrow")}</p>
        <h1 className="aime-apple-title mt-4 text-3xl md:text-4xl">{t("dossier.hero.title")}</h1>
        <p className="aime-apple-lead mx-auto mt-4 text-sm md:text-base">{t("aime.deep.hint")}</p>
        <button
          type="button"
          data-testid="folders-open-panel"
          onClick={() => window.dispatchEvent(new CustomEvent("aime:open-ai", { detail: { section: "monde" } }))}
          className="mt-6 inline-flex min-h-11 items-center rounded-full bg-foreground px-6 text-sm font-semibold text-background transition hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t("aime.deep.open")}
        </button>
      </div>
    </main>
  );
}
