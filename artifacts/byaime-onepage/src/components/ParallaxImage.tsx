import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

/**
 * Visuel de section qui glisse légèrement plus lentement que le contenu.
 * L'image est amorcée à l'échelle 1.25 (12,5 % de marge de chaque côté), ce
 * qui couvre toujours la translation (≤ 12 % par défaut) : aucune bande noire
 * ne peut se découvrir, y compris à la première peinture avant que
 * framer-motion n'applique son style. Le glissement est omis en mouvement
 * réduit.
 */
export function ParallaxImage({
  src,
  alt,
  className = "",
  distance = 8,
}: {
  src: string;
  alt: string;
  className?: string;
  /** Amplitude du glissement vertical, en pourcentage de l'image (≤ 12). */
  distance?: number;
}) {
  const safeDistance = Math.min(distance, 12);
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [`-${safeDistance}%`, `${safeDistance}%`]);

  return (
    <div ref={ref} aria-hidden className={`overflow-hidden ${className}`}>
      <motion.img
        src={src}
        alt={alt}
        loading="lazy"
        initial={false}
        style={reduceMotion ? undefined : { y }}
        className="aime-parallax-image h-full w-full scale-[1.3] object-cover object-center will-change-transform"
      />
    </div>
  );
}
