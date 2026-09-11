import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "aime-appearance";

function readAppearance(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return window.localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
}

/**
 * Sombre ou clair, dès l'accueil : l'apparence est une question de confort de
 * lecture, pas une préférence réservée à l'espace privé.
 */
export function AppearanceToggle({ className }: { className?: string }) {
  const [appearance, setAppearance] = useState<"dark" | "light">(readAppearance);

  useEffect(() => {
    document.documentElement.dataset.aimeTheme = appearance;
    window.localStorage.setItem(STORAGE_KEY, appearance);
  }, [appearance]);

  return (
    <button
      type="button"
      data-testid="appearance-toggle"
      onClick={() => setAppearance(current => (current === "dark" ? "light" : "dark"))}
      aria-label={appearance === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
      title={appearance === "dark" ? "Mode clair" : "Mode sombre"}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-full text-foreground/65 transition hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {appearance === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
