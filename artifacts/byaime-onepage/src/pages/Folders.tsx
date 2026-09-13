import { Link } from "wouter";
import { ArrowLeft, MessageCircleQuestion } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useRouteMeta } from "@/lib/page-meta";
import { WeddingFolders } from "@/components/WeddingFolders";
import { DispooBanner } from "@/components/DispooBanner";

/**
 * Les dossiers du mariage — le miroir du BURO : sept dossiers, les mêmes pour
 * chaque mariage et chaque rôle, chacun ouvert sur le bon panneau du Monde.
 * Même respiration que l'assistant : hero en une phrase, grille aérée, deux
 * sorties (Monde, assistant).
 */
export function FoldersPage() {
  const { t, locale } = useI18n();

  useRouteMeta({
    title: locale === "en" ? "AIME · Folders" : "AIME · Dossiers",
    description: t("dossier.hero.subtitle"),
  });

  return (
    <main data-testid="folders-page" className="bg-background text-foreground">
      <section className="mx-auto max-w-3xl px-6 pb-12 pt-16 text-center md:pb-16 md:pt-24">
        <p className="aime-apple-eyebrow">{t("dossier.hero.eyebrow")}</p>
        <h1 className="aime-apple-title mt-5 text-4xl md:text-6xl">{t("dossier.hero.title")}</h1>
        <p className="aime-apple-lead mx-auto mt-5 max-w-2xl text-base md:text-lg">
          {t("dossier.hero.subtitle")}
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-8">
        <WeddingFolders />
      </section>

      <section className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/user-portal"
            data-testid="folders-back-world"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-background transition hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            {t("dossier.back.world")}
          </Link>
          <Link
            href="/assistant"
            data-testid="folders-back-assistant"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-6 text-sm font-semibold text-foreground transition hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MessageCircleQuestion aria-hidden className="h-4 w-4" />
            {t("dossier.back.assistant")}
          </Link>
        </div>
      </section>

      <section className="border-t border-border/60">
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-20">
          <DispooBanner variant="composer" placement="folders" />
        </div>
      </section>
    </main>
  );
}
