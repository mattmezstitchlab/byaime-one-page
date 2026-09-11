import { ImmersiveBackdrop } from "@/components/ImmersiveBackdrop";
import { LandingComposer } from "@/components/LandingComposer";
import { useProject } from "@/store/project-store";
import { AIME_VISUALS } from "@/lib/assets";
import { useI18n } from "@/lib/i18n";

/**
 * L'onboarding dans l'espace privé : exactement le même parcours que l'accueil
 * (cinq questions, un seul composant), sur le même fond cosmique. Il remplace
 * l'ancienne zone de texte libre : il ne peut plus y avoir deux façons de
 * créer un Monde. Un lien permet toujours d'explorer un mariage de démonstration.
 */
export function PortalOnboarding() {
  const { createWeddingDemo } = useProject();
  const { t } = useI18n();

  return (
    <section
      data-testid="project-composer"
      className="aime-cinematic-surface relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 md:px-10"
    >
      <ImmersiveBackdrop image={AIME_VISUALS.hero.backgroundImage} />
      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center pb-24 pt-28 text-center md:pb-28">
        <p className="aime-landing-copy text-[10px] uppercase tracking-[.35em] text-white/55">
          {t("private.onboarding.eyebrow")}
        </p>
        <h1 className="aime-landing-copy mt-6 font-display text-3xl font-semibold leading-[1.05] tracking-tight text-white md:text-5xl">
          {t("private.onboarding.title")}
        </h1>
        <p className="aime-landing-copy mt-5 max-w-xl text-sm font-light leading-relaxed text-white/70 md:text-base">
          {t("private.onboarding.subtitle")}
        </p>
        <div className="mt-10 w-full">
          <LandingComposer signedIn />
        </div>
        <button
          data-testid="demo-project"
          type="button"
          onClick={createWeddingDemo}
          className="aime-landing-copy mt-6 text-[11px] uppercase tracking-[.18em] text-white/50 underline decoration-white/25 underline-offset-8 transition-colors hover:text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          {t("private.onboarding.demo")}
        </button>
      </div>
    </section>
  );
}
