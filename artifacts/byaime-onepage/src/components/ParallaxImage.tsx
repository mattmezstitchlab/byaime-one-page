import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

/**
 * Visuel de section qui glisse légèrement plus lentement que le contenu :
 * il garde sa taille de couverture (scale d'amorce) et se translate sur la
 * traversée de la section, pour une seconde profondeur sans effet de gimmick.
 */
export function ParallaxImage({
  src,
  alt,
  className = "",
  distance = 12,
}: {
  src: string;
  alt: string;
  className?: string;
  /** Amplitude du glissement vertical, en pourcentage de l'image. */
  distance?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [`-${distance}%`, `${distance}%`]);

  return (
    <div ref={ref} aria-hidden className={`overflow-hidden ${className}`}>
      <motion.img
        src={src}
        alt={alt}
        loading="lazy"
        style={reduceMotion ? undefined : { y, scale: 1.18 }}
        className="h-full w-full object-cover object-center will-change-transform"
      />
    </div>
  );
}
