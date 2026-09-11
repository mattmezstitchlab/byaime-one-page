import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { getAssetUrl } from "@/lib/assets";

/**
 * Fond immersif cosmique : un plan fixe plein écran. Le contenu défile par-
 * dessus tandis que le visuel reste ancré au viewport. Deux mouvements très
 * lents se composent pour la profondeur : une dérive CSS continue sur l'image
 * (désactivée par prefers-reduced-motion) et une parallaxe de défilement sur
 * le wrapper (zoom + translation), omise en mouvement réduit. Seuls des
 * liserés dégradés assurent la lisibilité en haut et en bas.
 */
export function ImmersiveBackdrop({ image }: { image: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  // Premier écran défilé : le cosmos recule doucement (scale 1.04 → 1.10, y 0 → 8 %).
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  const imageY = useTransform(scrollY, [0, viewportHeight], ["0%", "8%"]);
  const imageScale = useTransform(scrollY, [0, viewportHeight * 3], [1.04, 1.1]);

  return (
    <div ref={ref} aria-hidden className="fixed inset-0 z-0 overflow-hidden bg-black">
      <motion.div
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
