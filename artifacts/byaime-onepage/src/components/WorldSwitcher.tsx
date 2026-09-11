import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type SwitchableWorld = {
  id: string;
  title: string;
  role?: string;
};

/**
 * Écran unique de changement de Monde : une liste sobre, une ligne par Monde accessible,
 * le Monde actif signalé par un point. Partagée par le menu du hero du Monde et par
 * l'onglet « Mes Mondes » de ME pour qu'il n'existe qu'un seul écran de bascule.
 */
export function WorldSwitcher({
  projects,
  activeProjectId,
  onSelect,
  testId = "world-switcher",
}: {
  projects: SwitchableWorld[];
  activeProjectId?: string;
  onSelect: (projectId: string) => void;
  testId?: string;
}) {
  if (projects.length === 0) {
    return (
      <p
        data-testid={testId}
        className="rounded-2xl border border-border bg-card px-5 py-4 text-sm text-foreground/55"
      >
        Aucun Monde pour le moment. Votre compte reste accessible.
      </p>
    );
  }
  return (
    <div data-testid={testId} className="divide-y divide-border">
      {projects.map((item) => {
        const active = item.id === activeProjectId;
        return (
          <button
            key={item.id}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => onSelect(item.id)}
            className="group flex w-full items-center gap-4 rounded-lg px-2 py-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full border",
                active ? "border-foreground bg-foreground" : "border-foreground/25",
              )}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-xl font-light text-foreground/90">
                {item.title}
              </span>
              <span className="mt-1 block text-[9px] uppercase tracking-[.18em] text-foreground/50">
                {active ? "Mariage · Monde actif" : item.role}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-foreground/20 transition group-hover:translate-x-1 group-hover:text-foreground/60" />
          </button>
        );
      })}
    </div>
  );
}
