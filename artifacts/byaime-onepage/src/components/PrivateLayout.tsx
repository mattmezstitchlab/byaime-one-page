import { type ReactNode, useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { CommandBar } from '@/components/CommandBar';
import { GlobalCreateCenter } from '@/components/GlobalCreateCenter';
import { PortalControls } from '@/components/PortalControls';
import {
  getPrivateDestinationId,
} from '@/lib/private-navigation';
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
      href="/monde"
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
 * L'orbe unique, en bas au centre, sur mobile comme sur ordinateur : un seul
 * bouton d'action pour tout l'espace privé. Il ouvre le panneau unifié
 * (CommandBar) — compositeur, dossiers, fichier, création, ME, Monde et
 * réglages — ce qui a permis de retirer la barre latérale gauche et le tiroir
 * mobile. Le logo AIME et les contrôles ME restent dans l'en-tête.
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
  const [openMeSignal, setOpenMeSignal] = useState(0);

  const activeDestination = getPrivateDestinationId(location);

  useEffect(() => {
    initAppearance();
  }, []);

  const openMe = () => setOpenMeSignal(signal => signal + 1);

  return (
    <div data-testid="private-layout" className="flex h-[100dvh] w-full overflow-hidden bg-[var(--agency-paper)] text-[var(--agency-ink)]">
      {/* Desktop Logo - Fixed top left */}
      <div className="fixed left-6 top-6 z-[80] hidden md:block">
        <PrivateHomeLink className="rounded-lg" textClassName="text-xl" />
      </div>

      {/* Main Content Area */}
      <div className="relative flex h-full min-w-0 flex-1 flex-col">
        {/* Header - Mobile only visual, completely empty on desktop */}
        <header className="z-[60] grid h-14 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-[var(--agency-hairline)] bg-[var(--agency-paper)]/95 px-3 backdrop-blur-xl sm:px-4 md:border-none md:bg-transparent">
          <PrivateHomeLink className="md:hidden" textClassName="text-lg" />

          <div className="flex-1" />

          <div className="flex items-center justify-end gap-1.5">
            <PortalControls embedded openMeSignal={openMeSignal} />
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="relative flex-1 overflow-x-hidden overflow-y-auto pb-24">
          {children}
        </div>

        {/* L'orbe unique : tout l'espace privé tient dans son panneau. */}
        <OrbButton />
        <CommandBar context={activeDestination} onOpenMe={openMe} />
        <GlobalCreateCenter destination={activeDestination} />
      </div>
    </div>
  );
}
