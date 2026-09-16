import { PortalBackdrop } from "@/components/PortalBackdrop";
import { LandingComposer } from "@/components/LandingComposer";
import { useProject } from "@/store/project-store";
import { useI18n } from "@/lib/i18n";
import { EYEBROW, TITLE, LEAD, PILL_SMALL_GHOST } from "@/lib/site-design";
import { cn } from "@/lib/utils";

/**
 * L'onboarding dans l'espace privé — le portail Couple / Wedding est conservé,
 * mais il reprend désormais le dessin de l'écran démo (design/index.html)
 * pour tenir la route avec tous les panneaux.
 *
 * - Fenêtre produit avec barre à pastilles (rouge/jaune/vert) comme sur l'écran démo,
 * - Eyebrow + grand titre + amorce en jetons agency (EYEBROW, TITLE, LEAD),
 * - Le même compositeur sombre que l'accueil (LandingComposer) : porte « Importer ma carte » puis les cinq questions,
 * - Tous les panneaux ensuite parlent le même langage (CenteredBlock + BottomDock).
 */
export function PortalOnboarding() {
  const { createWeddingDemo } = useProject();
  const { t } = useI18n();

  return (
    <section
      data-testid="project-composer"
      className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[#fcfbfa] px-4 py-10 md:px-10 md:py-16"
    >
      <PortalBackdrop />

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col">
        {/* Fenêtre démo — même objet que BottomDock et CenteredBlock */}
        <div className="overflow-hidden rounded-[22px] border border-[var(--agency-hairline)] bg-[var(--agency-paper)] shadow-[0_32px_80px_-16px_rgba(23,20,16,0.24),0_0_0_1px_rgba(23,20,16,0.04)_inset]">
          {/* Barre fenêtre */}
          <div className="flex h-[46px] items-center gap-2.5 border-b border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-5">
            <span className="flex items-center gap-1.5">
              <span className="h-[11px] w-[11px] rounded-full bg-[#ff5f57]" />
              <span className="h-[11px] w-[11px] rounded-full bg-[#febc2e]" />
              <span className="h-[11px] w-[11px] rounded-full bg-[#28c840]" />
            </span>
            <span className="ml-3 text-[12px] font-medium tracking-[.02em] text-[var(--agency-eyebrow)]">AIME — Nouveau Monde</span>
          </div>

          <div className="px-6 py-8 sm:px-10 sm:py-10">
            <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
              <p className={cn(EYEBROW, "text-center")}>{t("private.onboarding.eyebrow")}</p>
              <h1 className={cn(TITLE, "mt-4 text-center text-3xl leading-[1.05] md:text-5xl")}>{t("private.onboarding.title")}</h1>
              <p className={cn(LEAD, "mt-5 max-w-xl text-center text-sm md:text-base")}>{t("private.onboarding.subtitle")}</p>
            </div>

            {/* La porte d'entrée vit dans LandingComposer — import de carte d'abord, cinq questions ensuite */}
            <div className="mt-10 w-full">
              <LandingComposer signedIn />
            </div>

            <div className="mt-8 flex flex-col items-center gap-3">
              <button
                data-testid="demo-project"
                type="button"
                onClick={createWeddingDemo}
                className={cn(PILL_SMALL_GHOST, "text-[11px]")}
              >
                {t("private.onboarding.demo")}
              </button>
              <p className="text-center text-[11px] leading-relaxed text-[var(--agency-eyebrow)]">
                Un seul parcours, le même que l’accueil : vous vous présentez, puis BYAIME ne
                demande plus que ce qui vous concerne.
              </p>
            </div>
          </div>
        </div>

        {/* Note sous la fenêtre — comme le caption de la fenêtre produit sur design/index.html */}
        <p className="mt-4 text-center text-[12px] text-[var(--agency-eyebrow)]">
          Aperçu du Monde Mariage — ce que vos invités, votre budget et vos prestataires voient, dans le même écran.
        </p>
      </div>
    </section>
  );
}
