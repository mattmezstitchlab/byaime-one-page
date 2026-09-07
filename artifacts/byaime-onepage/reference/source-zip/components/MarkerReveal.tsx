import { useEffect, useMemo, useRef, useState } from "react";
import type { TimelineMarker } from "@/components/aime/HeroTimeline";

/** Respecte le réglage système « animations réduites ». */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return reduced;
}

/**
 * Les points de la ligne de temps apparaissent un à un, dans l'ordre du temps.
 * Rien n'est inventé ici : on ne fait que dévoiler progressivement ce que
 * `deriveTimeline` a déjà produit à partir du monde.
 */
export function useRevealedMarkers(markers: TimelineMarker[]) {
  const reduced = usePrefersReducedMotion();
  const sorted = useMemo(() => [...markers].sort((a, b) => a.time - b.time), [markers]);
  const [count, setCount] = useState(0);
  const total = sorted.length;
  const seen = useRef(0);

  useEffect(() => {
    if (total < seen.current) {
      seen.current = total;
      setCount(total);
      return;
    }
    seen.current = total;
    if (reduced) {
      setCount(total);
      return;
    }
    if (count >= total) return;
    const delay = count === 0 ? 180 : 45;
    const t = window.setTimeout(() => setCount((c) => Math.min(total, c + 1)), delay);
    return () => window.clearTimeout(t);
  }, [count, total, reduced]);

  return {
    revealed: sorted.slice(0, count),
    placed: Math.min(count, total),
    total,
    done: count >= total,
  };
}
