import { WeddingCardParticipants } from "./WeddingCardParticipants";
import { useProject } from "@/store/project-store";
import { type ReactNode, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { AimePanel } from '@/components/AimePanel';
import { initAppearance } from '@/lib/appearance';
import { AimeOrb } from '@/components/AimeOrb';
import { useI18n } from '@/lib/i18n';

export function PrivateHomeLink({
  className,
  textClassName,
  labelClassName,
}: {
  className?: string;
  textClassName?: string;
  labelClassName?: string;
}) {
  const { t } = useI18n();
  return (
    <Link
      href="/"
      aria-label={t("private.home.aria")}
      data-testid="private-home-logo"
      className={cn("inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
    >
      <span className={cn("font-display font-light tracking-[0.3em] text-foreground", textClassName, labelClassName)}>
        AIME
      </span>
    </Link>
  );
}

/*
 * L'orbe unique, en bas au centre, sur mobile comme sur ordinateur : la
 * seule porte d'entrée de l'espace privé (17/09). Elle ouvre le Panneau AIME
 * — une colonne (Le Monde, les outils, l'aide) et une zone de contenu — qui
 * regroupe tout : les sept dossiers, la création, les réglages, l'aide. Le
 * logo AIME et les contrôles ME restent dans l'en-tête.
 */
export function OrbButton() {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("aime:open-ai"))}
      aria-label={t("private.orb.open")}
      title={t("private.orb.open")}
      data-testid="orb-button"
      className="fixed bottom-6 left-1/2 z-[65] grid h-16 w-16 -translate-x-1/2 place-items-center rounded-full transition-transform hover:scale-105 active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:bottom-8"
    >
      <AimeOrb size={64} label="+" />
    </button>
  );
}

export function PrivateLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { project } = useProject();

  useEffect(() => {
    initAppearance();
  }, []);

  return (
    <div data-testid="private-layout" className="flex h-[100dvh] w-full overflow-hidden bg-[var(--agency-paper)] text-[var(--agency-ink)]">
      {/* Desktop Logo - Fixed top left */}
      <div className="fixed left-6 top-6 z-[80] hidden md:block">
        <PrivateHomeLink className="rounded-lg" textClassName="text-xl" />
      </div>

      {/* Main Content Area */}
      <div className="relative flex h-full min-w-0 flex-1 flex-col">
        {/* En-tête mobile : juste le logo. Tout le reste vit dans le Panneau
            AIME (l'orbe) — « mon espace » y comprend Ma carte, les réglages,
            la création, l'ouverture. (17/09, phase 3.) */}
        <header className="z-[60] grid h-14 shrink-0 grid-cols-[auto_1fr] items-center gap-2 border-b border-[var(--agency-hairline)] bg-[var(--agency-paper)]/95 px-3 backdrop-blur-xl sm:px-4 md:border-none md:bg-transparent">
          <PrivateHomeLink className="md:hidden" textClassName="text-lg" />
          <div className="flex-1" />
        </header>

        {/* Scrollable Content */}
        <div className="relative flex-1 overflow-x-hidden overflow-y-auto pb-24">
          {location !== '/ma-carte' && <WeddingCardParticipants participants={project?.cardParticipants ?? []} />}
          {children}
        </div>

        {/* L'orbe unique : tout l'espace privé tient dans son panneau. */}
        {location !== '/ma-carte' && <OrbButton />}
        {/* Le Panneau AIME — la seule fenêtre de l'espace privé. */}
        <AimePanel />
      </div>
    </div>
  );
}
