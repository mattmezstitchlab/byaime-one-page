import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildTimelineIndex, ENTITY_KIND_LABELS } from "@/lib/timeline-graph";
import { PANEL_FOR_KIND, type WeddingPanelId } from "@/lib/wedding-navigation";
import { focusWorld } from "@/lib/laboratory";
import { useProject } from "@/store/project-store";

export function WorldSearch({ onClose, onOpenPanel }: { onClose: () => void; onOpenPanel: (panel: WeddingPanelId) => void }) {
  const { project } = useProject();
  const [query, setQuery] = useState("");
  const index = useMemo(() => (project ? buildTimelineIndex(project) : null), [project]);
  const q = query.trim().toLocaleLowerCase("fr");

  const entityResults = useMemo(() => {
    if (!index || !q) return [];
    return [...index.entities.values()]
      .filter(entity => entity.label.toLocaleLowerCase("fr").includes(q))
      .slice(0, 40);
  }, [index, q]);

  const eventResults = useMemo(() => {
    if (!index || !q) return [];
    return [...index.events.values()]
      .filter(event => `${event.title} ${event.detail ?? ""}`.toLocaleLowerCase("fr").includes(q))
      .sort((a, b) => a.time - b.time)
      .slice(0, 15);
  }, [index, q]);

  if (!project) return <p className="py-16 text-center text-sm text-foreground/40">Aucun Monde actif.</p>;

  const hasResults = entityResults.length > 0 || eventResults.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-full border border-foreground/15 bg-foreground/5 px-4 py-3 focus-within:border-foreground/40">
        <Search className="h-4 w-4 shrink-0 text-foreground/40" />
        <input
          autoFocus
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Rechercher un invité, un prestataire, un document, un Moment…"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-foreground/30"
          aria-label="Rechercher dans ce Monde"
        />
      </div>

      {!q && (
        <p className="text-sm font-light leading-relaxed text-foreground/50">
          La recherche traverse tout le Monde : personnes, prestataires, tâches, documents, musique, messages et
          Moments. Chaque résultat s'ouvre dans son panneau.
        </p>
      )}

      {q && !hasResults && (
        <p className="py-10 text-center text-sm text-foreground/40">Aucun résultat pour « {query.trim()} ».</p>
      )}

      {eventResults.length > 0 && (
        <section>
          <p className="mb-2 text-[10px] uppercase tracking-[.2em] text-foreground/40">Moments</p>
          <div className="space-y-1.5">
            {eventResults.map(event => (
              <button
                key={event.id}
                type="button"
                onClick={() => { onClose(); focusWorld({ route: "/user-portal", momentId: event.id }); }}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-foreground/10 bg-foreground/[.035] px-4 py-3 text-left transition hover:border-foreground/30 hover:bg-foreground/[.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm">{event.title}</span>
                  <span className="mt-0.5 block truncate text-[10px] uppercase tracking-wider text-foreground/40">
                    {event.phase === "avant" ? "Avant" : event.phase === "pendant" ? "Jour J" : "Après"}
                    {event.location ? ` · ${event.location}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-foreground/40">Moment</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {entityResults.length > 0 && (
        <section>
          <p className="mb-2 text-[10px] uppercase tracking-[.2em] text-foreground/40">Éléments</p>
          <div className="space-y-1.5">
            {entityResults.map(entity => {
              const panel = PANEL_FOR_KIND[entity.kind];
              return (
                <button
                  key={`${entity.kind}:${entity.id}`}
                  type="button"
                  onClick={() => { onClose(); if (panel) onOpenPanel(panel); }}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-foreground/10 bg-foreground/[.035] px-4 py-3 text-left transition hover:border-foreground/30 hover:bg-foreground/[.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="min-w-0 truncate text-sm">{entity.label}</span>
                  <span className={cn("shrink-0 text-[10px] uppercase tracking-wider", panel ? "text-foreground/45" : "text-foreground/30")}>
                    {ENTITY_KIND_LABELS[entity.kind]}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
