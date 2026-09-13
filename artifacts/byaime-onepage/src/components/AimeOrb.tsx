import { cn } from "@/lib/utils";

/*
 * L'orbe AIME : un cercle plein bordé d'un anneau arc-en-ciel, la signature
 * visuelle de l'agent où qu'il apparaisse (panneau AI, assistant, Jour J).
 * Pur CSS : un dégradé conique sous un disque plein, sans image ni canvas.
 */
export function AimeOrb({
  size = 44,
  className,
  label = "AI",
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={cn("relative inline-block shrink-0 rounded-full", className)}
    >
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 200deg, #f472b6, #c084fc, #60a5fa, #34d399, #fbbf24, #fb7185, #f472b6)",
          boxShadow: "0 0 18px rgba(192, 132, 252, .35)",
        }}
      />
      <span
        className="absolute flex items-center justify-center rounded-full bg-card font-display font-semibold text-foreground"
        style={{ inset: 3, fontSize: Math.max(10, Math.round(size * 0.28)) }}
      >
        {label}
      </span>
    </span>
  );
}
