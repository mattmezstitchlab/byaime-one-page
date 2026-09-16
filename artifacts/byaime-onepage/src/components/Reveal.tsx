import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/*
 * Révélation douce au défilement, coupée si le mouvement est réduit.
 *
 * Sortie de `Landing.tsx` parce que plusieurs écrans publics reprenaient la même
 * mise en scène : une seule implémentation, et le rendu serveur affiche
 * directement le contenu (ni `IntersectionObserver`, ni `window` côté serveur).
 */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(() => {
    if (typeof IntersectionObserver === "undefined") return true;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return true;
    return false;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || shown || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.14, rootMargin: "0px 0px -6% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shown]);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-[opacity,transform] duration-700 ease-out will-change-[opacity,transform] motion-reduce:transition-none",
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
