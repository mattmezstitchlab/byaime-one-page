import { useMemo } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarClock, ListChecks, Wallet, Users, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/money";
import { layoutTimeline } from "@/lib/timeline-layout";
import { FRISE_LANES, type Frise } from "@/lib/frise";

/*
 * La frise « Tout voir » : une abscisse — le temps — et un couloir par nature de
 * chose. Elle résume le Monde entier sans ouvrir six panneaux.
 *
 * Deux garde-fous hérités de la dérivation (`lib/frise.ts`) :
 *  - aucun repère sans date réelle — le non-daté est dans la gouttière du bas ;
 *  - les agrégats (budget, comptes, J-x) restent dans le bandeau fixe du haut,
 *    jamais sur l'axe : un total n'est pas un événement.
 *
 * Le placement vient de `layoutTimeline`, le moteur du Fil : échelle élastique
 * (le Jour J concentre quinze Moments en quelques heures) et répartition en
 * lignes, donc deux repères ne se superposent jamais.
 */

const LANE_TONE: Record<string, string> = {
  moments: "bg-foreground",
  invites: "bg-brand-accent",
  taches: "bg-foreground/55",
  documents: "bg-foreground/40",
  argent: "bg-success",
};

export function ProfileFrise({
  frise,
  pivot,
  currency,
  onOpenEntity,
  onOpenPanel,
}: {
  frise: Frise;
  pivot?: number;
  currency?: string;
  onOpenEntity: (collection: string, sourceRef: unknown, label: string) => void;
  onOpenPanel: (panel: string) => void;
}) {
  /* Le Jour J entre dans le calcul comme un repère fantôme : il reçoit une
     abscisse cohérente avec l'échelle élastique, puis il est retiré du rendu
     des marqueurs pour ne servir que de ligne de repère. */
  const layout = useMemo(() => {
    const groups = Object.fromEntries(FRISE_LANES.map(lane => [lane.id, { lanes: 2 }]));
    return layoutTimeline(
      [
        ...frise.items.map(item => ({ id: item.id, time: item.time, group: item.lane, width: 150 })),
        ...(pivot !== undefined && Number.isFinite(pivot)
          ? [{ id: "__pivot", time: pivot, group: "pivot", width: 1 }]
          : []),
      ],
      { groups: { ...groups, pivot: { lanes: 1, width: 1 } }, minGap: 34, markerWidth: 26, width: 150, start: 260, end: 2400 },
    );
  }, [frise.items, pivot]);

  const xById = useMemo(() => new Map(layout.markers.map(marker => [marker.id, marker])), [layout.markers]);
  const pivotX = xById.get("__pivot")?.x;
  const trackEnd = Math.ceil(layout.trackEnd);

  const { daysLeft, openTasks, engagedCents, paidCents, confirmedGuests, waitingGuests } = frise.stats;

  return (
    <div data-testid="profile-frise" className="w-full">
      {/* Bandeau fixe : les agrégats, hors de l'axe. */}
      <div data-testid="profile-frise-stats" className="mx-auto flex max-w-4xl flex-wrap items-center gap-2 px-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/5 px-3.5 py-1.5 text-[11px] text-foreground/70">
          <CalendarClock className="h-3.5 w-3.5" />
          {daysLeft === undefined ? "Date à poser" : daysLeft > 0 ? `J-${daysLeft}` : daysLeft === 0 ? "C'est aujourd'hui" : "Jour J passé"}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/5 px-3.5 py-1.5 text-[11px] text-foreground/70">
          <ListChecks className="h-3.5 w-3.5" />
          {openTasks} tâche{openTasks > 1 ? "s" : ""} en cours
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/5 px-3.5 py-1.5 text-[11px] tabular-nums text-foreground/70">
          <Wallet className="h-3.5 w-3.5" />
          {formatCents(paidCents, currency)} payés / {formatCents(engagedCents, currency)}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/5 px-3.5 py-1.5 text-[11px] text-foreground/70">
          <Users className="h-3.5 w-3.5" />
          {confirmedGuests} confirmé{confirmedGuests > 1 ? "s" : ""} · {waitingGuests} en attente
        </span>
      </div>

      {/* La frise : défilement horizontal, un couloir par nature de chose. */}
      <div data-testid="profile-frise-scroll" className="mt-4 overflow-x-auto hide-scrollbar">
        <div className="relative" style={{ width: `${trackEnd + 260}px` }}>
          {pivotX !== undefined && (
            <div
              data-testid="profile-frise-pivot"
              className="absolute inset-y-0 z-0 w-px bg-brand-accent/45"
              style={{ left: `${pivotX}px` }}
            >
              <span className="absolute -top-1 left-2 whitespace-nowrap text-[9px] uppercase tracking-[.2em] text-brand-accent">
                Jour J
              </span>
            </div>
          )}

          {FRISE_LANES.map(lane => {
            const laneItems = frise.items.filter(item => item.lane === lane.id);
            return (
              <div
                key={lane.id}
                data-testid={`profile-frise-lane-${lane.id}`}
                className="relative h-[86px] border-t border-foreground/8"
              >
                <span className="sticky left-0 z-10 inline-block bg-background/90 pr-3 pt-1.5 pl-4 text-[9px] uppercase tracking-[.2em] text-foreground/40">
                  {lane.label}
                  <span className="ml-2 tabular-nums text-foreground/25">{laneItems.length}</span>
                </span>

                {laneItems.map(item => {
                  const marker = xById.get(item.id);
                  if (!marker) return null;
                  const clickable = Boolean(item.collection && item.sourceRef);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-testid="profile-frise-marker"
                      disabled={!clickable}
                      title={format(item.time, "d MMM yyyy", { locale: fr })}
                      onClick={() => clickable && onOpenEntity(item.collection!, item.sourceRef, item.label)}
                      className={cn(
                        "absolute flex -translate-x-1/2 flex-col items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent",
                        clickable ? "cursor-pointer" : "cursor-default",
                      )}
                      style={{ left: `${marker.x}px`, top: `${26 + marker.lane * 26}px` }}
                    >
                      <span className={cn("h-2.5 w-2.5 rounded-full", LANE_TONE[item.lane], item.state === "du" && "ring-2 ring-success/40")} />
                      {marker.showLabel && (
                        <span className="max-w-[140px] truncate text-[10px] leading-tight text-foreground/60">
                          {item.label}
                        </span>
                      )}
                    </button>
                  );
                })}

                {laneItems.length === 0 && (
                  <span className="absolute left-4 top-9 text-[10px] font-light text-foreground/25">
                    Rien de daté ici pour l'instant.
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Gouttière : ce qui n'a pas de date réelle. Jamais inventée. */}
      {frise.undated.length > 0 && (
        <div data-testid="profile-frise-undated" className="mx-auto mt-5 max-w-4xl px-4 pb-6">
          <p className="flex items-center gap-2 text-[9px] uppercase tracking-[.2em] text-foreground/35">
            <Inbox className="h-3.5 w-3.5" />
            Non daté — hors de l'axe
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {frise.undated.map(entry => (
              <button
                key={entry.id}
                type="button"
                data-testid="profile-frise-undated-entry"
                onClick={() => onOpenPanel(entry.panel)}
                className="rounded-full border border-foreground/10 px-3.5 py-1.5 text-[11px] text-foreground/60 transition hover:border-foreground/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
              >
                {entry.label}
                <span className="ml-1.5 tabular-nums text-foreground/35">{entry.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
