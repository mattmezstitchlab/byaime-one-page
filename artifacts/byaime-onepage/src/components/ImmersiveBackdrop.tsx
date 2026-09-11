import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { getAssetUrl } from "@/lib/assets";

/**
 * Fond immersif cosmique : un plan fixe plein écran. Le contenu défile par-
 * dessus tandis que le visuel reste ancré au viewport. Deux mouvements très
 * lents se composent pour la profondeur : une dérive CSS continue sur l'image
 * (désactivée par prefers-reduced-motion) et une parallaxe de défilement sur
 * le wrapper (zoom + translation), omise en mouvement réduit. Les marges
 * laissées par les zooms couvrent toujours la translation (sinon une bande
 * noire apparaîtrait), et une classe d'échelle garantit la couverture dès la
 * première peinture, avant que framer-motion n'applique son style.
 */
export function ImmersiveBackdrop({ image }: { image: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  // Premier écran défilé : le cosmos recule doucement. Échelle 1.12 → 6 % de
  // marge de chaque côté, donc la translation est plafonnée à 5 %.
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  const imageY = useTransform(scrollY, [0, viewportHeight], ["0%", "5%"]);
  const imageScale = useTransform(scrollY, [0, viewportHeight * 3], [1.12, 1.18]);

  return (
    <div ref={ref} aria-hidden className="fixed inset-0 z-0 overflow-hidden bg-black">
      {/* Pas de classe d'échelle ici : framer-motion pilote déjà `transform:
          scale(...)` en ligne, et la propriété CSS `scale` de Tailwind s'y
          composerait (zoom cumulé). L'image interne derive déjà à ≥ 1,06. */}
      <motion.div
        initial={false}
        style={reduceMotion ? undefined : { y: imageY, scale: imageScale }}
        className="absolute inset-0 will-change-transform"
      >
        <img
          src={getAssetUrl(image)}
          alt=""
          className="aime-hero-drift h-full w-full object-cover object-center"
        />
      </motion.div>
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,.42)_0%,rgba(0,0,0,.08)_20%,transparent_38%,transparent_66%,rgba(0,0,0,.55)_100%)]" />
    </div>
  );
}
