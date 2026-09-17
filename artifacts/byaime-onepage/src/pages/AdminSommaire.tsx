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
  const { t, locale } = useI18n();

  useRouteMeta({
    title: locale === "en" ? "AIME · Back-office" : "AIME · Rétroplanning",
    description: locale === "en" ? "The whole wedding, in order — inside the AIME panel." : "Tout le mariage, remis dans l'ordre — dans le panneau AIME.",
  });

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("aime:open-ai", { detail: { section: "monde" } }));
  }, []);

  return (
    <main data-testid="admin-page" className="grid min-h-[70vh] place-items-center bg-[var(--agency-paper)] px-6 text-[var(--agency-ink)]">
      <div className="max-w-md text-center">
        <p className="text-[11px] uppercase tracking-[0.38em] text-[var(--agency-eyebrow)]">Back-office</p>
        <h1 className="agency-serif mt-6 text-4xl leading-tight sm:text-5xl">Le rétroplanning</h1>
        <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-[var(--agency-body)]">
          Tout le mariage, remis dans l&rsquo;ordre — chaque ligne ouvre la bonne vue du Monde.
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
