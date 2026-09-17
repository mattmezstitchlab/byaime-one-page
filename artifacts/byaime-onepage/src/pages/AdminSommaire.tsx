import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { useRouteMeta } from "@/lib/page-meta";

/*
 * /admin — le « rétroplanning » remis en page blanche. Phase 2 (17/09) : la
 * liste plate des entrées du Monde, c'est exactement la colonne du Panneau
 * AIME ; la route reste un lien profond (liens existants) qui ouvre le
 * panneau, sans plus de duplication.
 */
export function AdminSommairePage() {
  const { t } = useI18n();

  useRouteMeta({
    title: t("admin.page.metaTitle"),
    description: t("admin.page.metaDesc"),
  });

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("aime:open-ai", { detail: { section: "monde" } }));
  }, []);

  return (
    <main data-testid="admin-page" className="grid min-h-[70vh] place-items-center bg-[var(--agency-paper)] px-6 text-[var(--agency-ink)]">
      <div className="max-w-md text-center">
        <p className="text-[11px] uppercase tracking-[0.38em] text-[var(--agency-eyebrow)]">{t("admin.page.eyebrow")}</p>
        <h1 className="agency-serif mt-6 text-4xl leading-tight sm:text-5xl">{t("admin.page.title")}</h1>
        <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-[var(--agency-body)]">
          {t("admin.page.lead")}
        </p>
        <button
          type="button"
          data-testid="admin-open-panel"
          onClick={() => window.dispatchEvent(new CustomEvent("aime:open-ai", { detail: { section: "monde" } }))}
          className="mt-8 inline-flex min-h-11 items-center rounded-full bg-[var(--agency-ink)] px-6 text-sm font-semibold text-[var(--agency-paper)] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]"
        >
          {t("aime.deep.open")}
        </button>
      </div>
    </main>
  );
}
