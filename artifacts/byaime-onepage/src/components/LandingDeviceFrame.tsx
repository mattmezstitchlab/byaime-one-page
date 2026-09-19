import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Les appareils de l'accueil, dessinés une seule fois.
 *
 * La visite guidée montre le produit filmé ; la visite du produit le montre
 * reconstitué en CSS. Les deux doivent sortir du même moule — même coque
 * d'encre, même rayon, même ombre longue — sinon l'accueil a deux languages
 * visuels côte à côte. D'où ce module partagé par `LandingJourney` et
 * `LandingTour`, au lieu d'un second copié-collé des classes.
 *
 * `screen` n'a pas d'îlot ni de caméra : sous ce format-là, l'image est une
 * vidéo réelle, et un point noir posé dessus serait un faux détail.
 */
export type LandingDevice = "phone" | "pad" | "screen";

type Shell = {
  /** La largeur que prend l'appareil dans sa colonne. */
  figure: string;
  /** La coque : encre, épaisseur du bord, ombre portée. */
  bezel: string;
  /** L'écran lui-même : rayon et fond (le noir d'une vidéo, le papier d'une capture). */
  screen: string;
  /** Le ratio et la réserve du haut de l'écran, là où l'îlot ou la caméra mordent. */
  glass: string;
  /** L'îlot dynamique, ou la caméra frontale. */
  dot?: string;
};

const SHELLS: Record<LandingDevice, Shell> = {
  phone: {
    figure: "w-[250px] sm:w-[280px]",
    bezel: "rounded-[3rem] p-[9px] shadow-[0_40px_90px_-45px_rgba(23,20,16,0.55)]",
    screen: "rounded-[2.5rem] bg-[var(--agency-paper)]",
    glass: "aspect-[9/19] pt-9",
    dot: "absolute left-1/2 top-2 z-10 h-[18px] w-20 -translate-x-1/2 rounded-full bg-[var(--agency-ink)]",
  },
  pad: {
    figure: "w-full max-w-[460px]",
    bezel: "rounded-[2rem] p-[11px] shadow-[0_50px_110px_-50px_rgba(23,20,16,0.5)]",
    screen: "rounded-[1.4rem] bg-[var(--agency-paper)]",
    glass: "aspect-[4/3] pt-5",
    dot: "absolute left-1/2 top-2 z-10 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[var(--agency-ink)]/30",
  },
  screen: {
    figure: "w-full",
    bezel: "rounded-[1.75rem] p-[11px] shadow-[0_50px_110px_-50px_rgba(23,20,16,0.5)]",
    screen: "rounded-[1.3rem] bg-black",
    glass: "aspect-[16/10]",
  },
};

export function LandingDeviceFrame({
  device,
  label,
  testId,
  className,
  children,
}: {
  device: LandingDevice;
  /** Ce que l'appareil montre, lu par les lecteurs d'écran. */
  label: string;
  testId?: string;
  className?: string;
  children: ReactNode;
}) {
  const shell = SHELLS[device];
  return (
    <figure data-testid={testId ?? `landing-device-${device}`} aria-label={label} className={cn(shell.figure, className)}>
      <div className={cn("border border-[var(--agency-ink)]/15 bg-[var(--agency-ink)]", shell.bezel)}>
        <div className={cn("relative overflow-hidden", shell.screen)}>
          {shell.dot && <div aria-hidden className={shell.dot} />}
          {/* `relative` : une capture posée dans l'appareil s'y aligne, d'où le
              calage en `absolute inset-0` du lecteur. */}
          <div className={cn("relative", shell.glass)}>{children}</div>
        </div>
      </div>
    </figure>
  );
}

/** La vitre d'un appareil, hors cadre : la même échancrure pour les vignettes. */
export function LandingDeviceThumb({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "block overflow-hidden rounded-[14px] border border-[var(--agency-ink)]/20 bg-[var(--agency-ink)] p-[3px]",
        className,
      )}
    >
      <span className="relative block h-full w-full overflow-hidden rounded-[11px] bg-black/5">{children}</span>
    </span>
  );
}
