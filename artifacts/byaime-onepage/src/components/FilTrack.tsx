import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, FileText, Folder, ImageIcon, Users, Wallet } from "lucide-react";
import type { ProfileTimelineEvent } from "@/components/ProfileFeed";
import type { TimelineMarkerLayout } from "@/lib/timeline-layout";
import { cn } from "@/lib/utils";

export function EventIcon({ kind, className }: { kind?: string, className?: string }) {
  const classes = cn("w-5 h-5", className);
  switch (kind) {
    case "document":
    case "devis":
    case "facture":
      return <FileText className={classes} />;
    case "paiement":
      return <Wallet className={classes} />;
    case "evenement":
    case "jalon":
      return <Calendar className={classes} />;
    case "souvenir":
      return <ImageIcon className={classes} />;
    case "message":
    case "team":
    case "guest":
      return <Users className={classes} />;
    default:
      return <Folder className={classes} />;
  }
}

/** Une réponse RSVP, telle que le fil l'affiche. */
export type FilArrival = {
  id: string;
  guestId: string;
  guestName: string;
  status: string;
};

/*
 * Bandes verticales du fil, en px depuis le fil central.
 *
 * L'écart entre deux bandes dépasse la hauteur de ce qu'elles portent : deux
 * étiquettes ne peuvent donc pas se recouvrir, même quand le placement en
 * lignes les empile. Les réponses RSVP ne prennent aucune bande : ce ne sont
 * pas des Moments, elles vivent sur le fil lui-même.
 */
export const MOMENT_LANE_OFFSETS = [-88, 88, -184, 184] as const;

/** Libellé de confiance affiché dans l'infobulle du repère. */
const CONFIDENCE_LABELS: Record<string, string> = {
  confirme: "Confirmé",
  deduit: "Déduit par AIME",
  suggere: "Suggéré par AIME",
  a_confirmer: "À confirmer",
  manquant: "Information manquante",
};

/*
 * États qui appellent une action de votre part, et seuls ceux-là portent un
 * point sur le repère.
 *
 * `suggere` et `deduit` restent dans l'infobulle : sur un Monde créé d'une
 * seule phrase, la quasi-totalité des Moments est suggérée (49 sur 51, mesuré).
 * Un point sur chacun ne signalerait plus rien — un signal qui couvre tout
 * l'écran n'est pas un signal.
 */
const ACTIONABLE_CONFIDENCE = new Set(["a_confirmer", "manquant"]);

/**
 * Plage horaire d'un Moment, dérivée uniquement de ce qui est renseigné.
 *
 * `endTime` n'est jamais saisi dans les données actuelles : la fin est donc
 * calculée depuis `durationMinutes` quand elle existe. Sans durée, on n'affiche
 * qu'une heure — jamais une fin inventée.
 */
export function momentTimeLabel(event: {
  time: number;
  endTime?: number;
  durationMinutes?: number;
}): string {
  const start = format(event.time, "HH:mm", { locale: fr });
  const endMs = event.endTime ?? (event.durationMinutes
    ? event.time + event.durationMinutes * 60_000
    : undefined);
  if (endMs === undefined || endMs <= event.time) return start;
  return `${start} – ${format(endMs, "HH:mm", { locale: fr })}`;
}

/**
 * Le fil horizontal : les Moments et les réponses RSVP, placés par
 * `layoutTimeline`.
 *
 * Ce composant ne calcule aucune position : il applique le `markers` qu'on lui
 * donne. C'est ce qui rend le rendu vérifiable — `fil-track.test.tsx` monte ce
 * JSX réel et lit les abscisses et les bandes réellement émises.
 *
 * Densité volontairement minimale : rien n'est affiché à zéro. Un indicateur
 * n'apparaît que si la donnée qui le porte existe.
 */
export function FilTrack({
  events,
  arrivals,
  markers,
  conflicts,
  onOpenMoment,
  onOpenArrival,
}: {
  events: ProfileTimelineEvent[];
  arrivals: FilArrival[];
  markers: Map<string, TimelineMarkerLayout>;
  /** Messages de conflit par Moment. Absence = aucun indicateur affiché. */
  conflicts?: Map<string, string[]>;
  onOpenMoment: (event: ProfileTimelineEvent) => void;
  onOpenArrival: (arrival: FilArrival) => void;
}) {
  return (
    <>
      {events.map(event => {
        const marker = markers.get(event.id);
        if (!marker) return null;
        const yOffset = MOMENT_LANE_OFFSETS[marker.lane] ?? MOMENT_LANE_OFFSETS[0];
        const isTop = yOffset < 0;
        const eventConflicts = conflicts?.get(event.id) ?? [];
        const confidence = event.confidence && event.confidence !== "confirme"
          ? CONFIDENCE_LABELS[event.confidence] ?? event.confidence
          : undefined;
        return (
          <div key={event.id} data-testid={`fil-moment-${event.id}`} className="absolute top-1/2" style={{ left: `${marker.x}px` }}>
            <div
              className="absolute left-0 w-[1px] bg-foreground/15"
              style={{
                height: `${Math.abs(yOffset)}px`,
                top: isTop ? `${yOffset}px` : "0px",
              }}
            />
            <button
              type="button"
              onClick={() => onOpenMoment(event)}
              aria-label={`Ouvrir le Moment ${event.title}`}
              title={[
                event.title,
                momentTimeLabel(event),
                ...(eventConflicts.length ? [`⚠ ${eventConflicts.join(" · ")}`] : []),
                ...(confidence ? [confidence] : []),
              ].join(" · ")}
              className="absolute group flex flex-col items-center justify-center w-14 h-14 -translate-x-1/2 -translate-y-1/2"
              style={{ top: `${yOffset}px`, left: "0px" }}
            >
              <div className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full border bg-background shadow-xl transition-all group-hover:scale-110 group-hover:bg-foreground/10",
                eventConflicts.length ? "border-rose-300/50 group-hover:border-rose-300/70" : "border-foreground/15 group-hover:border-foreground/40",
              )}>
                <EventIcon kind={event.kind} className="text-foreground/60 group-hover:text-foreground" />
                {/* Confiance à traiter : un point discret, jamais une étiquette. */}
                {confidence && ACTIONABLE_CONFIDENCE.has(event.confidence ?? "") && (
                  <span
                    data-testid={`fil-confidence-${event.id}`}
                    className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-background bg-amber-300"
                  />
                )}
                {eventConflicts.length > 0 && (
                  <span
                    data-testid={`fil-conflict-${event.id}`}
                    className="absolute -left-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-background bg-rose-400"
                  />
                )}
              </div>
              {/*
                Quand aucune ligne n'a la place pour l'étiquette entière, elle
                reste dans le DOM mais invisible au repos : le survol du repère
                la révèle. Rien n'est jamais superposé.
              */}
              <div className={cn(
                "absolute flex flex-col items-center w-48 transition-opacity pointer-events-none",
                isTop ? "bottom-full mb-3" : "top-full mt-3",
                !marker.showLabel && "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
              )}>
                <span className="text-[10px] uppercase tracking-widest text-foreground/80 text-center truncate w-full group-hover:text-brand-accent">
                  {event.title}
                </span>
                <span className="mt-1 flex items-center gap-1.5 text-[9px] text-foreground/40">
                  {/* L'horaire passe avant la date : c'est la lecture immédiate
                      demandée, et il est dérivé de données réelles. */}
                  <span data-testid={`fil-hours-${event.id}`}>{momentTimeLabel(event)}</span>
                  <span aria-hidden>·</span>
                  <span>{format(event.time, "d MMM yyyy", { locale: fr })}</span>
                </span>
                {event.relations && event.relations.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {event.relations.map((rel, idx) => (
                      <div key={idx} className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-foreground/10" title={rel.kind}>
                        <EventIcon kind={rel.kind} className="w-2 h-2 text-foreground/40" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </button>
          </div>
        );
      })}

      {/*
        Réponses RSVP. Ce ne sont pas des Moments : ce sont des réponses
        arrivées à une date. Elles occupaient des cartes flottantes de 176 px de
        large qui retombaient sur les étiquettes des Moments. Elles deviennent
        un point sur le fil, détaillé au survol : le fil garde l'information
        sans plus rien superposer.
      */}
      {arrivals.map(arrival => {
        const marker = markers.get(arrival.id);
        if (!marker) return null;
        const status = arrival.status === "confirmed" ? "Arrivée confirmée" : "Réponse reçue";
        return (
          <div key={arrival.id} data-testid={`fil-rsvp-${arrival.guestId}`} className="absolute top-1/2" style={{ left: `${marker.x}px` }}>
            <button
              type="button"
              onClick={() => onOpenArrival(arrival)}
              aria-label={`Ouvrir l’arrivée de ${arrival.guestName}`}
              title={`${arrival.guestName} · ${status}`}
              className="group absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 p-2 focus-visible:outline-none"
            >
              <span className="relative grid h-3 w-3 place-items-center rounded-full bg-brand-accent shadow-[0_0_10px_hsl(var(--brand-accent)/0.55)] transition-transform group-hover:scale-125">
                <span className="absolute inset-0 animate-ping rounded-full bg-brand-accent/35 motion-reduce:animate-none" />
              </span>
              <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-max max-w-[176px] -translate-x-1/2 truncate rounded-full border border-brand-accent/25 bg-background/90 px-3 py-1.5 text-[9px] uppercase tracking-[.14em] text-foreground/80 opacity-0 shadow-xl backdrop-blur-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                {arrival.guestName} · {status}
              </span>
            </button>
          </div>
        );
      })}
    </>
  );
}
