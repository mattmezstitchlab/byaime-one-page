import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { useProject } from "@/store/project-store";
import { useI18n } from "@/lib/i18n";
import { useRouteMeta } from "@/lib/page-meta";
import { AssistantChat } from "@/components/AssistantChat";
import { DocumentShare } from "@/components/DocumentShare";
import { WeddingFolders } from "@/components/WeddingFolders";
import { DispooBanner } from "@/components/DispooBanner";
import { AimeOrb } from "@/components/AimeOrb";

/**
 * L'assistant AIME — le « JUMO du mariage » — dans la respiration de dispoo :
 * un message par écran (eyebrow, titre, une phrase), trois sections numérotées
 * (question, document, dossiers) et de l'air entre elles. Le chat répond à
 * partir du Monde ; le partage classe dans les dossiers universels ; les
 * dossiers ouvrent les bons panneaux.
 */
export function AssistantPage() {
  const { project } = useProject();
  const { t, locale } = useI18n();

  useRouteMeta({
    title: locale === "en" ? "AIME · Assistant" : "AIME · Assistant",
    description: t("assistant.hero.subtitle"),
  });

  const missingProvider = project?.providers.find(provider => provider.status === "recherche");
  const city = typeof project?.city.value === "string" ? project.city.value : "";

  return (
    <main data-testid="assistant-page" className="bg-background text-foreground">
      {/* ——— Hero : la promesse en une phrase ——— */}
      <section className="mx-auto max-w-3xl px-6 pb-12 pt-16 text-center md:pb-16 md:pt-24">
        <p className="flex justify-center"><AimeOrb size={64} /></p>
        <p className="aime-apple-eyebrow mt-6">{t("assistant.hero.eyebrow")}</p>
        <h1 className="aime-apple-title mt-5 text-4xl md:text-6xl">{t("assistant.hero.title")}</h1>
        <p className="aime-apple-lead mx-auto mt-5 max-w-2xl text-base md:text-lg">
          {t("assistant.hero.subtitle")}
        </p>
        {!project && (
          <div
            data-testid="assistant-empty"
            className="mx-auto mt-10 max-w-xl rounded-3xl border border-border bg-card p-6"
          >
            <p className="font-display text-lg font-semibold text-foreground">{t("assistant.empty.title")}</p>
            <p className="mt-2 text-sm font-light leading-relaxed text-foreground/60">
              {t("assistant.empty.subtitle")}
            </p>
            <Link
              href="/user-portal"
              data-testid="assistant-empty-cta"
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-background transition hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("assistant.empty.cta")}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        )}
      </section>

      {/* ——— 01 · Poser une question ——— */}
      <section data-testid="assistant-ask" className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <div className="text-center">
          <p className="aime-apple-eyebrow">{t("assistant.ask.eyebrow")}</p>
          <h2 className="aime-apple-title mt-4 text-3xl md:text-5xl">{t("assistant.ask.title")}</h2>
          <p className="aime-apple-lead mx-auto mt-4 max-w-xl text-base">{t("assistant.ask.subtitle")}</p>
        </div>
        <div className="mt-10">
          <AssistantChat />
        </div>
      </section>

      {/* ——— 02 · Partager un document ——— */}
      <section
        data-testid="assistant-doc"
        className="border-t border-border/60 bg-foreground/[0.015]"
      >
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
          <div className="text-center">
            <p className="aime-apple-eyebrow">{t("assistant.doc.eyebrow")}</p>
            <h2 className="aime-apple-title mt-4 text-3xl md:text-5xl">{t("assistant.doc.title")}</h2>
            <p className="aime-apple-lead mx-auto mt-4 max-w-xl text-base">{t("assistant.doc.subtitle")}</p>
          </div>
          <div className="mt-10">
            <DocumentShare />
          </div>
        </div>
      </section>

      {/* ——— 03 · Explorer vos dossiers ——— */}
      <section data-testid="assistant-folders" className="border-t border-border/60">
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="aime-apple-eyebrow">{t("assistant.folders.eyebrow")}</p>
            <h2 className="aime-apple-title mt-4 text-3xl md:text-5xl">{t("assistant.folders.title")}</h2>
            <p className="aime-apple-lead mx-auto mt-4 max-w-xl text-base">{t("assistant.folders.subtitle")}</p>
          </div>
          <div className="mt-10">
            <WeddingFolders compact />
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/dossiers"
              data-testid="assistant-folders-open"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-6 text-sm font-semibold text-foreground transition hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("assistant.folders.open")}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ——— Passerelle dispoo ——— */}
      <section className="border-t border-border/60">
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-20">
          <DispooBanner
            variant="providers"
            placement="assistant"
            query={missingProvider?.role}
            city={city || undefined}
          />
        </div>
      </section>
    </main>
  );
}
